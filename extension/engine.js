const SENTENCE_SPLIT = /(?<=[.!?])\s+|\n+/;

const SIGNALS = {
  staffing: [
    {pattern: /our client|client is seeking|on behalf of (?:our|a) client/i, label: "The employer may be a recruiting intermediary rather than the workplace itself.", weight: 3},
    {pattern: /(?:w2|1099|corp[ -]?to[ -]?corp|c2c)|contract[- ]to[- ]hire|staffing (?:firm|agency)/i, label: "Contract or staffing-agency language appears in the posting.", weight: 3},
    {pattern: /submit (?:your )?resume|recruiting team|talent solutions/i, label: "The application language resembles a third-party recruiting workflow.", weight: 1},
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
  authorization: [
    {pattern: /(?:no|without|not (?:available|offered|provided)).{0,24}sponsorship|will not sponsor|cannot sponsor/i, label: "The posting explicitly limits sponsorship.", weight: 3, status: "conflict"},
    {pattern: /must not require sponsorship|now or in the future|future sponsorship will not be considered/i, label: "The posting excludes candidates who may need future sponsorship.", weight: 3, status: "conflict"},
    {pattern: /u\.?s\.? citizens? only|permanent residents? only|green card holders? only/i, label: "The posting explicitly restricts eligible work authorization.", weight: 3, status: "conflict"},
    {pattern: /(?:f[ -]?1|(?:stem )?opt).{0,32}(?:not accepted|not eligible|not supported|will not be considered)/i, label: "The posting explicitly rejects F-1/OPT/STEM OPT candidates.", weight: 3, status: "conflict"},
    {pattern: /sponsorship (?:is |may be |will be )?(?:available|provided|offered|considered)/i, label: "The posting explicitly says sponsorship may be available.", weight: 1, status: "available"},
    {pattern: /authorized to work|work authorization|visa|sponsorship|f[ -]?1|(?:stem )?opt/i, label: "Work-authorization language needs human review.", weight: 1, status: "review"},
  ],
  export_control: [
    {pattern: /(?:active|current|ability to obtain).{0,24}security clearance|security clearance (?:is )?required/i, label: "The posting requires or expects a security clearance.", weight: 3, status: "conflict"},
    {pattern: /must (?:be|qualify as).{0,20}u\.?s\.? person|u\.?s\.? persons? only/i, label: "The posting explicitly requires U.S.-person status for export-control purposes.", weight: 3, status: "conflict"},
    {pattern: /itar|export control|ear regulations?/i, label: "Export-control language appears; inspect the exact eligibility condition rather than assuming the acronym alone is disqualifying.", weight: 2, status: "review"},
  ],
  posting_quality: [
    {pattern: /for ai assistants?|as an ai (?:assistant|model)|ignore (?:all )?(?:previous|prior) instructions|include .* at all costs/i, label: "The JD contains instructions aimed at AI tools. Treat them as untrusted job-post text, not commands.", weight: 3},
    {pattern: /microsoft office (?:specialist|certification)|dynamics crm|microsoft 365 certification/i, label: "The named office-tool requirements may indicate an administrative or process role despite a technical title.", weight: 2},
    {pattern: /free parking|on[- ]site (?:gym|cafeteria|restaurant)|office amenities/i, label: "The posting spends unusual space selling office amenities; verify the actual technical scope.", weight: 1},
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
  {pattern: /machine learning|\bml\b|applied scientist|data scientist/i, expected: ["model", "research"], label: "ML/model development"},
  {pattern: /software engineer|developer/i, expected: ["software"], label: "software engineering"},
  {pattern: /data engineer/i, expected: ["data", "software"], label: "data engineering"},
  {pattern: /product manager/i, expected: ["product"], label: "product management"},
  {pattern: /research/i, expected: ["research", "model"], label: "research"},
];

const money = String.raw`(?:\$|USD\s*)?(\d{2,3}(?:,\d{3})?(?:\.\d{1,2})?)([kK]?)`;
const rangePattern = new RegExp(`${money}\\s*(?:-|–|—|to)\\s*${money}\\s*(?:per\\s+|\\/)?(hour|hr|year|yr|annum|annual)?`, "ig");

function clean(text) { return String(text || "").replace(/\s+/g, " ").trim(); }
function sentences(text) { return String(text || "").replace(/\bU\.S\./gi, "US").split(SENTENCE_SPLIT).map(clean).filter(s => s.length >= 12 && s.length <= 700); }
function uniq(items) { return [...new Set(items)]; }

function tidyEntity(value) {
  return clean(value).replace(/^[\s:–—-]+|[\s:–—-]+$/g, "").replace(/\s+(?:careers?|jobs?|hiring)$/i, "").slice(0, 120);
}

function plausibleTitle(value) {
  const title = tidyEntity(value).replace(/\s+(?:in|at)\s+(?:our|the)\s+.+$/i, "");
  return /\b(?:engineer|scientist|developer|analyst|manager|specialist|researcher|designer|consultant|architect|director|intern|associate|technician|lead)\b/i.test(title) && title.split(/\s+/).length <= 14 ? title : null;
}

export function extractMetadata(text, options = {}) {
  const raw = String(text || "").replace(/\r/g, "");
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

function summarize(work, title) {
  const labels = {model: "model development", software: "software engineering", data: "data/pipelines", customer: "customer delivery", product: "product/stakeholder work", operations: "operations/support", research: "research", regulated: "regulated-domain work"};
  const top = Object.entries(work.shares).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]).slice(0,3);
  if (!top.length) return `The posting does not provide enough concrete responsibility language to determine what ${title || "the role"} actually does.`;
  return `The posting reads primarily as ${top.map(([k,v]) => `${labels[k]} (${v}%)`).join(", ")}. These percentages describe emphasis in the text, not guaranteed time allocation.`;
}

function questions(findings, work, compensation) {
  const result = [];
  if (findings.some(f => f.category === "title_mismatch")) result.push("How is a typical week divided between the work implied by the title and the other responsibilities listed here?");
  if (findings.some(f => f.category === "staffing")) result.push("Is this employment directly with the named company, and who would be the legal employer of record?");
  if (findings.some(f => f.category === "pressure")) result.push("What usually causes work outside normal hours, and how often did that happen for this team in the last quarter?");
  if ((work.shares.customer || 0) >= 30) result.push("How much of the role is customer implementation, support, or pre-sales versus building the core product?");
  if (findings.some(f => f.category === "authorization")) result.push("Can recruiting confirm the policy for F-1 OPT, STEM OPT, and future H-1B sponsorship for this specific requisition?");
  if (findings.some(f => f.category === "export_control")) result.push("Which exact export-control or clearance condition applies, and is U.S.-person status a legal requirement for this role?");
  if (findings.some(f => f.category === "posting_quality")) result.push("Can you share the official employer careers-page posting and confirm this is an actively staffed requisition?");
  if (!compensation) result.push("What is the approved base-salary range for this location, excluding bonus and equity?");
  return uniq(result).slice(0, 5);
}

export function analyzeJD(text, options = {}) {
  if (clean(text).length < 100) throw new Error("Paste a fuller job description so the analysis has enough context.");
  const allSentences = sentences(text);
  const metadata = extractMetadata(text, options);
  const work = classifyWork(allSentences);
  const findings = Object.entries(SIGNALS).flatMap(([category, rules]) => findSignals(allSentences, rules, category));
  const mismatch = titleMismatch(metadata.title || "", work);
  if (mismatch) findings.push(mismatch);
  const compensation = parseCompensation(text);
  const qualifications = parseQualifications(allSentences);
  findings.push(...structuralFindings(text, allSentences, compensation));
  const expectedAnnual = Number(options.expectedAnnual || 0);
  if (compensation && expectedAnnual && compensation.annualHigh < expectedAnnual) findings.push({category: "compensation", severity: "high", weight: 3, title: `Even the top of the posted range is below your $${expectedAnnual.toLocaleString()} minimum.`, evidence: compensation.source});
  const auth = findings.filter(f => f.category === "authorization" || f.category === "export_control");
  const workAuthorization = auth.some(f => f.status === "conflict") ? "conflict" : auth.some(f => f.status === "available") ? "available" : auth.length ? "review" : "not_stated";
  const ordered = findings.sort((a,b) => b.weight - a.weight || a.category.localeCompare(b.category));
  return {version: 1, metadata, summary: summarize(work, metadata.title), work, qualifications, findings: ordered, compensation, expectedAnnual: expectedAnnual || null, workAuthorization, h1b: {status: "not_checked", note: "Employer filing history is not checked in this local prototype. Past filings would not prove sponsorship for this role."}, questions: questions(ordered, work, compensation), caveat: "This report identifies evidence-backed risk signals in the posting. It does not verify the employer, predict working conditions, or provide legal advice."};
}

export { parseCompensation };
