import {analyzeJD} from "./engine.js";

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const labels = {model:"Model development",software:"Software engineering",data:"Data / pipelines",customer:"Customer delivery",product:"Product / stakeholders",operations:"Operations / support",research:"Research",regulated:"Regulated domain"};
const categories = {staffing:"Who is hiring",pressure:"Work intensity",scope:"Scope",work_arrangement:"Work arrangement",seniority:"Level clarity",role_shape:"What the role really is",authorization:"Work authorization",export_control:"Export control",posting_quality:"Posting quality",title_mismatch:"Title mismatch",compensation:"Compensation"};
const money = value => new Intl.NumberFormat("en-US", {style:"currency", currency:"USD", maximumFractionDigits:0}).format(value);
const emptyReport = `<div><span>↳</span><h3>Your report will appear here.</h3><p>Start with one real JD. You do not need to describe yourself first.</p></div>`;
const safeUrl = value => { try { const url = new URL(value); return ["http:","https:"].includes(url.protocol) ? url.href : null; } catch { return null; } };

function render(result, meta) {
  const detected = result.metadata;
  const shares = Object.entries(result.work.shares).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
  const high = result.findings.filter(f => f.severity === "high").length;
  const verdict = high ? `${high} high-priority signal${high === 1 ? "" : "s"}` : result.findings.length ? `${result.findings.length} signal${result.findings.length === 1 ? "" : "s"} to inspect` : "No strong hidden-risk signal detected";
  const compensation = result.compensation ? `<div class="salary-card"><div><p class="eyebrow">Compensation translated</p><strong>${money(result.compensation.annualLow)}–${money(result.compensation.annualHigh)} / year</strong><span>$${result.compensation.hourlyLow.toFixed(2)}–$${result.compensation.hourlyHigh.toFixed(2)} / hour · 2,080-hour conversion</span></div><small>Source: “${esc(result.compensation.source)}”<br>Base-pay interpretation only; equity, bonus, overtime, and unpaid time can change total compensation.</small></div>` : `<div class="salary-card muted-card"><div><p class="eyebrow">Compensation</p><strong>No usable pay range found</strong><span>Ask for the approved base range before investing heavily in the process.</span></div></div>`;
  const findings = result.findings.length ? result.findings.map((f,index) => {
    const evidence = (f.evidenceItems?.length ? f.evidenceItems : [f.evidence]).map(item => `<span>“${esc(item)}”</span>`).join("");
    return `<article class="finding ${f.severity}"><div class="finding-top"><span>${esc(categories[f.category] || f.category)}</span><b>${f.severity} signal</b></div><h4>${esc(f.title)}</h4><blockquote class="evidence-list">${evidence}</blockquote><button class="copy-evidence" data-evidence="${index}" type="button">Copy evidence</button></article>`;
  }).join("") : `<div class="quiet"><h4>No strong pattern detected</h4><p>That does not prove the job is low-risk. The posting may simply omit the relevant details.</p></div>`;
  const qualifications = result.qualifications.requiredYears || result.qualifications.preferredYears ? `<div class="qualification-card"><p class="eyebrow">Minimum vs preferred</p><div><strong>${result.qualifications.requiredYears ?? "—"}<small>required years detected</small></strong><strong>${result.qualifications.preferredYears ?? "—"}<small>preferred years detected</small></strong></div><p>Preferred experience does not raise the detected minimum.</p></div>` : "";
  const omissions = result.omissions?.length ? `<section class="unknowns"><p class="eyebrow">What the posting still does not tell you</p><div>${result.omissions.map(item => `<span>${esc(item)}</span>`).join("")}</div><p>Missing information is not automatically a red flag, but it should not be silently filled in.</p></section>` : "";
  $("#report").className = "report";
  const identity = `<div class="detected-meta"><span><b>${detected.title ? "Detected title" : "Title unavailable"}</b>${esc(detected.title || "Not confidently found")}${detected.title ? `<i>${esc(detected.titleConfidence)} confidence</i>` : ""}</span><span><b>${detected.company ? "Detected company" : "Company unavailable"}</b>${esc(detected.company || "Not confidently found")}${detected.company ? `<i>${esc(detected.companyConfidence)} confidence</i>` : ""}</span></div>`;
  $("#report").innerHTML = `<div class="report-head"><div><p class="eyebrow">JD X-ray report</p><h3>${esc(detected.title || "Role title not confirmed")}</h3><p>${esc(detected.company || "Company not confirmed")}</p></div><span class="signal-count ${high ? "alert" : ""}">${esc(verdict)}</span></div>${identity}<section id="deep-review" class="deep-review loading"><div><p class="eyebrow">AI + external verification</p><h4>Checking semantics, source history, and employer signals…</h4><p>The local evidence report is already available below.</p></div></section><section class="bottom-line"><p class="eyebrow">Local text analysis</p><h4>${esc(result.bottomLine)}</h4></section><section class="plain-read"><p class="eyebrow">What the work appears to be</p><h4>${esc(result.summary)}</h4><div class="work-bars">${shares.map(([key,value]) => `<div><span>${esc(labels[key] || key)}</span><i><b style="width:${value}%"></b></i><strong>${value}%</strong></div>`).join("")}</div></section>${qualifications}${compensation}${omissions}<section><div class="report-section-title"><p class="eyebrow">What deserves a closer look</p><span>${result.findings.length} evidence-backed finding${result.findings.length===1?"":"s"}</span></div><div class="findings">${findings}</div></section><section class="questions"><p class="eyebrow">Questions worth asking</p><ol>${result.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ol></section><section class="h1b-note"><div><b>H-1B employer history</b><p>${esc(result.h1b.note)}</p></div><span>Not checked locally</span></section><p class="caveat">${esc(result.caveat)}</p>`;
  document.querySelectorAll(".copy-evidence").forEach((button,index) => button.onclick = async () => { await navigator.clipboard.writeText((result.findings[index].evidenceItems || [result.findings[index].evidence]).join("\n\n")); button.textContent = "Copied"; setTimeout(() => button.textContent = "Copy evidence", 1200); });
}

