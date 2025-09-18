const DEFAULT_CFG = {
  ragEndpoint:'', ragApiKey:'', minStock:1, requireSameActiveIngredient:true,
  noResultSelectors:'.empty-state,.no-result', productListSelector:'.product-list',
  outOfStockTexts:'Hết hàng,0 tồn', searchInputSelectors:'input[type="search"],.search-input', debounceMs:600
};

const els = Object.fromEntries(['ragEndpoint','ragApiKey','minStock','requireSameActiveIngredient','noResultSelectors','productListSelector','outOfStockTexts','searchInputSelectors','debounceMs'].map(id=>[id, document.getElementById(id)]));

chrome.storage.sync.get(['cfg'], ({ cfg })=>{
  const c = { ...DEFAULT_CFG, ...(cfg||{}) };
  els.ragEndpoint.value = c.ragEndpoint||'';
  els.ragApiKey.value = c.ragApiKey||'';
  els.minStock.value = c.minStock||1;
  els.requireSameActiveIngredient.checked = !!c.requireSameActiveIngredient;
  els.noResultSelectors.value = Array.isArray(c.noResultSelectors)?c.noResultSelectors.join(','):c.noResultSelectors;
  els.productListSelector.value = c.productListSelector||'';
  els.outOfStockTexts.value = Array.isArray(c.outOfStockTexts)?c.outOfStockTexts.join(','):c.outOfStockTexts;
  els.searchInputSelectors.value = Array.isArray(c.searchInputSelectors)?c.searchInputSelectors.join(','):c.searchInputSelectors;
  els.debounceMs.value = c.debounceMs||600;
});

document.getElementById('save').onclick = async ()=>{
  const cfg = {
    ragEndpoint: els.ragEndpoint.value.trim(),
    ragApiKey: els.ragApiKey.value.trim(),
    minStock: Number(els.minStock.value||1),
    requireSameActiveIngredient: !!els.requireSameActiveIngredient.checked,
    noResultSelectors: els.noResultSelectors.value.split(',').map(s=>s.trim()).filter(Boolean),
    productListSelector: els.productListSelector.value.trim(),
    outOfStockTexts: els.outOfStockTexts.value.split(',').map(s=>s.trim()).filter(Boolean),
    searchInputSelectors: els.searchInputSelectors.value.split(',').map(s=>s.trim()).filter(Boolean),
    debounceMs: Number(els.debounceMs.value||600)
  };
  await chrome.storage.sync.set({ cfg });
  alert('Đã lưu!');
};

document.getElementById('reset').onclick = async ()=>{
  await chrome.storage.sync.set({ cfg: null });
  alert('Đã khôi phục mặc định. Hãy mở lại trang này.');
};