/* Main client-side app for Nepali Bazar
   - Renders header/footer
   - Renders index/home products
   - Renders products page with search/filter/pagination
   - Renders product detail (from ?id=)
   - Handles sell form: image upload, preview, save to localStorage
   - Handles login demo (localStorage)
*/

(function(){

  // helpers
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const fmt = v => (v === null || v === undefined) ? "" : String(v);
  const key = window.LOCAL_STORAGE_KEY || "nb_products_v1";
  const userKey = window.LOCAL_USER_KEY || "nb_user_v1";
  const siteName = window.SITE_NAME || "NEPALI BAZAR";

  // --- basic DOM updates across pages
  function initSiteName() {
    els(".site-name").forEach(n => n.textContent = siteName);
    els(".site-name").forEach(n => { if (n.tagName === "INPUT") n.value = siteName; });
  }

  // --- Product rendering utilities
  function createCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.jpg';
    card.innerHTML = `
      <div class="thumb"><img src="${img}" alt="${escapeHtml(product.title)}" onerror="this.src='assets/images/placeholder.jpg'"/></div>
      <div class="title">${escapeHtml(product.title)}</div>
      <div class="meta"><div class="price">${product.currency || 'Rs.'} ${numberWithCommas(product.price)}</div><div class="muted small">${escapeHtml(product.location)}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <a class="btn" href="product.html?id=${encodeURIComponent(product.id)}">View</a>
        <a class="btn btn-primary" href="mailto:${encodeURIComponent(product.contact)}?subject=Interested in ${encodeURIComponent(product.title)}">Contact</a>
      </div>
    `;
    return card;
  }

  // safe escaping (small)
  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];});
  }

  function numberWithCommas(x){
    try { return Number(x).toLocaleString('en-IN'); } catch(e){ return x; }
  }

  // get product list (from global NB_PRODUCTS)
  function getProducts(){
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.slice().reverse(); // newest first
      }
    } catch(e){}
    if (window.NB_PRODUCTS) return window.NB_PRODUCTS.slice().reverse();
    return [];
  }

  function saveProducts(list){
    try {
      localStorage.setItem(key, JSON.stringify(list.slice().reverse())); // store oldest-first for simplicity
    } catch(e){ console.warn("save failed", e); }
  }

  // --- Index page functions
  function renderHomeGrid(limit = 8){
    const container = el('#home-grid');
    if (!container) return;
    container.innerHTML = '';
    const products = getProducts().slice(0, limit);
    products.forEach(p => container.appendChild(createCard(p)));
  }

  // --- Products page functions
  function renderProductsPage(){
    const grid = el('#products-grid');
    if (!grid) return;
    const searchInput = el('#search-products');
    const categoryFilter = el('#category-filter');
    const sortSelect = el('#sort-products');
    const paginationEl = el('#products-pagination');

    // populate categories
    const allProducts = getProducts();
    const cats = Array.from(new Set(allProducts.map(p=>p.category || 'Other')));
    if (categoryFilter) {
      categoryFilter.innerHTML = `<option value="">All categories</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }

    // state
    let page = 1;
    const perPage = window.ITEMS_PER_PAGE || 12;

    function apply(){
      let list = getProducts();
      const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const cat = categoryFilter ? categoryFilter.value : '';
      const sort = sortSelect ? sortSelect.value : 'new';

      list = list.filter(p => {
        if (cat && p.category !== cat) return false;
        if (!q) return true;
        return ((p.title||'') + ' ' + (p.description||'') + ' ' + (p.seller||'') + ' ' + (p.location||'')).toLowerCase().includes(q);
      });

      if (sort === 'price-asc') list.sort((a,b)=> a.price - b.price);
      else if (sort === 'price-desc') list.sort((a,b)=> b.price - a.price);
      else list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

      const total = list.length;
      const pages = Math.max(1, Math.ceil(total / perPage));
      page = Math.min(page, pages);
      const start = (page-1)*perPage;
      const pageItems = list.slice(start, start + perPage);

      grid.innerHTML = '';
      if (pageItems.length === 0) {
        grid.innerHTML = `<div class="muted">No listings found.</div>`;
      } else {
        pageItems.forEach(p => grid.appendChild(createCard(p)));
      }

      // pagination simple
      if (paginationEl) {
        paginationEl.innerHTML = '';
        for (let i=1;i<=pages;i++){
          const b = document.createElement('button');
          b.className = 'btn';
          if (i===page) b.style.fontWeight='800';
          b.textContent = i;
          b.onclick = ()=>{ page = i; apply(); };
          paginationEl.appendChild(b);
        }
      }
    }

    if (searchInput) searchInput.addEventListener('input', ()=> { page=1; apply(); });
    if (categoryFilter) categoryFilter.addEventListener('change', ()=> { page=1; apply(); });
    if (sortSelect) sortSelect.addEventListener('change', ()=> { page=1; apply(); });

    apply();
  }

  // --- Product detail
  function renderProductDetail(){
    const container = el('#product-detail');
    if (!container) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id){ container.innerHTML = `<div class="card"><h3>No product selected</h3></div>`; return; }
    const product = getProducts().find(p => String(p.id) === String(id));
    if (!product){ container.innerHTML = `<div class="card"><h3>Product not found</h3></div>`; return; }

    const imgMain = (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.jpg';
    const thumbsHtml = (product.images || []).map((src,idx) => `<img src="${src}" data-idx="${idx}" alt="thumb" onerror="this.style.display='none'"/>`).join('');

    container.innerHTML = `
      <div class="gallery">
        <img id="main-product-img" class="main-img" src="${imgMain}" alt="${escapeHtml(product.title)}" onerror="this.src='assets/images/placeholder.jpg'"/>
        <div class="thumbs">${thumbsHtml}</div>
      </div>
      <div class="details">
        <h1>${escapeHtml(product.title)}</h1>
        <div class="price">${product.currency || 'Rs.'} ${numberWithCommas(product.price)}</div>
        <div class="muted small">Posted: ${new Date(product.createdAt).toLocaleDateString()}</div>
        <div style="margin-top:12px">
          <strong>Location:</strong> ${escapeHtml(product.location)}<br>
          <strong>Seller:</strong> ${escapeHtml(product.seller)}<br>
          <strong>Contact:</strong> <a class="link" href="mailto:${encodeURIComponent(product.contact)}?subject=Interested%20in%20${encodeURIComponent(product.title)}">${escapeHtml(product.contact)}</a>
        </div>

        <hr style="margin:12px 0;opacity:0.06">
        <h3>Description</h3>
        <p class="muted">${escapeHtml(product.description)}</p>
      </div>
    `;

    // thumb click
    const thumbs = container.querySelectorAll('.thumbs img');
    const main = el('#main-product-img');
    thumbs.forEach(t => {
      t.addEventListener('click', ()=> {
        main.src = t.src;
        thumbs.forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
      });
    });
  }

  // --- Sell form handling (image previews + localStorage save)
  function initSellForm(){
    const form = el('#sell-form');
    if (!form) return;
    // provinces & cities for Nepal
    const NB_PROVINCES = {
      'Bagmati': ['Kathmandu','Lalitpur','Bhaktapur'],
      'Province No. 1': ['Biratnagar','Dharan'],
      'Gandaki': ['Pokhara'],
      'Lumbini': ['Butwal'],
      'Karnali': ['Jumla'],
      'Sudurpashchim': ['Dhangadhi']
    };
    // populate selects if present
    const provEl = el('#province'); const cityEl = el('#city');
    if(provEl){ provEl.innerHTML = '<option value="">Select Province</option>' + Object.keys(NB_PROVINCES).map(p=>`<option value="${p}">${p}</option>`).join(''); provEl.addEventListener('change', ()=>{ const list = NB_PROVINCES[provEl.value] || []; cityEl.innerHTML = '<option value="">Select City</option>' + list.map(c=>`<option value="${c}">${c}</option>`).join(''); }); }

    const inputImages = el('#image-input');
    const preview = el('#image-preview');
    const msg = el('#sell-msg');

    // show existing logged in user name in seller? simple local user
    const localUser = (()=>{ try { return JSON.parse(localStorage.getItem(userKey)) || null; } catch(e){ return null; } })();
    if (localUser && form.querySelector('[name="seller"]')) form.querySelector('[name="seller"]').value = localUser.username;

    let filesData = [];

    inputImages.addEventListener('change', (ev)=>{
      preview.innerHTML = '';
      filesData = [];
      const files = Array.from(ev.target.files).slice(0,6);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e)=>{
          const dataUrl = e.target.result;
          filesData.push(dataUrl);
          const img = document.createElement('img');
          img.src = dataUrl;
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    });

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const fd = new FormData(form);
      const title = (fd.get('title') || '').trim();
      const priceRaw = Number(fd.get('price') || 0);
      const price = isNaN(priceRaw) ? 0 : priceRaw;
      const category = fd.get('category') || 'Other';
      const province = fd.get('province') || '';
      const city = fd.get('city') || '';
      const location = (province ? province : '') + (city ? (' - '+city) : '');
      const contact = (fd.get('contact') || '').trim();
      const description = fd.get('description') || '';
      const seller = (localUser && localUser.username) ? localUser.username : (fd.get('seller') || 'Anonymous');

      if (!title || !contact) { msg.textContent = "Please add a title and contact details."; return; }

      // Phone validation: if phone provided (all digits) must be exactly 10 digits when it's numeric
      const digitsOnly = /^\d{10}$/.test(contact);
      const emailLike = /@/.test(contact);
      if(!digitsOnly && !emailLike){ msg.textContent = 'Contact must be 10-digit phone or a valid email.'; return; }
      if(digitsOnly && !/^[0-9]{10}$/.test(contact)){ msg.textContent = 'Phone must be exactly 10 digits.'; return; }

      // Price rules
      const MAX = 100000000; // 100,000,000 cap
      if(price < 0){ msg.textContent = 'Price cannot be negative.'; return; }
      if(price > MAX){ msg.textContent = 'Price cannot exceed ' + MAX; return; }

      // create product
      const id = 'p-' + Date.now();
      const newProduct = {
        id, title, price, currency: 'Rs.', category, location, seller, contact, description,
        images: filesData.length ? filesData : ['assets/images/placeholder.jpg'],
        createdAt: new Date().toISOString()
      };

      const list = getProducts().slice();
      list.push(newProduct);
      saveProducts(list.slice().reverse()); // save preserve order
      msg.textContent = "Listing published! Redirecting to products...";
      setTimeout(()=>{ window.location.href = "products.html"; }, 900);
    });
  }

  // --- Login demo
  function initLogin(){
    const form = el('#login-form');
    if (!form) return;
    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const fd = new FormData(form);
      const username = fd.get('username').trim();
      const email = fd.get('email').trim();
      if (!username || !email) return alert('Please fill both fields.');
      try {
        localStorage.setItem(userKey, JSON.stringify({ username, email, at: Date.now() }));
        alert('Signed in as ' + username + '. You will be auto-filled as seller on sell page.');
        window.location.href = 'sell.html';
      } catch(e){ alert('Failed to sign in.'); }
    });
  }

  // --- Simple search from header
  function initGlobalSearch(){
    const s = el('#global-search') || el('#global-search-top') || el('#global-search-product') || el('#global-search-sell');
    if (!s) return;
    s.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = s.value.trim();
        if (!q) return;
        // go to products page with query param
        const url = new URL(window.location.href);
        url.pathname = '/products.html';
        url.searchParams.set('q', q);
        window.location.href = url.pathname + '?q=' + encodeURIComponent(q);
      }
    });
  }

  // --- Products: support query param q
  function prefillSearchFromQuery(){
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q') || '';
    if (!q) return;
    const searchEl = el('#search-products') || el('#search-products-top') || el('#search-products-global');
    if (searchEl) searchEl.value = q;
  }

  // --- index page: load more button
  function initLoadMore(){
    const btn = el('#load-more-btn');
    if (!btn) return;
    let limit = 8;
    btn.addEventListener('click', ()=>{
      limit += 8;
      renderHomeGrid(limit);
    });
  }

  // --- product-data updates: expose a global re-render function if needed
  window.NB_RERENDER = function(){
    renderHomeGrid();
    renderProductsPage();
    renderProductDetail();
  };

  // --- Utilities used in above
  function numberShort(n){
    if (n > 999) return (n/1000).toFixed(1) + 'k';
    return String(n);
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', ()=> {
    initSiteName();
    // run appropriate page initializers
    renderHomeGrid();
    renderProductsPage();
    renderProductDetail();
    initSellForm();
    initLogin();
    initGlobalSearch();
    prefillSearchFromQuery();
    initLoadMore();
  });

})();
