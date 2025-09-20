/* Content Script phù hợp với HTML bạn đưa */

let observer = null;
let showPopup = true;
let previousQuery = "";

function initObserver() {
  const target =
    document.querySelector(".product-seacrh-inventory") || document.body;
  if (!target) return;

  if (observer) observer.disconnect();

  observer = new MutationObserver(debounce(handleDomChange, 500));
  observer.observe(target, { childList: true, subtree: true });

  // Chạy lần đầu
  setTimeout(handleDomChange, 1000);
}

function getCurrentQuery() {
  const el = document.querySelector('input[type="search"]');
  return el ? el.value.trim() : "";
}

function detectNoResult() {
  const items = document.querySelectorAll(".not-found-product");
  return items.length === 0;
}

function getResultSearch() {
  const popupSearch = document.querySelector(
    "div.q-menu.q-position-engine.scroll.option-select.content-class-search"
  );
  if (!popupSearch) return [];
  const items = popupSearch.querySelectorAll("div.q-item.q-item-type");
  if (!items.length) return [];
  const results = [];

  items.forEach((item) => {
    const name = item
      .querySelector(".thumbnail-product-search-title")
      ?.textContent.trim();
    const stock = item.querySelector(".quantity-search")?.textContent.trim();
    const stockEl = item.querySelector(".product-seacrh-sku");
    const sku = item.querySelector(".product-seacrh-code")?.textContent.trim();
    if (name && stock && sku) {
      results.push({ name, stock, sku });
    }
    if (stock == 0 && !item.querySelector(".btn-suggest")) {
      const btn = document.createElement("button");
      btn.className = "btn-suggest";
      btn.title = "Gợi ý sản phẩm thay thế";
      btn.innerHTML = "💡"; // có thể thay bằng SVG icon
      btn.style.marginLeft = "6px";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", (e) => {
        // TODO: xử lý logic gợi ý
        e.stopPropagation();
        e.preventDefault();
        console.log("Gợi ý sản phẩm cho:", name, sku);
        // ví dụ: chrome.runtime.sendMessage({type:'AI_SUGGEST', query: name});
        chrome.runtime.sendMessage(
          { type: "AI_SUGGEST", query: name },
          (resp) => {
            if (!resp || !resp.ok) return;
            const rs = [
              {
                name: "Anvitram 500mg",
                strength: "500mg",
                activeIngredient: "Dược liệu X",
                stock: 15,
                sku: "PNE123123",
              },
            ];
            renderPopup(name, resp.results || rs);
            showPopup = false;
          }
        );
      });
      stockEl.insertAdjacentElement("afterend", btn);
    }
  });

  return results;
}

function suggestFromQuery() {
  // if(!showPopup) return;
  const q = getCurrentQuery();
  if (q === previousQuery) {
    return;
  }
  previousQuery = q;
  showPopup = true;
  if (!q) return;

  if (!detectNoResult()) {
    //chỗ này cần xử lý khi không tìm thấy sản phẩm nào phù hợp
    // removePopup();
    console.log("Call API suggest for:", q);
    chrome.runtime.sendMessage({ type: "AI_SUGGEST", query: q }, (resp) => {
      if (!resp || !resp.ok) return;
      const rs = [
        {
          name: "Panandol Extra",
          strength: "500mg",
          activeIngredient: "Paracetamol",
          stock: 20,
          sku: "PNE123",
        },
      ];
      renderPopup(q, resp.results || rs);
    });
    return;
  }

  // Gửi message sang background
  // chrome.runtime.sendMessage({ type: "AI_SUGGEST", query: q }, (resp) => {
  //   // if (!resp || !resp.ok) return;
  //   const rs = [
  //     {
  //       name: "Panandol Extra",
  //       strength: "500mg",
  //       activeIngredient: "Paracetamol",
  //       stock: 20,
  //       sku: "PNE123",
  //     },
  //   ];
  //   renderPopup(q, resp.results || rs);
  // });
}

function handleDomChange() {
  getResultSearch();
  suggestFromQuery();
}

