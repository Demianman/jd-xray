import {analyzeJD} from "./engine.js";
import {PROVIDERS} from "./ai-provider.js";

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const labels={model:"Models",software:"Software",data:"Data",customer:"Customer delivery",product:"Product",operations:"Operations",research:"Research",regulated:"Regulated domain"};
const money=value=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
let tabId,result,pageData,connection=null;

async function pageMessage(payload){return chrome.tabs.sendMessage(tabId,payload);}
async function loadConnection(){
  const stored=await chrome.storage.session.get("aiConnection");
  connection=stored.aiConnection||null;
  const provider=connection?.provider||"openai";
  $("#provider").value=provider;
  $("#model").value=connection?.model||PROVIDERS[provider].defaultModel;
  $("#api-key").value="";
  $("#connection-message").textContent=connection?`${PROVIDERS[provider].label} connected for this session.`:"No AI provider connected.";
  $("#settings").classList.toggle("connected",Boolean(connection));
}

function aiPanel(){
  if(!connection)return `<section class="section ai-invitation"><p class="eyebrow">Optional AI reading</p><h2>Use your own model without leaving this page.</h2><p>The local report above used no API. Connect a provider to send only this JD for a deeper semantic read.</p><button id="open-ai-settings" class="primary-button">Connect my AI</button></section>`;
  return `<section id="ai-panel" class="section ai-invitation connected"><p class="eyebrow">Optional AI reading · ${esc(PROVIDERS[connection.provider].label)}</p><h2>Ask ${esc(connection.model)} to read the meaning.</h2><p>Only the extracted JD and source URL will be sent. Results are model interpretations, not external verification.</p><button id="run-ai" class="primary-button">Run AI deep read</button><div id="ai-output" aria-live="polite"></div></section>`;
}

async function run(){
  $("#loading").classList.remove("hidden");$("#error").classList.add("hidden");$("#result").classList.add("hidden");
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});tabId=tab.id;
    await chrome.scripting.executeScript({target:{tabId},files:["content.js"]});
    pageData=await pageMessage({type:"extract"});
    result=analyzeJD(pageData.text,{pageTitle:pageData.title});
    render(result,pageData);
  }catch(error){$("#loading").classList.add("hidden");$("#error-text").textContent=error.message||"This page may block extension access. Open a normal job-detail page and try again.";$("#error").classList.remove("hidden");}
}

function render(local,page){
  const shares=Object.entries(local.work.shares).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]),heading=local.metadata.title||page.title,company=local.metadata.company;
  $("#result").innerHTML=`<section class="top"><p class="eyebrow">Local check · no API used</p><h1>${esc(heading)}</h1>${company?`<p class="company">${esc(company)} · ${esc(local.metadata.companyConfidence)} confidence</p>`:""}<p class="summary">${esc(local.summary)}</p><span class="count">${local.findings.length} signal${local.findings.length===1?"":"s"} to inspect</span></section><section class="section"><div class="bars">${shares.map(([key,value])=>`<div class="bar"><span>${esc(labels[key]||key)}</span><i><b style="width:${value}%"></b></i><strong>${value}%</strong></div>`).join("")}</div></section>${local.compensation?`<section class="section"><p class="eyebrow">Pay translated</p><div class="salary"><strong>${money(local.compensation.annualLow)}–${money(local.compensation.annualHigh)} / year</strong><span>$${local.compensation.hourlyLow.toFixed(2)}–$${local.compensation.hourlyHigh.toFixed(2)} / hour</span></div></section>`:""}<section class="section"><p class="eyebrow">Read between the lines</p>${local.findings.length?local.findings.map((finding,index)=>`<article class="finding ${finding.severity}"><small>${esc(finding.category.replace("_"," "))} · ${finding.severity}</small><h3>${esc(finding.title)}</h3><blockquote>“${esc(finding.evidence)}”</blockquote><button data-i="${index}">Show on page</button></article>`).join(""):'<div class="note">No strong hidden-risk pattern was detected. That is not proof that the role is low-risk; the posting may omit important details.</div>'}</section>${aiPanel()}<section class="section"><p class="eyebrow">Ask before applying</p><ol>${local.questions.map(question=>`<li>${esc(question)}</li>`).join("")}</ol></section><section class="section"><div class="note"><b>H-1B history not checked locally.</b><br>${esc(local.h1b.note)}</div></section>`;
  $("#result").querySelectorAll("[data-i]").forEach(button=>button.onclick=()=>pageMessage({type:"highlight",text:local.findings[+button.dataset.i].evidence}));
  $("#open-ai-settings")?.addEventListener("click",openSettings);
  $("#run-ai")?.addEventListener("click",runAI);
  $("#loading").classList.add("hidden");$("#result").classList.remove("hidden");
}

async function runAI(){
  const button=$("#run-ai"),output=$("#ai-output");button.disabled=true;button.textContent="Reading with AI…";output.innerHTML=`<div class="ai-loading"><i></i><span>Sending only this JD to ${esc(PROVIDERS[connection.provider].label)}.</span></div>`;
  const response=await chrome.runtime.sendMessage({type:"deep-analyze",jd:pageData.text,url:pageData.url});
  button.disabled=false;button.textContent="Run again";
  if(!response?.ok){output.innerHTML=`<div class="ai-error"><b>AI read did not complete.</b><p>${esc(response?.error||"Unknown provider error.")}</p></div>`;return;}
  const report=response.report;
  output.innerHTML=`<div class="ai-report"><p class="ai-label">AI interpretation · not externally verified</p><h3>${esc(report.bottom_line)}</h3><div class="ai-meta"><span>${esc(report.posting_type.replaceAll("_"," "))}</span><span>${report.actual_employer?`Employer: ${esc(report.actual_employer)}`:"Actual employer not confirmed"}</span></div>${report.findings.map(finding=>`<article class="ai-finding ${finding.severity}"><small>${esc(finding.topic)} · ${finding.severity}</small><h4>${esc(finding.claim)}</h4>${finding.evidence.map(item=>`<blockquote>“${esc(item)}”</blockquote>`).join("")}</article>`).join("")}${report.missing_info.length?`<div class="ai-list"><b>Still missing</b><ul>${report.missing_info.map(item=>`<li>${esc(item)}</li>`).join("")}</ul></div>`:""}${report.questions.length?`<div class="ai-list"><b>Questions to ask</b><ol>${report.questions.map(item=>`<li>${esc(item)}</li>`).join("")}</ol></div>`:""}</div>`;
}

function openSettings(){$("#ai-settings").classList.remove("hidden");$("#api-key").focus();}
$("#provider").onchange=event=>{$("#model").value=PROVIDERS[event.target.value].defaultModel;};
$("#settings").onclick=openSettings;
$("#close-settings").onclick=()=>$("#ai-settings").classList.add("hidden");
$("#connect").onclick=async()=>{
  const provider=$("#provider").value,key=$("#api-key").value.trim(),model=$("#model").value.trim()||PROVIDERS[provider].defaultModel;
  if(!key){$("#connection-message").textContent="Enter an API key to connect.";return;}
  await chrome.storage.session.set({aiConnection:{provider,model,key}});await loadConnection();$("#connection-message").textContent=`${PROVIDERS[provider].label} saved for this browser session.`;if(result)render(result,pageData);
};
$("#disconnect").onclick=async()=>{await chrome.storage.session.remove("aiConnection");await loadConnection();$("#connection-message").textContent="Disconnected and removed the session key.";if(result)render(result,pageData);};
$("#refresh").onclick=run;$("#retry").onclick=run;
await loadConnection();run();
