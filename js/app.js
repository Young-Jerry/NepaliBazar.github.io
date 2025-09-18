// Main frontend app. Handles injecting header/footer, reading products, search, product detail.
// Uses config.js and product-data.js

import { SITE_NAME, SITE_SHORT, CONTACT_EMAIL, ITEMS_PER_PAGE } from "./config.js";
import { PRODUCTS } from "./product-data.js";

/* ---------- Utilities ---------- */
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const fmtPrice = (p, c = "Rs.") => `${c} ${Number(p).toLocaleString("en-IN")}`;
const slugify = s => String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

/* ---------- Header & Footer ---------- */
function renderHeader() {
  const header = qs("#site-header");
  if (!header) return;
  header.innerHTML = `
    <a class="brand" href="index.html">
      <div class="logo">${SITE_SHORT.slice(0,2).toUpperCase()}</div>
      <div>
        <div class="title">${SITE_NAME}</div>
        <div class="muted small">Buy • Sell • Local</div>
      </div>
    </a>
    <div class="header-actions">
      <a class="btn" href="products.html">Products</a>
      <a class="btn" href="sell.html">Sell</a>
      <a class="btn" href="login.html">Login</a>
    </div>
  `;
}

function renderFooter() {
  const footer = qs("#site-footer");
  if (!footer) return;
  const year = new Date().getFullYear();
  footer.innerHTML = `
    <div>${SITE_NAME} © ${year}</div>
    <div class="muted small">Contact: <a class="link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></div>
  `;
}

/* ---------- Product Card ---------- */
function createProductCard(product) {
  const div = document.createElement("div");
  div.className = "card";
  const img = product.images && product.images[0] ? product.images[0] : "assets/images/placeholder.jpg";
  div.innerHTML = `
    <img class="product-thumb" src="${img}" loading="lazy" alt="${product.title}" />
    <div>
      <div class="product-title">${product.title}</div>
      <div class="seller small muted">${product.seller} • ${product.location}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <div class="price">${fmtPrice(product.price, product.currency)}</div>
        <a class="btn" href="product.html?id=${encodeURIComponent(product.id)}">View</a>
      </div>
    </div>
  `;
  return div;
}

/* ---------- Home Page Render ---------- */
function renderHomeProducts() {
  const container = qs("#home-products");
  if (!container) return;
  const sample = PRODUCTS.slice(0, 6);
  container.innerHTML = "";
  sample.forEach(p => container.appendChild(createProductCard(p)));
}

/* ---------- Products Page Render (with search/filter/pagination) ---------- */
function getUniqueCategories() {
  const cats = new Set(PRODUCTS.map(p => p.category || "Other"));
  return Array.from(cats);
}

function renderProductsPage() {
  const grid = qs("#products-grid");
  if (!grid) return;
  const searchInput = qs("#search-products");
  const filterSelect = qs("#filter-category");
  const sortSelect = qs("#sort-by");
  const pagination = qs("#pagination");

  // populate categories
  if (filterSelect) {
    filterSelect.innerHTML = `<option value="">All categories</option>` + getUniqueCategories().map(c => `<option value="${c}">${c}</option>`).join("");
  }

  let filtered = PRODUCTS.slice();

  // state in closure
  let currentPage = 1;
  function applyFiltersAndRender() {
    const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const cat = filterSelect ? filterSelect.value : "";
    const sort = sortSelect ? sortSelect.value : "new";

    filtered = PRODUCTS.filter(p => {
      if (cat && p.category !== cat) return false;
      if (!q) return true;
      return (p.title + " " + (p.description||"") + " " + p.seller + " " + p.location).toLowerCase().includes(q);
    });

    // sort
    if (sort === "price-asc") filtered.sort((a,b)=>a.price-b.price);
    else if (sort === "price-desc") filtered.sort((a,b)=>b.price-a.price);
    else filtered.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    // pagination
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    currentPage = Math.min(currentPage, pages);

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

    grid.innerHTML = "";
    if (pageItems.length === 0) {
      grid.innerHTML = `<div class="muted">No items found.</div>`;
    } else {
      pageItems.forEach(p => grid.appendChild(createProductCard(p)));
    }

    // render pagination
    pagination.innerHTML = "";
    if (pages > 1) {
      for (let i = 1; i <= pages; i++) {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = i;
        if (i === currentPage) btn.style.fontWeight = "800";
        btn.onclick = () => { currentPage = i; applyFiltersAndRender(); };
        pagination.appendChild(btn);
      }
    }
  }

  if (searchInput) searchInput.addEventListener("input", ()=> { currentPage = 1; applyFiltersAndRender(); });
  if (filterSelect) filterSelect.addEventListener("change", ()=> { currentPage = 1; applyFiltersAndRender(); });
  if (sortSelect) sortSelect.addEventListener("change", ()=> { currentPage = 1; applyFiltersAndRender(); });

  applyFiltersAndRender();
}