function renderPopup(query, results) {
  removePopup();
  const wrap = document.createElement("div");
  wrap.id = "ai-suggest-popup";
  wrap.style.position = "fixed";
  wrap.style.top = "100px";
  wrap.style.right = "20px";
  wrap.style.background = "#fff";
  wrap.style.border = "1px solid #ccc";
  wrap.style.padding = "10px";
  wrap.style.zIndex = "99999";
  wrap.style.width = "350px";

  wrap.innerHTML = `
    <div style="color: #222222; font-size: 18px;"><b>Gợi ý thay thế cho:</b> <br/> 
    <div style="color: #5b21b6;font-size: 16px;margin: 5px 0;">${escapeHtml(
      query
    )}</div>
    <div class="bd"></div>
    <button style="color: white; position: absolute;top: -1px; left: -29px; width: 30px;height: 30px;display: flex;align-items: center;justify-content: center;" id="ai-close">x</button>
  `;

  const bd = wrap.querySelector(".bd");
  if (!results.length) {
    bd.innerHTML =
      "<div style='margin-top: 10px;font-style: italic;'>Không tìm thấy sản phẩm thay thế phù hợp còn tồn.</div>";
  } else {
    results.forEach((r) => {
      const div = document.createElement("div");
      div.style.borderBottom = "1px solid #bbb";
      div.style.borderTop = "1px solid #bbb";
      div.style.padding = "5px 0";
      div.style.position = "relative";
      div.innerHTML = `
        <div class="product-card">
            <div class="product-title"><b>${escapeHtml(r.name)}</b> ${
        r.strength ? `(${escapeHtml(r.strength)})` : ""
      }</div>
            <div class="product-meta"><b>SKU:</b> ${escapeHtml(
              r.sku || "--"
            )}</div>
            <div class="product-meta"><b>Hoạt chất:</b> ${escapeHtml(
              r.api || r.activeIngredient || "--"
            )}</div>
            <div class="product-stock" style="color: rgb(55, 65, 81);"> <b>Tồn:</b> <b>${Number(
              r.stock || 0
            )}</b></div>
        </div>
      `;
      const btn = document.createElement("button");
      btn.className = "add-to-cart";
      btn.title = "Thêm sản phẩm thay thế";
      btn.innerHTML = "+"; // có thể thay bằng SVG icon
      btn.style.cursor = "pointer";
      div.appendChild(btn);
      btn.addEventListener("click", (e) => {
        // TODO: xử lý logic gợi ý
        e.stopPropagation();
        e.preventDefault();
        console.log("Thêm sản phẩm cho:", escapeHtml(r.sku));
        // const searchInput = document.querySelector('input[type="search"]')
        // searchInput.focus();
        // searchInput.value = r.sku || "";
        const input = document.querySelector("input[type='search']");

        if (input) {
          // Gán giá trị
          input.value = r.sku || "";
          // Bắn sự kiện input để framework nhận
          input.dispatchEvent(new Event("input", { bubbles: true }));
          // Focus chuột vào ô input
          input.focus();
          // Giả lập click chuột vào ô input
          input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          // Bắn thêm sự kiện keyup để kích hoạt autocomplete nếu cần
          input.dispatchEvent(
            new KeyboardEvent("keyup", { bubbles: true, key: "a" })
          );
        }
        setTimeout(() => {
          const area_result_search = document.querySelector(
            ".q-position-engine.scroll.option-select.content-class-search"
          ); // Điều chỉnh selector cho phù hợp

          if (area_result_search) {
            const items = area_result_search.querySelectorAll(".q-item__section--main");
            if (items.length) items[0].click();
          }
        }, 1000);
      });
      bd.appendChild(div);
    });
  }

  wrap.querySelector("#ai-close").addEventListener("click", removePopup);

  document.body.appendChild(wrap);
}

function removePopup() {
  document.getElementById("ai-suggest-popup")?.remove();
  showPopup = true;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function escapeHtml(s) {
  return (s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

// Khởi tạo
initObserver();
