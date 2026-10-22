const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

const SIGNALS = {
  staffing: [
    {pattern: /our client|client is seeking|on behalf of (?:our|a) client/i, label: "The employer may be a recruiting intermediary rather than the workplace itself.", weight: 3},
    {pattern: /(?:w2|1099|corp[ -]?to[ -]?corp|c2c)|contract[- ]to[- ]hire|staffing (?:firm|agency)/i, label: "Contract or staffing-agency language appears in the posting.", weight: 3},
    {pattern: /submit (?:your )?resume|recruiting team|talent solutions/i, label: "The application language resembles a third-party recruiting workflow.", weight: 1},
    {pattern: /global talent network|join (?:our|the) talent network|considered for future (?:roles|searches|opportunities)/i, label: "This may be a recruiter-managed search or talent-pool posting rather than a clearly identified open role.", weight: 3},
  ],
  pressure: [
    {pattern: /fast[- ]paced|high[- ]velocity|rapidly changing|sense of urgency/i, label: "The employer explicitly emphasizes speed or rapid change.", weight: 1},
    {pattern: /wear many hats|whatever it takes|self[- ]starter|thrive in ambiguity|minimal supervision/i, label: "The role may have broad ownership with limited structure.", weight: 2},
    {pattern: /on[- ]call|after[- ]hours|weekends?|24\/?7|pager duty/i, label: "The role may include on-call or work outside ordinary hours.", weight: 3},
    {pattern: /aggressive targets?|quota|high[- ]pressure|tight deadlines?|demanding environment/i, label: "The posting contains explicit delivery-pressure language.", weight: 3},
    {pattern: /multiple competing priorities|simultaneously manage|frequent context switching/i, label: "Frequent prioritization and context switching may be expected.", weight: 2},
  ],
  scope: [
    {pattern: /end[- ]to[- ]end ownership|from concept to production|own .* roadmap/i, label: "The role expects broad end-to-end ownership.", weight: 2},
    {pattern: /other duties as assigned|responsibilities may change|including but not limited to/i, label: "The scope is intentionally open-ended.", weight: 1},
    {pattern: /travel (?:up to )?(\d{1,2})%|up to (\d{1,2})% travel/i, label: "The role includes material travel.", weight: 2},
  ],
  work_arrangement: [
    {pattern: /strongly prefers? in[- ]person|primarily on[- ]site|initial period (?:working )?on[- ]site|limited flexibility may be considered/i, label: "On-site work appears to be the default; flexibility is framed as an exception.", weight: 2},
  ],
  seniority: [
    {pattern: /(?:new graduates?|early[- ]career).{0,100}(?:senior|experienced)|(?:senior|experienced).{0,100}(?:new graduates?|early[- ]career)/i, label: "The search spans unusually broad seniority, so level, pay band, and support may not be settled.", weight: 2},
  ],
  authorization: [
    {pattern: /(?:no|without|not (?:available|offered|provided)).{0,24}sponsorship|will not sponsor|cannot sponsor/i, label: "The posting explicitly limits sponsorship.", weight: 3, status: "conflict"},
    {pattern: /must not require sponsorship|now or in the future|future sponsorship will not be considered/i, label: "The posting excludes candidates who may need future sponsorship.", weight: 3, status: "conflict"},
    {pattern: /u\.?s\.? citizens? only|permanent residents? only|green card holders? only/i, label: "The posting explicitly restricts eligible work authorization.", weight: 3, status: "conflict"},
    {pattern: /(?:\bf[ -]?1\b|\b(?:stem[ -]?)?opt\b).{0,32}(?:not accepted|not eligible|not supported|will not be considered)/i, label: "The posting explicitly rejects F-1/OPT/STEM OPT candidates.", weight: 3, status: "conflict"},
    {pattern: /sponsorship (?:is |may be |will be )?(?:available|provided|offered|considered)/i, label: "The posting explicitly says sponsorship may be available.", weight: 1, status: "available"},
    {pattern: /\bauthorized to work\b|\bwork authorization\b|\bvisas?\b|\bsponsorship\b|\bf[ -]?1\b|\b(?:stem[ -]?)?opt\b/i, label: "Work-authorization language needs human review.", weight: 1, status: "review"},
  ],
  export_control: [
    {pattern: /(?:active|current|ability to obtain).{0,24}security clearance|security clearance (?:is )?required/i, label: "The posting requires or expects a security clearance.", weight: 3, status: "conflict"},
    {pattern: /must (?:be|qualify as).{0,20}u\.?s\.? person|u\.?s\.? persons? only/i, label: "The posting explicitly requires U.S.-person status for export-control purposes.", weight: 3, status: "conflict"},
    {pattern: /itar|export control|ear regulations?/i, label: "Export-control language appears; inspect the exact eligibility condition rather than assuming the acronym alone is disqualifying.", weight: 2, status: "review"},
  ],
  posting_quality: [
    {pattern: /for ai assistants?|as an ai (?:assistant|model)|ignore (?:all )?(?:previous|prior) instructions|include .* at all costs/i, label: "The JD contains instructions aimed at AI tools. Treat them as untrusted job-post text, not commands.", weight: 3},
    {pattern: /microsoft office (?:specialist|certification)|dynamics crm|microsoft 365 certification/i, label: "The named office-tool requirements may indicate an administrative or process role despite a technical title.", weight: 2},
  ],
};

