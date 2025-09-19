/* Full app.js — copy-paste entire file to js/app.js
   Robust version: uses existing #nb-modal if present, populates categories,
   exposes renderHomeGrid and renderProductsPage globally so index.html can call them.
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
    if(typeof window.NB_GET_PRODUCTS === 'function'){
      try { return window.NB_GET_PRODUCTS() || []; } catch(e) { /* fallback */ }
    }
    try {
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    } catch(e){}
    return window.NB_PRODUCTS || [];
  }
  function saveProducts(list){
    if(typeof window.NB_SAVE_PRODUCTS === 'function'){
      try { window.NB_SAVE_PRODUCTS(list); return; } catch(e) {}
    }
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

    // delete only for sohaum
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
      // refresh
      renderHomeGrid();
      renderProductsPage();
    }catch(e){ console.warn(e); }
  }

  // Modal: prefer built-in #nb-modal, else use overlay
  function showModalHtml(html){
    const builtin = el('#nb-modal');
    if(builtin && builtin.querySelector('#nb-modal-body')){
      const body = builtin.querySelector('#nb-modal-body');
      body.innerHTML = html;
      builtin.style.display = 'flex';

      // close handlers
      const closeBtn = builtin.querySelector('.nb-modal-close');
      if(closeBtn) closeBtn.onclick = ()=> { builtin.style.display='none'; body.innerHTML=''; };
      builtin.onclick = (ev)=> { if(ev.target === builtin){ builtin.style.display='none'; body.innerHTML=''; } };
      const esc = (ev)=> { if(ev.key === 'Escape'){ builtin.style.display='none'; body.innerHTML=''; document.removeEventListener('keydown', esc); } };
      document.addEventListener('keydown', esc);
      return;
    }

    // fallback overlay
    const existing = el('.nb-modal-overlay'); if(existing) existing.remove();
    const overlay = document.createElement('div'); overlay.className = 'nb-modal-overlay';
    overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box = document.createElement('div'); box.className = 'nb-modal';
    box.style = 'max-width:720px;width:90%;background:#071027;color:#fff;padding:18px;border-radius:12px;position:relative;border:1px solid rgba(255,255,255,0.06);';
    box.innerHTML = `<button class="nb-modal-close" aria-label="Close" style="position:absolute;right:10px;top:10px;background:transparent;border:0;color:inherit;font-size:20px;">✕</button><div class="nb-modal-body-inner">${html}</div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector('.nb-modal-close').addEventListener('click', ()=> overlay.remove());
    overlay.addEventListener('click', (ev)=> { if(ev.target === overlay) overlay.remove(); });
    const escRemove = (ev)=> { if(ev.key === 'Escape'){ overlay.remove(); document.removeEventListener('keydown', escRemove); } };
    document.addEventListener('keydown', escRemove);
  }

  function openProductModal(product, contactOnly){
    const contactHtml = `
      <h3>Contact Seller</h3>
      <p><strong>Item:</strong> ${escapeHtml(product.title)}</p>
      <p><strong>Phone/Email:</strong> ${escapeHtml(product.contact||'')}</p>
      <div style="margin-top:12px"><a class="btn btn-primary" href="mailto:${encodeURIComponent(product.contact)}?subject=${encodeURIComponent('Interested in '+product.title)}">Email Seller</a></div>
    `;
    const detailsHtml = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:0 0 220px;"><img src="${escapeHtml((product.images&&product.images[0])?product.images[0]:'assets/images/placeholder.jpg')}" style="width:220px;height:150px;object-fit:cover;border-radius:6px;" onerror="this.src='assets/images/placeholder.jpg'"/></div>
        <div style="flex:1;min-width:200px;">
          <h2 style="margin:0 0 6px 0">${escapeHtml(product.title)}</h2>
          <div style="margin-bottom:6px;font-weight:600;">${(Number(product.price)===0)?'FREE':(product.currency||'Rs.') + ' ' + numberWithCommas(product.price)}</div>
          <div class="muted small">Location: ${escapeHtml(product.location||'')}</div>
          <div class="muted small">Seller: ${escapeHtml(product.seller||'')}</div>
          <hr style="opacity:0.06;margin:8px 0">
          <p style="max-height:160px;overflow:auto;margin:0;padding-right:6px">${escapeHtml(product.description||'')}</p>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
            <a class="btn" href="mailto:${encodeURIComponent(product.contact)}?subject=${encodeURIComponent('Interested in '+product.title)}">Contact Seller</a>
            <a class="btn" href="https://www.google.com" target="_blank">Open Link</a>
          </div>
        </div>
      </div>
    `;
    showModalHtml(contactOnly ? contactHtml : detailsHtml);
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

    // attach events via delegation for robustness
    // (we prefer per-card listeners to avoid duplication; ensure we clear previous)
    // but since cards are recreated we can add per-card handlers now:
    grid.querySelectorAll('.view-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=> {
        const id = btn.dataset.id;
        const prod = getProducts().find(x=>x.id === id);
        if(prod) openProductModal(prod, false);
      });
    });
    grid.querySelectorAll('.contact-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=> {
        const id = btn.dataset.id;
        const prod = getProducts().find(x=>x.id === id);
        if(prod) openProductModal(prod, true);
      });
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

    // attach card handlers
    grid.querySelectorAll('.view-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        const id = btn.dataset.id;
        const prod = getProducts().find(x=>x.id === id);
        if(prod) openProductModal(prod, false);
      });
    });
    grid.querySelectorAll('.contact-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        const id = btn.dataset.id;
        const prod = getProducts().find(x=>x.id === id);
        if(prod) openProductModal(prod, true);
      });
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

    // provide province select if page used different elements
    try{
      const provinceEl = form.querySelector('#province');
      if(!provinceEl){
        // nothing to do, sell.html already has province/city in your template
      }
    } catch(e){}

    // phone input enforced digits only
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
    // renderers should be exposed to window so index.html/clicks can call them
    window.renderHomeGrid = renderHomeGrid;
    window.renderProductsPage = renderProductsPage;

    // populate site name
    els('.site-name').forEach(n => { if(n.tagName === 'INPUT') n.value = window.SITE_NAME || 'NEPALI BAZAR'; else n.textContent = window.SITE_NAME || 'NEPALI BAZAR'; });

    // run initializers
    initAds();
    initCategories();
    initGlobalSearch();
    prefillSearchFromQuery();
    initSellForm();

    // render UIs
    renderHomeGrid();
    renderProductsPage();

    // listen for global clicks (fallback) — ensure view/contact buttons open modal even if added by other code
    document.body.addEventListener('click', function(ev){
      const t = ev.target;
      if(!t) return;
      if(t.matches && t.matches('.view-btn')){
        const id = t.getAttribute('data-id');
        const prod = getProducts().find(x => x.id === id);
        if(prod) openProductModal(prod, false);
      }
      if(t.matches && t.matches('.contact-btn')){
        const id = t.getAttribute('data-id');
        const prod = getProducts().find(x => x.id === id);
        if(prod) openProductModal(prod, true);
      }
    });

  });

})();
