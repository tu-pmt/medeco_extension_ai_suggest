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

function handleSearchResults(query) {
  console.log("Tìm kiếm sản phẩm:", query);
  // Gửi yêu cầu gợi ý sản phẩm từ backend API (sử dụng chrome.runtime.sendMessage)
  chrome.runtime.sendMessage(
    { type: "AI_SUGGEST", query: query },
    function (response) {
      if (response.ok) {
        displayResults(response.results);
      } else {
        console.log("Không có gợi ý thay thế");
      }
    }
  );
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Tạo một hàm debounce cho search
const debouncedSearch = debounce(function () {
  const query = document.querySelector("#search-product-input").value.trim();
  if (query) {
    handleSearchResults(query);
  }
}, 1000); // Thời gian chờ là 1000ms (1 giây)

// Lắng nghe thay đổi trong DOM, ví dụ khi người dùng nhập vào ô tìm kiếm
document.querySelector("#search-product-input").addEventListener("input", (e) => {
  const query = e.target.value.trim();
  if (query) {
    debouncedSearch();
  }
});

function displayResults(results) {
  const resultsContainer = document.querySelector("#results-container");
  resultsContainer.innerHTML = "";

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>Không tìm thấy sản phẩm thay thế.</p>";
    return;
  }

  results.forEach((r) => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.style.borderBottom = "1px solid #ccc";
    div.innerHTML = `
        <div class="product-card">
            <div class="product-title"><b>${escapeHtml(r.name)}</b> ${r.strength ? `(${escapeHtml(r.strength)})` : ""
        }</div>
            <div class="product-meta"><b>SKU:</b> ${escapeHtml(r.sku || "--")}</div>
            <div class="product-meta"><b>Hoạt chất:</b> ${escapeHtml(r.api || r.activeIngredient || "--")}</div>
            <div class="product-stock" style="color: rgb(55, 65, 81);"> <b>Tồn:</b> <b>${Number(
          r.stock || 0
        )}</b></div>
        </div>
      `;
    resultsContainer.appendChild(div);
  });
}