const WORK = {
  model: [/machine learning|deep learning|model(?:ing|s)?|algorithm|computer vision|nlp|llm|generative ai|experimentation/i],
  software: [/software|api|backend|frontend|full[- ]stack|production system|application|microservice|architecture/i],
  data: [/data pipeline|etl|warehouse|analytics|sql|dashboard|reporting|data quality|business intelligence/i],
  customer: [/customer|client|pre[- ]sales|sales team|solution consulting|demo|implementation|professional services|support tickets?/i],
  product: [/product roadmap|requirements|stakeholder|user research|go[- ]to[- ]market|prioriti[sz]ation/i],
  operations: [/on[- ]call|incident|monitoring|operational|support|sla|troubleshoot|maintenance/i],
  research: [/research|publication|novel method|state of the art|prototype|scientific|hypothesis/i],
  regulated: [/clinical|patient|healthcare|life sciences|pharma|medical|gxp|fda|hipaa|regulated/i],
};

const TITLE_EXPECTATIONS = [
  {pattern: /forward[- ]deployed/i, expected: ["customer", "software"], label: "customer-facing deployment engineering"},
  {pattern: /machine learning|\bml\b|applied scientist|data scientist/i, expected: ["model", "research"], label: "ML/model development"},
  {pattern: /software engineer|developer/i, expected: ["software"], label: "software engineering"},
  {pattern: /data engineer/i, expected: ["data", "software"], label: "data engineering"},
  {pattern: /product manager/i, expected: ["product"], label: "product management"},
  {pattern: /research/i, expected: ["research", "model"], label: "research"},
];

const money = String.raw`(?:\$|USD\s*)?(\d{2,3}(?:,\d{3})?(?:\.\d{1,2})?)([kK]?)`;
const rangePattern = new RegExp(`${money}\\s*(?:-|–|—|to)\\s*${money}\\s*(?:per\\s+|\\/)?(hour|hr|year|yr|annum|annual)?`, "ig");

