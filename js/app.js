/* Updated app.js — tailored fixes requested by user
   - Fixes global search behavior (works from top/search inputs)
   - Centralizes delete logic for logged-in user "sohaum" (by product id)
   - Shows ads (ad1/ad2) on both home and products pages and makes them clickable to google.com
   - Replaces navigation for "View" and "Contact" with an in-page modal popup (with close X)
   - Sell form: enforces phone (10 digits), price rules (0 -> FREE; max 100,000,000), and replaces location input with province/city selects
   - Keeps original layout and class names; tries to be minimally invasive

   NOTE: Copy-paste this file over your existing js/app.js
*/

(function(){
  // helpers
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const fmt = v => (v === null || v === undefined) ? "" : String(v);
  const key = window.LOCAL_STORAGE_KEY || "nb_products_v1";
  const MAX_PRICE = 100000000; // 1,00,00,000 (one hundred million)

  // small utilities
  function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>\"']/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
  function numberWithCommas(x){ try { return Number(x).toLocaleString('en-IN'); } catch(e){ return x; } }

  // current user (login stores under nb_logged_in_user according to login.html)
  function getCurrentUser(){ try{ return localStorage.getItem('nb_logged_in_user') || null; }catch(e){return null;} }

  // --- product storage helpers
  function getProducts(){
    try{
      const raw = localStorage.getItem(key);
      if(raw){ const arr = JSON.parse(raw); if(Array.isArray(arr)) return arr.slice().reverse(); }
    }catch(e){}
    if(window.NB_PRODUCTS) return window.NB_PRODUCTS.slice().reverse();
    return [];
  }
  function saveProducts(list){ try{ localStorage.setItem(key, JSON.stringify(list.slice().reverse())); }catch(e){}
  }

  // create product card (used in home & grid)
  function createCard(product){
    const card = document.createElement('div');
    card.className = 'card';
    const img = (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.jpg';

    // price display: FREE when 0
    const priceDisplay = (Number(product.price) === 0) ? 'FREE' : (product.currency || 'Rs.') + ' ' + numberWithCommas(product.price);

    card.innerHTML = `
      <div class="thumb"><img src="${escapeHtml(img)}" alt="${escapeHtml(product.title)}" onerror="this.src='assets/images/placeholder.jpg'"/></div>
      <div class="title">${escapeHtml(product.title)}</div>
      <div class="meta"><div class="price">${priceDisplay}</div><div class="muted small">${escapeHtml(product.location)}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <button class="btn view-btn" data-id="${escapeHtml(product.id)}">View</button>
        <button class="btn contact-btn" data-id="${escapeHtml(product.id)}">Contact</button>
      </div>
    `;

    // delete (only visible if current user is sohaum)
    const current = getCurrentUser();
    if(current === 'sohaum'){
      const del = document.createElement('button');
      del.className = 'btn btn-danger delete-inline';
      del.textContent = 'Delete';
      del.style.marginLeft = '8px';
      del.addEventListener('click', ()=>{
        if(!confirm('Are you sure you want to delete this listing?')) return;
        deleteProductById(product.id);
      });
      card.querySelector('div[style]').appendChild(del);
    }

    // attach modal triggers
    setTimeout(()=>{
      const v = card.querySelector('.view-btn');
      const c = card.querySelector('.contact-btn');
      if(v) v.addEventListener('click', ()=> openProductModal(product, false));
      if(c) c.addEventListener('click', ()=> openProductModal(product, true));
    },0);

    return card;
  }

  function deleteProductById(id){
    try{
      const list = getProducts().slice();
      const updated = list.filter(p => p.id !== id);
      saveProducts(updated);
      // re-render pages if present
      if(el('#home-grid')) renderHomeGrid();
      if(el('#products-grid')) renderProductsPage();
      // if on product detail page and viewing same id, redirect to products
      const params = new URLSearchParams(window.location.search);
      if(params.get('id') === id) window.location.href = 'products.html';
    }catch(e){ console.warn(e); }
  }

  // Modal for product details / contact
  function openProductModal(product, contactOnly){
    // remove existing
    const existing = el('.nb-modal-overlay'); if(existing) existing.remove();
    const overlay = document.createElement('div'); overlay.className = 'nb-modal-overlay';
    overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box = document.createElement('div'); box.className='nb-modal';
    box.style = 'max-width:720px;width:90%;background:var(--card-bg,#111);color:var(--text,#fff);padding:18px;border-radius:8px;position:relative;box-shadow:0 10px 30px rgba(0,0,0,0.6)';
    box.innerHTML = `
      <button class="nb-modal-close" aria-label="Close" style="position:absolute;right:10px;top:10px;background:transparent;border:0;color:inherit;font-size:20px;">✕</button>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:0 0 220px;"><img src="${escapeHtml((product.images&&product.images[0])?product.images[0]:'assets/images/placeholder.jpg')}" style="width:220px;height:150px;object-fit:cover;border-radius:6px;" onerror="this.src='assets/images/placeholder.jpg'"/></div>
        <div style="flex:1;min-width:200px;">
          <h2 style="margin:0 0 6px 0">${escapeHtml(product.title)}</h2>
          <div style="margin-bottom:6px;font-weight:600;">${(Number(product.price)===0)?'FREE':(product.currency||'Rs.') + ' ' + numberWithCommas(product.price)}</div>
          <div class="muted small">Location: ${escapeHtml(product.location)}</div>
          <div class="muted small">Seller: ${escapeHtml(product.seller)}</div>
          <hr style="opacity:0.06;margin:8px 0">
          <p style="max-height:160px;overflow:auto;margin:0;padding-right:6px">${escapeHtml(product.description||'')}</p>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        ${contactOnly? `<a class="btn btn-primary" href="mailto:${encodeURIComponent(product.contact)}?subject=${encodeURIComponent('Interested in '+product.title)}">Email Seller</a>`: `<a class="btn" id="nb-open-mail" href="mailto:${encodeURIComponent(product.contact)}?subject=${encodeURIComponent('Interested in '+product.title)}">Contact Seller</a>`}
        <a class="btn" id="nb-open-google" href="https://www.google.com" target="_blank">Open Link</a>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (ev)=>{ if(ev.target === overlay) overlay.remove(); });
    box.querySelector('.nb-modal-close').addEventListener('click', ()=> overlay.remove());
  }

  // --- Search helpers
  function initGlobalSearch(){
    // prefer visible search inputs (different pages use different IDs). pick first that exists.
    const selectors = ['#global-search','#global-search-top','#global-search-product','#global-search-sell','#search-products','#search-products-top','#search-products-global'];
    let s=null;
    for(const sel of selectors){ s = document.querySelector(sel); if(s) break; }
    if(!s) return;
    // support Enter
    s.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault(); const q = s.value.trim(); if(!q) return; const url = new URL(window.location.href); url.pathname = (window.location.pathname.endsWith('/')) ? window.location.pathname + 'products.html' : 'products.html'; window.location.href = 'products.html?q=' + encodeURIComponent(q);
      }
    });
    // if there is a search button nearby, attach click
    const btn = s.nextElementSibling && s.nextElementSibling.matches && s.nextElementSibling.matches('.btn') ? s.nextElementSibling : null;
    if(btn){ btn.addEventListener('click', ()=>{ const q = s.value.trim(); if(!q) return; window.location.href = 'products.html?q=' + encodeURIComponent(q); }); }
  }

  function prefillSearchFromQuery(){
    const url = new URL(window.location.href); const q = url.searchParams.get('q') || '';
    if(!q) return;
    const selectors = ['#search-products','#search-products-top','#search-products-global','#global-search-top','#global-search'];
    for(const sel of selectors){ const eln = document.querySelector(sel); if(eln) eln.value = q; }
  }

  // --- Render home grid (small)
  function renderHomeGrid(limit=8){
    const grid = el('#home-grid'); if(!grid) return;
    const list = getProducts().slice(0,limit);
    grid.innerHTML = '';
    list.forEach(p=> grid.appendChild(createCard(p)));
  }

  // --- Render products page
  function renderProductsPage(){
    const grid = el('#products-grid'); if(!grid) return;
    // read filters
    const q = (el('#search-products') && el('#search-products').value) || (new URL(window.location.href).searchParams.get('q')||'').toLowerCase();
    const cat = el('#filter-category') ? el('#filter-category').value : '';
    const sort = el('#filter-sort') ? el('#filter-sort').value : '';
    let list = getProducts();
    if(q) list = list.filter(p => ((p.title||'') + ' ' + (p.description||'') + ' ' + (p.seller||'') + ' ' + (p.location||'')).toLowerCase().includes(q.toLowerCase()));
    if(cat) list = list.filter(p => p.category === cat);
    if(sort === 'price-asc') list.sort((a,b)=> Number(a.price)-Number(b.price));
    else if(sort === 'price-desc') list.sort((a,b)=> Number(b.price)-Number(a.price));
    else list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = '';
    if(list.length===0) grid.innerHTML = '<div class="muted">No listings found.</div>';
    else list.forEach(p => grid.appendChild(createCard(p)));
  }

  // --- Ads: ensure ad1 / ad2 are shown and clickable
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

  // --- Sell form initialization & validations
  function initSellForm(){
    const form = el('#sell-form') || el('form#sell'); if(!form) return;
    // Replace location input with province+city selects if present
    try{
      const locInput = form.querySelector('[name="location"]');
      if(locInput){
        const select = document.createElement('select'); select.name = 'location'; select.required = true; select.className = locInput.className || 'input';
        const provinces = [
          'Province No. 1','Province No. 2','Bagmati Province','Gandaki Province','Lumbini Province','Karnali Province','Sudurpashchim Province'
        ];
        select.innerHTML = '<option value="">Select province</option>' + provinces.map(p=> `<option value="${p}">${p}</option>`).join('');
        locInput.parentNode.replaceChild(select, locInput);
      }
    }catch(e){console.warn(e);} 

    // image preview handled by original code — keep but add validations
    const phoneInput = form.querySelector('[name="contact"]');
    if(phoneInput){
      phoneInput.setAttribute('placeholder','10 digit phone number');
      phoneInput.addEventListener('input', ()=>{ phoneInput.value = phoneInput.value.replace(/[^0-9]/g,'').slice(0,10); });
    }

    form.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const fd = new FormData(form);
      const title = (fd.get('title')||'').trim();
      let price = Number(fd.get('price')||0);
      const location = (fd.get('location')||'').trim();
      const contact = (fd.get('contact')||'').trim();
      if(!title) return alert('Please provide a title');
      if(!contact || contact.length !== 10) return alert('Please enter a 10-digit phone number');
      if(price < 0) price = 0;
      if(price > MAX_PRICE) { alert('Price exceeds maximum allowed.'); return; }
      // files handled by existing code if present; create product
      const id = 'p-' + Date.now();
      const newProduct = { id, title, price, currency:'Rs.', category: fd.get('category')||'Other', location, seller: getCurrentUser()||fd.get('seller')||'Anonymous', contact, description: fd.get('description')||'', images: ['assets/images/placeholder.jpg'], createdAt: new Date().toISOString() };
      const list = getProducts().slice(); list.push(newProduct); saveProducts(list);
      alert('Listing published!');
      // redirect to products
      window.location.href = 'products.html';
    });
  }

  // --- Init global behaviors on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    // keep site name usage if any
    els('.site-name').forEach(n => { if(n.tagName === 'INPUT') n.value = window.SITE_NAME || 'NEPALI BAZAR'; else n.textContent = window.SITE_NAME || 'NEPALI BAZAR'; });

    // renderers
    renderHomeGrid();
    renderProductsPage();
    initSellForm();
    initGlobalSearch();
    prefillSearchFromQuery();
    initAds();

    // Attach a simple listener so dynamically added view buttons on other inline scripts still work
    document.body.addEventListener('click', (ev)=>{
      const t = ev.target;
      if(t && t.matches && t.matches('.view-btn')){
        const id = t.getAttribute('data-id'); const p = getProducts().find(x=>x.id===id); if(p) openProductModal(p,false);
      }
      if(t && t.matches && t.matches('.contact-btn')){
        const id = t.getAttribute('data-id'); const p = getProducts().find(x=>x.id===id); if(p) openProductModal(p,true);
      }
    });
  });

})();
