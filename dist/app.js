const state={jobs:[],route:"ALL",query:"",selected:null};
const labels={TAILOR_AND_APPLY:"TAILOR + APPLY",FAST_APPLY:"FAST APPLY",MANUAL_REVIEW:"MANUAL REVIEW",SKIP:"SKIP"};
const esc=value=>String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const visible=()=>state.jobs.filter(j=>(state.route==="ALL"||j.route===state.route)&&`${j.company} ${j.role} ${j.lane}`.toLowerCase().includes(state.query));
function counts(){
  document.querySelector("#count-total").textContent=state.jobs.length;
  document.querySelector("#count-today").textContent=state.jobs.filter(j=>j.priority==="APPLY_TODAY").length;
  document.querySelector("#count-tailor").textContent=state.jobs.filter(j=>j.route==="TAILOR_AND_APPLY").length;
  document.querySelector("#count-review").textContent=state.jobs.filter(j=>j.route==="MANUAL_REVIEW").length;
}
function renderList(){
  const list=document.querySelector("#job-list"),jobs=visible();
  list.innerHTML=jobs.length?jobs.map(j=>`<button class="job-card ${state.selected===j.id?"active":""}" data-id="${esc(j.id)}" data-route="${esc(j.route)}"><div><p class="company">${esc(j.company)}</p><h3>${esc(j.role)}</h3><p class="meta">${esc(j.location)} · ${esc(j.lane)}</p><span class="route">${labels[j.route]}</span></div><div class="score"><strong>${j.fitScore}</strong><span>FIT SCORE</span></div></button>`).join(""):`<div class="empty">No synthetic opportunities match this view.</div>`;
  list.querySelectorAll(".job-card").forEach(el=>el.addEventListener("click",()=>select(el.dataset.id)));
}
function select(id){state.selected=id;renderList();renderDetail();}
function renderDetail(){
  const job=state.jobs.find(j=>j.id===state.selected),detail=document.querySelector("#detail");
  if(!job)return;
  const saved=JSON.parse(localStorage.getItem("career-os-demo-status")||"{}");
  detail.innerHTML=`<div class="detail-top"><div><p class="company">${esc(job.company)}</p><h3>${esc(job.role)}</h3><p class="meta">${esc(job.priority.replaceAll("_"," "))} · ${esc(job.status)}</p></div><span class="detail-score">${job.fitScore}</span></div><p class="detail-summary">${esc(job.summary)}</p><h4>Why this route</h4><ul>${job.reasons.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h4>Open gaps</h4><ul>${job.gaps.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h4>Traceable demo evidence</h4><ul>${job.evidence.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="action-row"><button data-status="reviewed">Mark reviewed</button><button class="primary" data-status="next">Set as next</button></div><p class="saved-note">${saved[job.id]?`Browser-local state: ${esc(saved[job.id])}`:"Demo actions stay only in this browser."}</p>`;
  detail.querySelectorAll("[data-status]").forEach(el=>el.addEventListener("click",()=>saveStatus(job.id,el.dataset.status)));
}
function saveStatus(id,status){const saved=JSON.parse(localStorage.getItem("career-os-demo-status")||"{}");saved[id]=status;localStorage.setItem("career-os-demo-status",JSON.stringify(saved));renderDetail();}
document.querySelector("#route-filters").addEventListener("click",e=>{if(!e.target.dataset.route)return;state.route=e.target.dataset.route;document.querySelectorAll("#route-filters button").forEach(b=>b.classList.toggle("active",b===e.target));renderList();});
document.querySelector("#search").addEventListener("input",e=>{state.query=e.target.value.trim().toLowerCase();renderList();});
document.querySelector("#theme").addEventListener("click",()=>{const dark=document.documentElement.dataset.theme==="dark";document.documentElement.dataset.theme=dark?"light":"dark";localStorage.setItem("career-os-demo-theme",dark?"light":"dark");});
document.documentElement.dataset.theme=localStorage.getItem("career-os-demo-theme")||"light";
fetch("data.json").then(r=>{if(!r.ok)throw new Error("Data unavailable");return r.json();}).then(data=>{state.jobs=data.opportunities;counts();renderList();}).catch(()=>{document.querySelector("#job-list").innerHTML='<div class="empty">Synthetic demo data could not be loaded.</div>';});