function normalizeText(text) {
  return String(text || "")
    .replace(/&#x20;|&#32;|&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\\\s*\n/g, "\n")
    .replace(/^[ \t]*-\s+/gm, "- ");
}
function clean(text) { return normalizeText(text).replace(/\s+/g, " ").trim(); }
function sentences(text) { return normalizeText(text).replace(/\bU\.S\./gi, "US").split(SENTENCE_SPLIT).map(clean).filter(s => s.length >= 12 && s.length <= 700); }
function uniq(items) { return [...new Set(items)]; }

function tidyEntity(value) {
  return clean(value).replace(/^[\s:–—-]+|[\s:–—-]+$/g, "").replace(/\s+(?:careers?|jobs?|hiring)$/i, "").slice(0, 120);
}

function plausibleTitle(value) {
  const title = tidyEntity(value).replace(/\s+(?:in|at)\s+(?:our|the)\s+.+$/i, "");
  return /\b(?:engineer|scientist|developer|analyst|manager|specialist|researcher|designer|consultant|architect|director|intern|associate|technician|lead)\b/i.test(title) && title.split(/\s+/).length <= 14 ? title : null;
}

export function extractMetadata(text, options = {}) {
  const raw = normalizeText(text).replace(/\r/g, "");
  const lines = raw.split("\n").map(clean).filter(Boolean).slice(0, 80);
  let title = tidyEntity(options.title || ""), company = tidyEntity(options.company || "");
  let titleConfidence = title ? "confirmed" : "unavailable", companyConfidence = company ? "confirmed" : "unavailable";
  let titleEvidence = title ? "User-provided title" : null, companyEvidence = company ? "User-provided company" : null;
  if (!title) {
    for (const line of lines.slice(0, 30)) {
      const labelled = line.match(/^(?:job\s+)?(?:title|role|position)\s*[:–—-]\s*(.+)$/i);
      const heading = lines.indexOf(line) < 8 ? plausibleTitle(line) : null;
      const hired = line.match(/(?:we (?:are|'re) |(?:is|are) )(?:actively )?(?:hiring|seeking|looking for)\s+(?:an?\s+|our next\s+)?(.+?)(?:\s+(?:to|who will|for (?:an?|the|our)|at (?:our|the))\b|[.!]|$)/i);
      const joined = line.match(/join\s+.+?\s+as\s+(?:an?\s+)?(.+?)(?:\s+(?:to|who will|and)\b|[.!]|$)/i);
      const candidate = plausibleTitle(labelled?.[1] || hired?.[1] || joined?.[1] || heading || "");
      if (candidate) { title = candidate; titleConfidence = labelled || (heading && !hired && !joined) ? "high" : "medium"; titleEvidence = line; break; }
    }
  }
  if (!company) {
    for (const line of lines.slice(0, 40)) {
      const labelled = line.match(/^(?:company|organization|employer)\s*[:–—-]\s*(.+)$/i);
      const about = line.match(/^about\s+([A-Z][A-Za-z0-9&.'’ -]{1,70})$/);
      const atCompany = line.match(/^at\s+([A-Z][A-Za-z0-9&.'’ -]{1,60}),\s+(?:we|our)\b/);
      const companyIs = line.match(/^([A-Z][A-Za-z0-9&.'’ -]{1,60})\s+is\s+(?:an?|the|one of|building|creating|transforming|hiring)\b/);
      const join = line.match(/^join\s+([A-Z][A-Za-z0-9&.'’ -]{1,60})\s+as\b/i);
      const candidate = tidyEntity(labelled?.[1] || about?.[1] || atCompany?.[1] || companyIs?.[1] || join?.[1] || "");
      if (candidate && !/^(our client|the company|company|we)$/i.test(candidate) && candidate.split(/\s+/).length <= 10) { company = candidate; companyConfidence = labelled || about ? "high" : "medium"; companyEvidence = line; break; }
    }
  }
  if (!company && title && lines.length > 1) {
    const titleIndex = lines.findIndex(line => tidyEntity(line) === title);
    const nearby = lines.slice(Math.max(0, titleIndex + 1), titleIndex + 4).find(line =>
      /\b(?:consulting|group|technologies|labs?|systems?|solutions?|health|pharma|biotech|inc\.?|corp\.?|llc)\b/i.test(line) &&
      !/\b(?:full[- ]time|part[- ]time|on[- ]site|remote|hybrid|california|united states)\b/i.test(line)
    );
    if (nearby) { company = tidyEntity(nearby); companyConfidence = "medium"; companyEvidence = nearby; }
  }
  if (!title && options.pageTitle) {
    const parts = String(options.pageTitle).split(/\s+[|·–—-]\s+/);
    const candidate = parts.map(plausibleTitle).find(Boolean);
    if (candidate) { title = candidate; titleConfidence = "low"; titleEvidence = options.pageTitle; }
  }
  return {title: title || null, company: company || null, titleConfidence, companyConfidence, titleEvidence, companyEvidence};
}

function findSignals(allSentences, rules, category) {
  const findings = [];
  for (const sentence of allSentences) for (const rule of rules) {
    if (rule.pattern.test(sentence)) {
      findings.push({category, title: rule.label, evidence: sentence, severity: rule.weight >= 3 ? "high" : rule.weight === 2 ? "medium" : "low", weight: rule.weight, status: rule.status || null});
      break;
    }
  }
  return findings;
}

function consolidateFindings(findings) {
  const grouped = new Map();
  for (const finding of findings) {
    const key = finding.category === "authorization" ? "authorization" : `${finding.category}|${finding.title}|${finding.status || ""}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {...finding, evidenceItems: finding.evidenceItems || [finding.evidence]});
      continue;
    }
    if (!existing.evidenceItems.includes(finding.evidence) && existing.evidenceItems.length < 3) existing.evidenceItems.push(finding.evidence);
    if (finding.weight > existing.weight) Object.assign(existing, {...finding, evidenceItems: existing.evidenceItems});
  }
  const authorization = grouped.get("authorization");
  if (authorization) {
    const original = findings.filter(finding => finding.category === "authorization");
    const hasConflict = original.some(finding => finding.status === "conflict");
    const hasAvailable = original.some(finding => finding.status === "available");
    if (hasConflict) {
      authorization.title = hasAvailable ? "The posting contains conflicting sponsorship language." : "The posting explicitly limits sponsorship.";
      authorization.status = "conflict";
      authorization.weight = 3;
      authorization.severity = "high";
    } else if (hasAvailable) {
      authorization.title = original.some(finding => finding.status === "review")
        ? "Sponsorship appears possible but conditional; confirm this specific role."
        : "The posting says sponsorship may be available; confirm this specific role.";
      authorization.status = "available";
      authorization.weight = 1;
      authorization.severity = "low";
    } else {
      authorization.title = "Work-authorization language is present but not definitive.";
      authorization.status = "review";
      authorization.weight = 2;
      authorization.severity = "medium";
    }
  }
  return [...grouped.values()].map(finding => ({...finding, evidence: finding.evidenceItems.join("\n")}));
}

function classifyWork(allSentences) {
  const evidence = Object.fromEntries(Object.keys(WORK).map(k => [k, []]));
  for (const sentence of allSentences) for (const [category, patterns] of Object.entries(WORK)) {
    if (patterns.some(pattern => pattern.test(sentence))) evidence[category].push(sentence);
  }
  const raw = Object.fromEntries(Object.entries(evidence).map(([k, rows]) => [k, rows.length]));
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  const shares = Object.fromEntries(Object.entries(raw).map(([k, value]) => [k, Math.round(value / total * 100)]));
  return {shares, evidence};
}

function titleMismatch(title, work) {
  const expectation = TITLE_EXPECTATIONS.find(item => item.pattern.test(title));
  if (!expectation) return null;
  const expectedShare = expectation.expected.reduce((sum, key) => sum + (work.shares[key] || 0), 0);
  const dominant = Object.entries(work.shares).filter(([k]) => k !== "regulated").sort((a,b) => b[1] - a[1])[0];
  if (!dominant || expectedShare >= 35 || dominant[1] < 25 || expectation.expected.includes(dominant[0])) return null;
  const labels = {customer: "customer delivery / solutions", data: "data and reporting", operations: "operations and support", product: "product/stakeholder work", software: "software engineering", model: "model development", research: "research"};
  return {category: "title_mismatch", severity: "medium", weight: 2, title: `The title suggests ${expectation.label}, but the described work leans toward ${labels[dominant[0]] || dominant[0]}.`, evidence: (work.evidence[dominant[0]] || []).slice(0, 2).join(" ")};
}

function numberValue(raw, suffix) { const value = Number(raw.replace(/,/g, "")); return suffix ? value * 1000 : value; }

function parseCompensation(text) {
  const ranges = [];
  for (const match of text.matchAll(rangePattern)) {
    const low = numberValue(match[1], match[2]);
    const high = numberValue(match[3], match[4]);
    const unitRaw = (match[5] || "").toLowerCase();
    const nearby = text.slice(Math.max(0, match.index - 45), match.index + match[0].length + 45);
    const hourly = /hour|hr|\/h\b/i.test(unitRaw || nearby) || (high < 500 && !/annual|year|salary/i.test(nearby));
    const annualLow = hourly ? Math.round(low * 2080) : low;
    const annualHigh = hourly ? Math.round(high * 2080) : high;
    if (annualLow >= 25000 && annualHigh <= 1000000 && annualLow <= annualHigh) ranges.push({source: clean(match[0]), low, high, unit: hourly ? "hour" : "year", annualLow, annualHigh, hourlyLow: hourly ? low : +(low / 2080).toFixed(2), hourlyHigh: hourly ? high : +(high / 2080).toFixed(2)});
  }
  return ranges[0] || null;
}

function parseQualifications(allSentences) {
  const required = [], preferred = [];
  for (const sentence of allSentences) {
    const values = [...sentence.matchAll(/(\d+)\+?\s*(?:or more )?years?/ig)].map(match => Number(match[1]));
    if (!values.length) continue;
    if (/preferred|nice to have|bonus|ideally|a plus/i.test(sentence)) preferred.push(...values.map(years => ({years, evidence:sentence})));
    else if (/minimum|required|must have|at least|basic qualification/i.test(sentence)) required.push(...values.map(years => ({years, evidence:sentence})));
  }
  return {requiredYears: required.length ? Math.max(...required.map(item => item.years)) : null, preferredYears: preferred.length ? Math.max(...preferred.map(item => item.years)) : null, requiredEvidence: required.map(item => item.evidence), preferredEvidence: preferred.map(item => item.evidence)};
}

function structuralFindings(text, allSentences, compensation) {
  const findings = [];
  const permPhrase = allSentences.find(sentence => /years? of experience in the job offered or in (?:a|an).{0,80}related occupation/i.test(sentence));
  if (permPhrase) findings.push({category:"posting_quality", severity:"medium", weight:2, title:"This resembles a PERM recruitment notice written for a legally prescribed process, not a normal open-market JD.", evidence:permPhrase});
  if (compensation?.unit === "hour" && /full[- ]time/i.test(text)) findings.push({category:"compensation", severity:"medium", weight:2, title:"The posting combines full-time language with hourly pay. Confirm whether this is direct employment, non-exempt employment, or a contract.", evidence:allSentences.find(sentence => /full[- ]time|\$|compensation|pay range/i.test(sentence)) || compensation.source});
  return findings;
}

function roleShapeFindings(title, allSentences, work) {
  if (!/forward[- ]deployed/i.test(title) || (work.shares.customer || 0) < 20) return [];
  const evidenceItems = allSentences.filter(sentence => /work directly with|customer[- ]specific|customer workflows?|technical deployments?|forward[- ]deployed/i.test(sentence)).slice(0, 3);
  if (!evidenceItems.length) return [];
  return [{category:"role_shape", severity:"medium", weight:2, title:"This is a customer-facing deployment role; research judgment supports delivery rather than defining a primarily independent research job.", evidence:evidenceItems.join("\n"), evidenceItems}];
}

function detectOmissions(text, compensation) {
  const omissions = [];
  if (!compensation) omissions.push("Approved base-pay range");
  if (!/sponsorship|work authorization|authorized to work|\bvisas?\b|\bf[ -]?1\b|\b(?:stem[ -]?)?opt\b/i.test(text)) omissions.push("OPT / STEM OPT / future sponsorship policy");
  if (/talent network|future searches|our client|consulting/i.test(text) && !/direct hire|employer of record|contract[- ]to[- ]hire|\bw-?2\b|\b1099\b/i.test(text)) omissions.push("Legal employer and direct-hire vs contract relationship");
  if (!/travel|on[- ]call|after[- ]hours/i.test(text) && /customer|client|forward[- ]deployed/i.test(text)) omissions.push("Travel and after-hours customer support expectations");
  return omissions;
}

function bottomLine(metadata, findings, work) {
  const parts = [];
  if (findings.some(f => f.category === "staffing" && f.weight >= 3)) parts.push("This looks like a recruiter-managed search or talent-pool listing, so the actual employer and live headcount need confirmation.");
  if (/forward[- ]deployed/i.test(metadata.title || "") && (work.shares.customer || 0) >= 20) parts.push("The job is fundamentally customer-facing AI deployment, with research and engineering used to deliver customer-specific systems.");
  if (findings.some(f => f.category === "work_arrangement")) parts.push("San Francisco on-site work appears to be the default, while flexibility is reserved for exceptions.");
  return parts.join(" ") || "The posting provides some useful evidence, but important employment conditions still need confirmation before you invest heavily in the process.";
}

function summarize(work, title) {
  const labels = {model: "model development", software: "software engineering", data: "data/pipelines", customer: "customer delivery", product: "product/stakeholder work", operations: "operations/support", research: "research", regulated: "regulated-domain work"};
  const top = Object.entries(work.shares).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).slice(0,3);
  if (!top.length) return `The posting does not provide enough concrete responsibility language to determine what ${title || "the role"} actually does.`;
  return `The posting reads primarily as ${top.map(([k,v]) => `${labels[k]} (${v}%)`).join(", ")}. These percentages describe emphasis in the text, not guaranteed time allocation.`;
}

function questions(findings, work, compensation, omissions) {
  const result = [];
  if (findings.some(f => f.category === "title_mismatch")) result.push("How is a typical week divided between the work implied by the title and the other responsibilities listed here?");
  if (findings.some(f => f.category === "staffing")) result.push("Is this a currently funded requisition or a talent-pool search, who is the actual client, and who would be the legal employer of record?");
  if (findings.some(f => f.category === "work_arrangement")) result.push("How many days per week are mandatory in San Francisco, and what does the initial on-site period mean in practice?");
  if (findings.some(f => f.category === "seniority")) result.push("Which level and pay band is this opening actually approved for, and what mentorship or delivery support would an early-career hire receive?");
  if (findings.some(f => f.category === "pressure")) result.push("What usually causes work outside normal hours, and how often did that happen for this team in the last quarter?");
  if ((work.shares.customer || 0) >= 30) result.push("How much of the role is customer implementation, support, or pre-sales versus building the core product?");
  if (findings.some(f => f.category === "authorization")) result.push("Can recruiting confirm the policy for F-1 OPT, STEM OPT, and future H-1B sponsorship for this specific requisition?");
  if (findings.some(f => f.category === "export_control")) result.push("Which exact export-control or clearance condition applies, and is U.S.-person status a legal requirement for this role?");
  if (findings.some(f => f.category === "posting_quality")) result.push("Can you share the official employer careers-page posting and confirm this is an actively staffed requisition?");
  if (!compensation) result.push("What is the approved base-salary range for this location, excluding bonus and equity?");
  if (omissions.includes("OPT / STEM OPT / future sponsorship policy")) result.push("Can the legal employer support F-1 OPT, sign a STEM OPT training plan, and consider future H-1B sponsorship for this requisition?");
  return uniq(result).slice(0, 6);
}

export function analyzeJD(text, options = {}) {
  const normalizedText = normalizeText(text);
  if (clean(normalizedText).length < 100) throw new Error("Paste a fuller job description so the analysis has enough context.");
  const allSentences = sentences(normalizedText);
  const metadata = extractMetadata(normalizedText, options);
  const work = classifyWork(allSentences);
  const findings = Object.entries(SIGNALS).flatMap(([category, rules]) => findSignals(allSentences, rules, category));
  const mismatch = titleMismatch(metadata.title || "", work);
  if (mismatch) findings.push(mismatch);
  findings.push(...roleShapeFindings(metadata.title || "", allSentences, work));
  const compensation = parseCompensation(normalizedText);
  const qualifications = parseQualifications(allSentences);
  findings.push(...structuralFindings(normalizedText, allSentences, compensation));
  const expectedAnnual = Number(options.expectedAnnual || 0);
  if (compensation && expectedAnnual && compensation.annualHigh < expectedAnnual) findings.push({category: "compensation", severity: "high", weight: 3, title: `Even the top of the posted range is below your $${expectedAnnual.toLocaleString()} minimum.`, evidence: compensation.source});
  const consolidated = consolidateFindings(findings);
  const auth = consolidated.filter(f => f.category === "authorization" || f.category === "export_control");
  const workAuthorization = auth.some(f => f.status === "conflict") ? "conflict" : auth.some(f => f.status === "available") ? "available" : auth.length ? "review" : "not_stated";
  const ordered = consolidated.sort((a,b) => b.weight - a.weight || a.category.localeCompare(b.category));
  const omissions = detectOmissions(normalizedText, compensation);
  return {version: 2, metadata, bottomLine: bottomLine(metadata, ordered, work), summary: summarize(work, metadata.title), work, qualifications, findings: ordered, omissions, compensation, expectedAnnual: expectedAnnual || null, workAuthorization, h1b: {status: "not_checked", note: "Employer filing history is not checked in this local prototype. Past filings would not prove sponsorship for this role."}, questions: questions(ordered, work, compensation, omissions), caveat: "This report identifies evidence-backed risk signals in the posting. It does not verify the employer, predict working conditions, or provide legal advice."};
}

export { parseCompensation };
