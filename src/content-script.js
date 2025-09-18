/* Content Script - phát hiện trạng thái và chèn popup */
const DEFAULT_CFG = {
  noResultSelectors: [
    '.empty-state', '.no-result', 'div:contains("Không tìm thấy")'
  ],
  productListSelector: '.product-list,.grid-products',
  outOfStockTexts: ['Hết hàng','Hết tồn','0 tồn'],
  searchInputSelectors: ['input[type="search"]','input[name="q"]','.search-input'],
  debounceMs: 600
};

let cfg = DEFAULT_CFG;
let observer = null;
let lastQuery = '';

chrome.storage.sync.get(['cfg'], ({ cfg: saved }) => {
  if (saved) cfg = { ...DEFAULT_CFG, ...saved };
  initObserver();
});

function initObserver(){
  const target = document.querySelector(cfg.productListSelector) || document.body;
  if (!target) return;
  if (observer) observer.disconnect();
  observer = new MutationObserver(debounce(handleDomChange, cfg.debounceMs));
  observer.observe(target, { childList:true, subtree:true });
  // Bắt đầu lần đầu
  setTimeout(handleDomChange, 1000);
}

function getCurrentQuery(){
  for (const sel of cfg.searchInputSelectors){
    const el = document.querySelector(sel);
    if (el && el.value) return el.value.trim();
  }
  // fallback: cố tìm text từ URL ?q=...
  const params = new URLSearchParams(location.search);
  return params.get('q') || '';
}

function detectNoResult(){
  // 1) empty-state element
  for (const sel of cfg.noResultSelectors){
    try{
      const els = document.querySelectorAll(sel);
      if (els && els.length){
        for (const e of els){
          const txt = e.textContent?.toLowerCase() || '';
          if (txt.includes('không tìm thấy') || txt.includes('không có kết quả')) return true;
        }
        return true; // có empty-state
      }
    }catch(_){/* selector :contains có thể lỗi */}
  }
  // 2) tồn tại danh sách nhưng tất cả item đều out-of-stock
  const list = document.querySelectorAll('.product-item,.card-product,.item');
  if (list.length){
    const oos = Array.from(list).every(it=>{
      const t = it.textContent?.toLowerCase() || '';
      return cfg.outOfStockTexts.some(k=>t.includes(k.toLowerCase()));
    });
    if (oos) return true;
  }
  return false;
}

async function handleDomChange(){
  const q = getCurrentQuery();
  if (!q) return;
  lastQuery = q;
  if (!detectNoResult()){
    removePopup();
    return;
  }
  // Gửi message đến background để gọi RAG
  chrome.runtime.sendMessage({ type:'AI_SUGGEST', query:q }, (resp)=>{
    if (!resp || !resp.ok) return;
    renderPopup(q, resp.results || []);
  });
}

function renderPopup(query, results){
  removePopup();
  const wrap = document.createElement('div');
  wrap.id = 'ai-suggest-popup';
  wrap.innerHTML = `
    <div class="hdr">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="#34d399" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="10" r="6" stroke="#34d399" stroke-width="2"/></svg>
      <div class="title">Gợi ý thay thế cho: <span style="color:#a7f3d0">${escapeHtml(query)}</span></div>
    </div>
    <div class="bd"></div>
    <div class="ft">
      <span class="badge">AI + RAG</span>
      <button class="ghost" id="ai-close">Đóng</button>
    </div>
  `;
  document.body.appendChild(wrap);
  const bd = wrap.querySelector('.bd');
  if (!results.length){
    bd.innerHTML = `<div class="itm"><div class="meta">Không tìm thấy sản phẩm thay thế phù hợp còn tồn.</div></div>`;
  } else {
    for (const r of results){
      const node = document.createElement('div');
      node.className = 'itm';
      node.innerHTML = `
        <h4>${escapeHtml(r.name)} ${r.strength?`- ${escapeHtml(r.strength)}`:''}</h4>
        <div class="meta">Hoạt chất: ${escapeHtml(r.api || r.activeIngredient || '--')} · Dạng: ${escapeHtml(r.form||'--')} · Tồn: <b>${Number(r.stock||0)}</b></div>
        <div class="act">
          ${r.url?`<button data-href="${encodeURI(r.url)}">Xem</button>`:''}
          ${r.addToCartPayload?`<button class="ghost" data-cart='${JSON.stringify(r.addToCartPayload)}'>Thêm vào giỏ</button>`:''}
        </div>
      `;
      bd.appendChild(node);
    }
  }
  wrap.querySelector('#ai-close')?.addEventListener('click', removePopup);
  wrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.href){
      window.open(btn.dataset.href, '_blank');
    } else if (btn.dataset.cart){
      try {
        const payload = JSON.parse(btn.dataset.cart);
        // Tuỳ giao diện MISA: có thể bắn custom event hoặc gọi hàm toàn cục nếu có.
        window.dispatchEvent(new CustomEvent('AI_ADD_TO_CART',{detail:payload}));
      } catch(_){}
    }
  });
}

function removePopup(){
  document.getElementById('ai-suggest-popup')?.remove();
}

function debounce(fn, ms){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}