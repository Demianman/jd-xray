import {requestFor,parseAIResponse} from "./ai-provider.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch(() => {});
  chrome.storage.session.setAccessLevel({accessLevel:"TRUSTED_CONTEXTS"}).catch(()=>{});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch(() => {});
  chrome.storage.session.setAccessLevel({accessLevel:"TRUSTED_CONTEXTS"}).catch(()=>{});
});

chrome.runtime.onMessage.addListener((message,_sender,respond)=>{
  if(message?.type!=="deep-analyze")return;
  (async()=>{
    const {aiConnection}=await chrome.storage.session.get("aiConnection");
    if(!aiConnection?.key)throw new Error("Connect your AI provider first.");
    const request=requestFor({...aiConnection,jd:message.jd,url:message.url});
    const response=await fetch(request.endpoint,request.options);
    if(!response.ok){const detail=await response.text();throw new Error(`Provider request failed (${response.status}). ${detail.slice(0,180)}`);}
    return {ok:true,report:parseAIResponse(await response.json())};
  })().then(respond).catch(error=>respond({ok:false,error:error.message||"AI analysis failed."}));
  return true;
});
