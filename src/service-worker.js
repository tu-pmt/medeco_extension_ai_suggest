const DEFAULT = {
  ragEndpoint: 'http://localhost:8069',
  ragApiKey: 'changeme',
  minStock: 1,
  requireSameActiveIngredient: true
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  if (msg?.type === 'AI_SUGGEST'){
    handleSuggest(msg.query).then(data=>sendResponse(data)).catch(()=>sendResponse({ok:false}));
    return true; // async
  }
});

async function handleSuggest(query, minStock=1){
  const { cfg } = await chrome.storage.sync.get(['cfg']);
  const opt = { ...DEFAULT, ...(cfg||{}) };
  try{
    const res = await fetch(`${opt.ragEndpoint}/api/search-alternatives`,{
      method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${opt.ragApiKey}` },
      body: JSON.stringify({
        query,
        minStock: minStock || opt.minStock,
        // requireSameActiveIngredient: opt.requireSameActiveIngredient,
        size: 10
      })
    });
    if (!res.ok) throw new Error('RAG error');
    const json = await res.json();
    return { ok:true, results: json.results||[] };
  }catch(err){
    console.error('RAG fetch failed', err);
    return { ok:false, error: String(err) };
  }
}