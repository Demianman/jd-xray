const state={jobs:[],route:"ALL",query:"",selected:null};
const labels={TAILOR_AND_APPLY:"TAILOR + APPLY",FAST_APPLY:"FAST APPLY",MANUAL_REVIEW:"MANUAL REVIEW",SKIP:"SKIP"};
const esc=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const visible=()=>state.jobs.filter(job=>(state.route==="ALL"||job.route===state.route)&&`${job.company} ${job.role} ${job.location} ${job.lane}`.toLowerCase().includes(state.query));

function renderCounts(){
  document.querySelector("#count-total").textContent=state.jobs.length;
  document.querySelector("#count-today").textContent=state.jobs.filter(job=>job.priority==="APPLY_TODAY").length;
  document.querySelector("#count-tailor").textContent=state.jobs.filter(job=>job.route==="TAILOR_AND_APPLY").length;
  document.querySelector("#count-review").textContent=state.jobs.filter(job=>job.route==="MANUAL_REVIEW").length;
}

function renderList(){
  const list=document.querySelector("#job-list"),jobs=visible();
  list.innerHTML=jobs.length?jobs.map(job=>`<button class="job-card ${state.selected===job.id?"active":""}" data-id="${esc(job.id)}" data-route="${esc(job.route)}"><div><p class="company">${esc(job.company)}</p><h3>${esc(job.role)}</h3><p class="meta">${esc(job.location)} · ${esc(job.lane)}</p><span class="route">${labels[job.route]}</span></div><div class="score"><strong>${job.fitScore}</strong><span>FIT SCORE</span></div></button>`).join(""):`<div class="empty">No synthetic opportunities match this view.</div>`;
  list.querySelectorAll(".job-card").forEach(card=>card.addEventListener("click",()=>select(card.dataset.id)));
}

function select(id){state.selected=id;renderList();renderDetail();}
function renderDetail(){
  const job=state.jobs.find(item=>item.id===state.selected),detail=document.querySelector("#detail");
  if(!job)return;
  const saved=JSON.parse(localStorage.getItem("jd-xray-public-demo-status")||"{}");
  detail.innerHTML=`<div class="detail-top"><div><p class="company">${esc(job.company)}</p><h3>${esc(job.role)}</h3><p class="meta">${esc(job.priority.replaceAll("_"," "))} · ${esc(job.status)}</p></div><span class="detail-score">${job.fitScore}</span></div><p class="detail-summary">${esc(job.summary)}</p><h4>Why this route</h4><ul>${job.reasons.map(item=>`<li>${esc(item)}</li>`).join("")}</ul><h4>Open gaps</h4><ul>${job.gaps.map(item=>`<li>${esc(item)}</li>`).join("")}</ul><h4>Traceable demo evidence</h4><ul>${job.evidence.map(item=>`<li>${esc(item)}</li>`).join("")}</ul><div class="action-row"><button data-status="reviewed">Mark reviewed</button><button class="primary" data-status="next">Set as next</button></div><p class="saved-note">${saved[job.id]?`Browser-local state: ${esc(saved[job.id])}`:"Demo actions stay only in this browser."}</p>`;
  detail.querySelectorAll("[data-status]").forEach(button=>button.addEventListener("click",()=>saveStatus(job.id,button.dataset.status)));
}

function saveStatus(id,status){const saved=JSON.parse(localStorage.getItem("jd-xray-public-demo-status")||"{}");saved[id]=status;localStorage.setItem("jd-xray-public-demo-status",JSON.stringify(saved));renderDetail();}
document.querySelector("#route-filters").addEventListener("click",event=>{if(!event.target.dataset.route)return;state.route=event.target.dataset.route;document.querySelectorAll("#route-filters button").forEach(button=>button.classList.toggle("active",button===event.target));renderList();});
document.querySelector("#search").addEventListener("input",event=>{state.query=event.target.value.trim().toLowerCase();renderList();});
document.querySelector("#theme").addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=next;localStorage.setItem("jd-xray-theme",next);});
document.documentElement.dataset.theme=localStorage.getItem("jd-xray-theme")||"light";
fetch("/opportunities/data.json").then(response=>{if(!response.ok)throw new Error("Data unavailable");return response.json();}).then(data=>{state.jobs=data.opportunities;renderCounts();renderList();if(state.jobs[0])select(state.jobs[0].id);}).catch(()=>{document.querySelector("#job-list").innerHTML='<div class="empty">Synthetic demo data could not be loaded.</div>';});