/* ---------- Product Detail Page ---------- */
function renderProductDetail() {
  const container = qs("#product-detail");
  if (!container) return;
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  const product = PRODUCTS.find(p => String(p.id) === String(id));
  if (!product) {
    container.innerHTML = `<div class="card"><h2>Product not found</h2><p class="muted">Try browsing other items.</p><a class="btn" href="products.html">Browse</a></div>`;
    return;
  }

  const img = product.images && product.images[0] ? product.images[0] : "assets/images/placeholder.jpg";
  container.innerHTML = `
    <div class="gallery card">
      <img src="${img}" alt="${product.title}">
    </div>
    <div class="product-meta card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <div class="badge">${product.category}</div>
          <h1>${product.title}</h1>
          <div class="seller small muted">Seller: ${product.seller} • ${product.location}</div>
        </div>
        <div style="text-align:right">
          <div class="price" style="font-size:22px">${fmtPrice(product.price, product.currency)}</div>
          <div class="muted small">Posted: ${new Date(product.createdAt).toLocaleDateString()}</div>
          <div style="margin-top:12px">
            <a class="btn btn-primary" href="mailto:${CONTACT_EMAIL}?subject=Interested in ${encodeURIComponent(product.title)}">Contact Seller</a>
            <a class="btn" href="products.html">Back</a>
          </div>
        </div>
      </div>

      <hr style="margin:14px 0">
      <h3>Description</h3>
      <p class="muted">${product.description || "No description provided."}</p>
    </div>
  `;
}

/* ---------- Sell Page ---------- */
function initSellForm() {
  const form = qs("#sell-form");
  if (!form) return;
  const preview = qs("#sell-preview");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const item = {
      id: "tmp-" + Date.now(),
      title: fd.get("title"),
      category: fd.get("category"),
      price: Number(fd.get("price") || 0),
      description: fd.get("description"),
      images: []
    };
    // preview view
    preview.innerHTML = `<div class="card"><h3>Preview</h3>
      <div style="display:flex;gap:12px;">
        <div style="width:140px;height:120px;background:#f1f5f9;border-radius:8px;display:grid;place-items:center">Image</div>
        <div>
          <div style="font-weight:700">${item.title}</div>
          <div class="muted small">${item.category} • ${fmtPrice(item.price)}</div>
          <div style="margin-top:8px" class="muted">${item.description}</div>
          <div style="margin-top:12px"><em class="muted">This preview is local only — wire up a server to persist listings.</em></div>
        </div>
      </div>
    </div>`;
  });
}

/* ---------- Login Form ---------- */
function initLogin() {
  const login = qs("#login-form");
  if (!login) return;
  login.addEventListener("submit", (e) => {
    e.preventDefault();
    // just a stub: show success toast
    alert("Login stub — integrate with real authentication.");
  });
}

/* ---------- Simple home search hook ---------- */
function initHomeSearch() {
  const s = qs("#search-home");
  if (!s) return;
  s.addEventListener("input", () => {
    const q = encodeURIComponent(s.value.trim());
    if (q.length === 0) return;
    location.href = `products.html?q=${q}`;
  });
}

/* ---------- Page router (very simple) ---------- */
function initPage() {
  renderHeader();
  renderFooter();

  // set site name in titles and hero
  const titleEls = qsa(".brand .title");
  titleEls.forEach(el => el.textContent = SITE_NAME);
  const heroTitle = qs("#hero-title");
  if (heroTitle) heroTitle.innerHTML = `<span style="color:var(--accent)">${SITE_NAME}</span> — Buy & Sell locally`;

  // Home
  if (qs("#home-products")) {
    renderHomeProducts();
    initHomeSearch();
  }

  // Products page
  if (qs("#products-grid")) {
    // If URL has q param, set search input
    const url = new URL(location.href);
    const q = url.searchParams.get("q") || "";
    const searchInput = qs("#search-products");
    if (q && searchInput) searchInput.value = decodeURIComponent(q);
    renderProductsPage();
  }

  // Product detail page
  if (qs("#product-detail")) {
    renderProductDetail();
  }

  // Sell page
  initSellForm();

  // Login
  initLogin();
}

/* ---------- Initialize on DOM ready ---------- */
document.addEventListener("DOMContentLoaded", initPage);
