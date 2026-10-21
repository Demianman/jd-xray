import {analyzeJD} from "./engine.js";

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const labels = {model:"Model development",software:"Software engineering",data:"Data / pipelines",customer:"Customer delivery",product:"Product / stakeholders",operations:"Operations / support",research:"Research",regulated:"Regulated domain"};
const categories = {staffing:"Employment setup",pressure:"Work intensity",scope:"Scope",authorization:"Work authorization",export_control:"Export control",posting_quality:"Posting quality",title_mismatch:"Title mismatch",compensation:"Compensation"};
const money = value => new Intl.NumberFormat("en-US", {style:"currency", currency:"USD", maximumFractionDigits:0}).format(value);

function render(result, meta) {
  const detected = result.metadata;
  const shares = Object.entries(result.work.shares).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
  const high = result.findings.filter(f => f.severity === "high").length;
  const verdict = high ? `${high} high-priority signal${high === 1 ? "" : "s"}` : result.findings.length ? `${result.findings.length} signal${result.findings.length === 1 ? "" : "s"} to inspect` : "No strong hidden-risk signal detected";
  const compensation = result.compensation ? `<div class="salary-card"><div><p class="eyebrow">Compensation translated</p><strong>${money(result.compensation.annualLow)}–${money(result.compensation.annualHigh)} / year</strong><span>$${result.compensation.hourlyLow.toFixed(2)}–$${result.compensation.hourlyHigh.toFixed(2)} / hour · 2,080-hour conversion</span></div><small>Source: “${esc(result.compensation.source)}”<br>Base-pay interpretation only; equity, bonus, overtime, and unpaid time can change total compensation.</small></div>` : `<div class="salary-card muted-card"><div><p class="eyebrow">Compensation</p><strong>No usable pay range found</strong><span>Ask for the approved base range before investing heavily in the process.</span></div></div>`;
  const findings = result.findings.length ? result.findings.map((f,index) => `<article class="finding ${f.severity}"><div class="finding-top"><span>${esc(categories[f.category] || f.category)}</span><b>${f.severity} signal</b></div><h4>${esc(f.title)}</h4><blockquote>“${esc(f.evidence)}”</blockquote><button class="copy-evidence" data-evidence="${index}" type="button">Copy evidence</button></article>`).join("") : `<div class="quiet"><h4>No strong pattern detected</h4><p>That does not prove the job is low-risk. The posting may simply omit the relevant details.</p></div>`;
  const qualifications = result.qualifications.requiredYears || result.qualifications.preferredYears ? `<div class="qualification-card"><p class="eyebrow">Minimum vs preferred</p><div><strong>${result.qualifications.requiredYears ?? "—"}<small>required years detected</small></strong><strong>${result.qualifications.preferredYears ?? "—"}<small>preferred years detected</small></strong></div><p>Preferred experience does not raise the detected minimum.</p></div>` : "";
  $("#report").className = "report";
  const identity = `<div class="detected-meta"><span><b>${detected.title ? "Detected title" : "Title unavailable"}</b>${esc(detected.title || "Not confidently found")}${detected.title ? `<i>${esc(detected.titleConfidence)} confidence</i>` : ""}</span><span><b>${detected.company ? "Detected company" : "Company unavailable"}</b>${esc(detected.company || "Not confidently found")}${detected.company ? `<i>${esc(detected.companyConfidence)} confidence</i>` : ""}</span></div>`;
  $("#report").innerHTML = `<div class="report-head"><div><p class="eyebrow">JD X-ray report</p><h3>${esc(detected.title || "Role title not confirmed")}</h3><p>${esc(detected.company || "Company not confirmed")}</p></div><span class="signal-count ${high ? "alert" : ""}">${esc(verdict)}</span></div>${identity}<section class="plain-read"><p class="eyebrow">What the work appears to be</p><h4>${esc(result.summary)}</h4><div class="work-bars">${shares.map(([key,value]) => `<div><span>${esc(labels[key] || key)}</span><i><b style="width:${value}%"></b></i><strong>${value}%</strong></div>`).join("")}</div></section>${qualifications}${compensation}<section><div class="report-section-title"><p class="eyebrow">What deserves a closer look</p><span>${result.findings.length} evidence-backed finding${result.findings.length===1?"":"s"}</span></div><div class="findings">${findings}</div></section><section class="questions"><p class="eyebrow">Questions worth asking</p><ol>${result.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ol></section><section class="h1b-note"><div><b>H-1B employer history</b><p>${esc(result.h1b.note)}</p></div><span>Not checked yet</span></section><p class="caveat">${esc(result.caveat)}</p>`;
  document.querySelectorAll(".copy-evidence").forEach((button,index) => button.onclick = async () => { await navigator.clipboard.writeText(result.findings[index].evidence); button.textContent = "Copied"; setTimeout(() => button.textContent = "Copy evidence", 1200); });
}

$("#jd-form").onsubmit = event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const meta = {title:String(form.get("title") || "").trim(), company:String(form.get("company") || "").trim(), expectedAnnual:Number(form.get("expectedAnnual") || 0)};
  try { render(analyzeJD(form.get("jd"), meta), meta); $("#report").scrollIntoView({behavior:"smooth",block:"start"}); }
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

$("#theme").onclick = () => { const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("jd-xray-theme", next); };
document.documentElement.dataset.theme = localStorage.getItem("jd-xray-theme") || "light";
