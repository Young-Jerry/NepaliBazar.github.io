/* Full app.js — copy-paste entire file to js/app.js
   Updated:
   - Filters (category + price) fixed
   - View/Contact → redirect to product.html?id=xxxx
   - createCard exposed globally for profile.html
   - Delete button only for sohaum (admin)
*/

(function(){
  // helpers
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const key = window.LOCAL_STORAGE_KEY || "nb_products_v1";
  const MAX_PRICE = 100000000;

  function escapeHtml(s){ return s ? String(s).replace(/[&<>\"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]) : ""; }
  function numberWithCommas(x){ try{ return Number(x).toLocaleString('en-IN'); }catch(e){ return x; } }

  function getCurrentUser(){ try{ return localStorage.getItem('nb_logged_in_user') || null; }catch(e){ return null; } }

  // Products fetch/save helpers
  function getProducts(){
    try {
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    } catch(e){}
    return window.NB_PRODUCTS || [];
  }
  function saveProducts(list){
    try { localStorage.setItem(key, JSON.stringify(list)); } catch(e){}
  }

  // create card DOM
  function createCard(product){
    const card = document.createElement('div');
    card.className = 'card';
    const img = product.images && product.images[0] ? product.images[0] : 'assets/images/placeholder.jpg';
    const priceDisplay = (Number(product.price) === 0) ? 'FREE' : (product.currency || 'Rs.') + ' ' + numberWithCommas(product.price);

    card.innerHTML = `
      <div class="thumb"><img src="${escapeHtml(img)}" alt="${escapeHtml(product.title)}" onerror="this.src='assets/images/placeholder.jpg'"/></div>
      <div class="title">${escapeHtml(product.title)}</div>
      <div class="meta"><div class="price">${priceDisplay}</div><div class="muted small">${escapeHtml(product.location||'')}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <button class="btn view-btn" data-id="${escapeHtml(product.id)}">View</button>
        <button class="btn contact-btn" data-id="${escapeHtml(product.id)}">Contact</button>
      </div>
    `;

    // delete button only for admin (sohaum)
    const current = getCurrentUser();
    if(current === 'sohaum'){
      const del = document.createElement('button');
      del.className = 'btn btn-danger delete-inline';
      del.textContent = 'Delete';
      del.style.marginLeft = '8px';
      del.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(!confirm('Are you sure you want to delete this listing?')) return;
        deleteProductById(product.id);
      });
      const actionsDiv = card.querySelector('div[style]');
      if(actionsDiv) actionsDiv.appendChild(del);
    }

    return card;
  }

  function deleteProductById(id){
    try{
      const list = getProducts().slice();
      const updated = list.filter(p => p.id !== id);
      saveProducts(updated);
      if(window.renderHomeGrid) renderHomeGrid();
      if(window.renderProductsPage) renderProductsPage();
    }catch(e){ console.warn(e); }
  }

  // redirect to product page
  function openProductPage(productId){
    window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
  }

  // Search helpers
  function initGlobalSearch(){
    const selectors = ['#global-search','#global-search-top','#global-search-product','#global-search-sell','#search-products','#search-products-top','#search-products-global'];
    let s=null;
    for(const sel of selectors){ s = document.querySelector(sel); if(s) break; }
    if(!s) return;
    s.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault();
        const q = s.value.trim();
        if(!q) return;
        window.location.href = 'products.html?q=' + encodeURIComponent(q);
      }
    });
  }

  function prefillSearchFromQuery(){
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q') || '';
    if(!q) return;
    const selectors = ['#search-products','#search-products-top','#search-products-global','#global-search-top','#global-search'];
    for(const sel of selectors){
      const eln = document.querySelector(sel);
      if(eln) eln.value = q;
    }
  }

  // Render home grid
  function renderHomeGrid(limit = 8){
    const grid = el('#home-grid'); if(!grid) return;
    let list = getProducts().slice();

    // filters on homepage
    const catSel = el('#filter-category');
    const sortSel = el('#filter-sort');
    const catVal = catSel ? catSel.value : '';
    const sortVal = sortSel ? sortSel.value : '';

    if(catVal) list = list.filter(p => p.category === catVal);
    if(sortVal === 'price-asc') list.sort((a,b)=> Number(a.price)-Number(b.price));
    else if(sortVal === 'price-desc') list.sort((a,b)=> Number(b.price)-Number(a.price));
    else list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = '';
    const slice = list.slice(0, limit);
    slice.forEach(p => {
      const card = createCard(p);
      grid.appendChild(card);
    });

    grid.querySelectorAll('.view-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> openProductPage(btn.dataset.id));
    });
    grid.querySelectorAll('.contact-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> openProductPage(btn.dataset.id));
    });
  }

  // Render products page (full grid)
  function renderProductsPage(){
    const grid = el('#products-grid'); if(!grid) return;
    const q = (el('#search-products') && el('#search-products').value) || (new URL(window.location.href).searchParams.get('q')||'').toLowerCase();
    const cat = el('#filter-category') ? el('#filter-category').value : '';
    const sort = el('#filter-sort') ? el('#filter-sort').value : '';
    let list = getProducts().slice();

    if(q) list = list.filter(p => ((p.title||'') + ' ' + (p.description||'') + ' ' + (p.seller||'') + ' ' + (p.location||'')).toLowerCase().includes(q.toLowerCase()));
    if(cat) list = list.filter(p => p.category === cat);
    if(sort === 'price-asc') list.sort((a,b)=> Number(a.price)-Number(b.price));
    else if(sort === 'price-desc') list.sort((a,b)=> Number(b.price)-Number(a.price));
    else list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = '';
    if(list.length === 0){
      grid.innerHTML = '<div class="muted">No listings found.</div>';
      return;
    }
    list.forEach(p => {
      const card = createCard(p);
      grid.appendChild(card);
    });

    grid.querySelectorAll('.view-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> openProductPage(btn.dataset.id));
    });
    grid.querySelectorAll('.contact-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> openProductPage(btn.dataset.id));
    });
  }

  // Ads injection
  function initAds(){
    const adSlots = document.querySelectorAll('.ad-slot');
    if(!adSlots || adSlots.length === 0) return;
    const imgs = ['assets/images/ad1.jpg','assets/images/ad2.jpg'];
    adSlots.forEach((slot, idx)=>{
      const a = document.createElement('a'); a.href = 'https://www.google.com'; a.target = '_blank';
      const img = document.createElement('img'); img.src = imgs[idx % imgs.length]; img.alt = 'ad'; img.style.maxWidth = '100%'; img.style.display='block';
      a.appendChild(img);
      slot.innerHTML = ''; slot.appendChild(a);
    });
  }

  // Sell form init & validation
  function initSellForm(){
    const form = el('#sell-form') || el('form#sell'); if(!form) return;

    const phoneInput = form.querySelector('[name="contact"]');
    if(phoneInput){
      phoneInput.setAttribute('placeholder','10 digit phone number');
      phoneInput.addEventListener('input', ()=> { phoneInput.value = phoneInput.value.replace(/[^0-9]/g,'').slice(0,10); });
    }

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const fd = new FormData(form);
      const title = (fd.get('title')||'').trim();
      let price = Number(fd.get('price')||0);
      const location = (fd.get('location')||fd.get('province')||'').trim();
      const contact = (fd.get('contact')||'').trim();
      if(!title) return alert('Please provide a title');
      const phoneOk = /^\d{10}$/.test(contact);
      const emailOk = (contact.indexOf('@') > -1);
      if(!phoneOk && !emailOk) return alert('Please enter a valid 10-digit phone number or email');
      if(price < 0) price = 0;
      if(price > MAX_PRICE) return alert('Price exceeds maximum allowed.');
      const id = window.NB_GENERATE_ID ? window.NB_GENERATE_ID() : ('p-' + Date.now());
      const newProduct = {
        id,
        title,
        price,
        currency: 'Rs.',
        category: fd.get('category')||'Other',
        location: location || fd.get('city') || '',
        seller: getCurrentUser() || fd.get('seller') || 'Anonymous',
        contact,
        description: fd.get('description') || '',
        images: ['assets/images/placeholder.jpg'],
        createdAt: new Date().toISOString()
      };
      const list = getProducts().slice();
      list.push(newProduct);
      saveProducts(list);
      alert(price === 0 ? 'Listing published as FREE!' : 'Listing published!');
      window.location.href = 'products.html';
    });
  }

  // populate category selects on pages
  function initCategories(){
    const cats = [...new Set(getProducts().map(p=>p.category).filter(Boolean))].sort();
    const selects = document.querySelectorAll('#filter-category');
    selects.forEach(sel=>{
      sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c=> `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    });
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', function(){
    window.renderHomeGrid = renderHomeGrid;
    window.renderProductsPage = renderProductsPage;
    window.createCard = createCard; // expose globally for profile.html

    els('.site-name').forEach(n => { if(n.tagName === 'INPUT') n.value = window.SITE_NAME || 'NEPALI BAZAR'; else n.textContent = window.SITE_NAME || 'NEPALI BAZAR'; });

    initAds();
    initCategories();
    initGlobalSearch();
    prefillSearchFromQuery();
    initSellForm();

    renderHomeGrid();
    renderProductsPage();
  });

})();
