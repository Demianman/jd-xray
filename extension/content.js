function pageText() {
  const selectors = ["[data-testid*='job']", "[class*='job-description']", "[class*='jobDescription']", "#job-description", "main", "article"];
  const candidates = selectors.flatMap(selector => [...document.querySelectorAll(selector)]).map(node => ({text: node.innerText || "", node})).filter(item => item.text.length > 300).sort((a,b) => b.text.length - a.text.length);
  const source = candidates[0]?.node || document.body;
  return {text: (source.innerText || "").slice(0, 80000), title: document.querySelector("h1")?.innerText?.trim() || document.title, url: location.href};
}

function highlight(needle) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const index = node.nodeValue.toLowerCase().indexOf(String(needle).slice(0, 120).toLowerCase());
    if (index >= 0 && node.parentElement && !["SCRIPT","STYLE","TEXTAREA"].includes(node.parentElement.tagName)) {
      const mark = document.createElement("mark");
      mark.dataset.jdXray = "true";
      mark.textContent = node.nodeValue.slice(index, index + Math.min(needle.length, node.nodeValue.length - index));
      const after = node.splitText(index); after.splitText(mark.textContent.length); after.replaceWith(mark); mark.scrollIntoView({behavior:"smooth", block:"center"}); setTimeout(() => mark.remove(), 7000); return true;
    }
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === "extract") respond(pageText());
  if (message.type === "highlight") respond({found: highlight(message.text)});
});