function aiFinding(finding) {
  const sources = (finding.sources || []).map(source => {
    const url = safeUrl(source.url);
    return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(source.title || new URL(url).hostname)}</a>` : "";
  }).filter(Boolean).join("");
  const evidence = (finding.evidence || []).map(item => `<span>“${esc(item)}”</span>`).join("");
  return `<article class="ai-finding"><div><span>${esc(finding.topic)}</span><b>${esc(finding.verification.replaceAll("_", " "))}</b></div><h5>${esc(finding.claim)}</h5>${evidence ? `<blockquote>${evidence}</blockquote>` : ""}${sources ? `<nav>${sources}</nav>` : ""}${finding.query_scope ? `<small>Scope: ${esc(finding.query_scope)}</small>` : ""}</article>`;
}

async function runDeepAnalysis(jd, sourceUrl) {
  const panel = $("#deep-review");
  try {
    const response = await fetch("/api/analyze-jd", {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({jd, source_url:sourceUrl || null})});
    const payload = await response.json();
    if (!response.ok || !payload.available) {
      panel.className = "deep-review unavailable";
      panel.innerHTML = `<div><p class="eyebrow">Local analysis only</p><h4>AI and external verification are not configured yet.</h4><p>${esc(payload.message || "The evidence-backed local report remains available below.")}</p></div>`;
      return;
    }
    const report = payload.report;
    const stated = report.from_jd;
    const identity = stated.actual_employer_disclosed ? `Actual employer: ${stated.actual_employer || "named"}` : "Actual employer/client is not disclosed";
    const missing = stated.missing_sections.length ? `<div class="ai-missing">${stated.missing_sections.map(item => `<span>${esc(item)}</span>`).join("")}</div>` : "";
    const jdFindings = stated.findings.map(aiFinding).join("");
    const external = report.external_checks.findings.map(aiFinding).join("");
    panel.className = "deep-review ready";
    panel.innerHTML = `<div class="deep-head"><div><p class="eyebrow">AI reading + sourced checks</p><h4>${esc(stated.summary)}</h4><p>${esc(identity)} · ${esc(stated.posting_type.replaceAll("_", " "))}</p></div><span>${esc(report.external_checks.status)}</span></div>${missing}<div class="ai-columns"><section><h5>From the JD</h5>${jdFindings || `<p class="muted">No additional semantic finding.</p>`}</section><section><h5>Verified externally</h5>${external || `<p class="muted">No externally verified finding was returned. This is not evidence that none exist.</p>`}</section></div><p class="ai-caveat">${esc(report.caveats.join(" "))}</p>`;
  } catch {
    panel.className = "deep-review unavailable";
    panel.innerHTML = `<div><p class="eyebrow">Local analysis only</p><h4>External verification could not run.</h4><p>The local evidence report remains available; no external fact has been inferred.</p></div>`;
  }
}

$("#jd-form").onsubmit = event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const meta = {title:String(form.get("title") || "").trim(), company:String(form.get("company") || "").trim(), expectedAnnual:Number(form.get("expectedAnnual") || 0)};
  const jd = String(form.get("jd") || "");
  try { render(analyzeJD(jd, meta), meta); runDeepAnalysis(jd, String(form.get("sourceUrl") || "").trim()); $("#report").scrollIntoView({behavior:"smooth",block:"start"}); }
  catch (error) { $("#report").className = "report error-report"; $("#report").innerHTML = `<div><h3>Not enough to inspect yet.</h3><p>${esc(error.message)}</p></div>`; }
};

$("#sample").onclick = () => {
  const form = $("#jd-form");
  form.elements.title.value = "";
  form.elements.company.value = "";
  form.elements.expectedAnnual.value = "120000";
  form.elements.jd.value = `Example Talent Solutions is hiring a Machine Learning Engineer for a six-month contract-to-hire engagement. This is a fast-paced environment for a self-starter who can wear many hats and manage multiple competing priorities.\n\nYou will partner with sales teams, run customer demonstrations, lead client implementations, resolve support tickets, build dashboards, and maintain data pipelines. You may occasionally prototype machine-learning features. The role participates in an after-hours on-call rotation. Other duties as assigned.\n\nCandidates need 3+ years of experience with Python, SQL, customer-facing delivery, and reporting tools. Applicants must be authorized to work in the United States without current or future sponsorship.\n\nCompensation: $42–$50 per hour.`;
  form.requestSubmit();
};

$("#clipboard").onclick = async () => {
  const button = $("#clipboard"), form = $("#jd-form");
  try {
    const text = await navigator.clipboard.readText();
    if (text.trim().length < 100) throw new Error("The clipboard does not contain a full JD yet.");
    form.elements.jd.value = text;
    form.requestSubmit();
  } catch (error) {
    button.textContent = "Clipboard unavailable — paste into the box";
    setTimeout(() => button.textContent = "Paste clipboard + analyze", 2600);
  }
};

$("#clear").onclick = () => {
  const form = $("#jd-form");
  form.reset();
  $("#report").className = "report empty-report";
  $("#report").innerHTML = emptyReport;
  form.elements.jd.focus();
};

$("#theme").onclick = () => { const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("jd-xray-theme", next); };
document.documentElement.dataset.theme = localStorage.getItem("jd-xray-theme") || "light";
