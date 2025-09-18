
/* Updated app.js for Nepali Bazar
 - Fixed search, delete (only for user 'sohaum'), filter by product id
 - Modal for View/Contact
 - Ads clickable and appear on index & products pages
 - Sell form validation (province, city, price limits, 10-digit phone)
 - Simplified and cleaned code for clarity (grade-3 friendly)
*/

(function(){
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));

  const key = window.LOCAL_STORAGE_KEY || 'nb_products_v1';
  const userKey = window.LOCAL_USER_KEY || 'nb_user_v1';
  const ads = window.ADS || [];
  const ITEMS_PER_PAGE = window.ITEMS_PER_PAGE || 12;

  // ---------- Site name init ----------
  function initSiteName(){
    els('.site-name').forEach(n => n.textContent = window.SITE_NAME || 'NEPALI BAZAR');
  }

  // ---------- Simple login demo ----------
  function getCurrentUser(){
    try{ return JSON.parse(localStorage.getItem(userKey)) || null; }catch(e){return null}
  }
  function setCurrentUser(u){ localStorage.setItem(userKey, JSON.stringify(u)); renderAuth(); }
  function logout(){ localStorage.removeItem(userKey); renderAuth(); }

  function renderAuth(){
    const user = getCurrentUser();
    els('.auth-area').forEach(node => {
      if(!node) return;
      node.innerHTML = user ? (`<span>Hi, ${user.username}</span> <button id="nb-logout">Logout</button>`) : (`<input id="nb-username" placeholder="username"> <button id="nb-login">Login</button>`);
    });
    const btn = el('#nb-login'); if(btn) btn.addEventListener('click', ()=>{ const v=el('#nb-username').value.trim(); if(v) setCurrentUser({username:v}); });
    const lbtn = el('#nb-logout'); if(lbtn) lbtn.addEventListener('click', logout);
  }

  // ---------- Products helpers (localStorage) ----------
  function loadProducts(){ try{ return JSON.parse(localStorage.getItem(key)) || window.NB_PRODUCTS || []; }catch(e){ return window.NB_PRODUCTS || []; } }
  function saveProducts(products){ try{ localStorage.setItem(key, JSON.stringify(products)); window.NB_PRODUCTS = products; }catch(e){} }
  function findById(id){ const p = loadProducts().filter(x => x.id === id); return p.length ? p[0] : null; }

  function deleteById(id){
    const user = getCurrentUser();
    if(!user || user.username !== 'sohaum'){
      alert('Only user "sohaum" can delete products.');
      return false;
    }
    let products = loadProducts();
    const idx = products.findIndex(p => p.id === id);
    if(idx === -1){ alert('Product not found'); return false; }
    if(!confirm('Delete product "' + products[idx].title + '" ?')) return false;
    products.splice(idx,1);
    saveProducts(products);
    renderProductsPage();
    return true;
  }

  // ---------- Rendering cards (used on index & products) ----------
  function renderCard(p){
    const img = (p.images && p.images[0]) || 'assets/images/placeholder.png';
    const priceText = (p.price === 0) ? 'FREE' : (p.currency||'Rs.') + ' ' + numberWithCommas(p.price);
    return `
      <div class="card" data-id="${p.id}">
        <img src="${img}" alt="${escapeHtml(p.title)}" class="card-img">
        <div class="card-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="price">${priceText}</p>
          <p class="meta">${escapeHtml(p.category)} • ${escapeHtml(p.location)}</p>
          <div class="card-actions">
            <button class="view-btn" data-id="${p.id}">View</button>
            <button class="contact-btn" data-id="${p.id}">Contact</button>
            <button class="delete-btn" data-id="${p.id}">Delete</button>
          </div>
        </div>
      </div>`;
  }

  function numberWithCommas(x){ if(x===null||x===undefined) return ''; return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // ---------- Ads render (index + products) ----------
  function renderAds(containerSelector){ const container = el(containerSelector); if(!container) return; container.innerHTML = ads.map((a,i)=>`<a class="ad-link" href="https://www.google.com" target="_blank"><img src="${a}" alt="ad-${i}" class="ad-img"></a>`).join(''); }

  // ---------- Modal ----------
  function showModal(html){ let modal = el('#nb-modal');
    if(!modal){ modal = document.createElement('div'); modal.id='nb-modal'; modal.className='nb-modal'; document.body.appendChild(modal); }
    modal.innerHTML = `<div class="nb-modal-content"><button class="nb-modal-close">X</button>${html}</div>`;
    modal.style.display='flex';
    el('.nb-modal-close').addEventListener('click', ()=>{ modal.style.display='none'; });
  }

  // ---------- Product view / contact ----------
  function showProductView(id){ const p = findById(id); if(!p) return alert('Product not found');
    const priceText = (p.price===0)?'FREE':(p.currency||'Rs.')+' '+numberWithCommas(p.price);
    const html = `
      <h2>${escapeHtml(p.title)}</h2>
      <p><strong>Price:</strong> ${priceText}</p>
      <p><strong>Category:</strong> ${escapeHtml(p.category)}</p>
      <p><strong>Location:</strong> ${escapeHtml(p.location)}</p>
      <p><strong>Description:</strong> ${escapeHtml(p.description)}</p>
      <p><strong>Seller:</strong> ${escapeHtml(p.seller)} • ${escapeHtml(p.contact)}</p>
    `;
    showModal(html);
  }

  function showContact(id){ const p = findById(id); if(!p) return alert('Product not found');
    const html = `
      <h3>Contact Seller: ${escapeHtml(p.seller)}</h3>
      <p>Phone: ${escapeHtml(p.contact)}</p>
      <p>Email: ${escapeHtml(window.CONTACT_EMAIL || '')}</p>
    `;
    showModal(html);
  }

  // ---------- Product listing page render (with search and filters) ----------
  function renderProductsPage(){
    const container = el('#products-list'); if(!container) return;
    let products = loadProducts();

    // apply search
    const q = (el('#top-search') && el('#top-search').value.trim().toLowerCase()) || '';
    if(q){ products = products.filter(p => (p.title||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q) || (p.id||'').toLowerCase()===q ); }

    // apply category filter
    const cat = (el('#filter-category') && el('#filter-category').value) || '';
    if(cat) products = products.filter(p => p.category === cat);

    // apply sort
    const sort = (el('#sort-by') && el('#sort-by').value) || '';
    if(sort === 'price-asc') products.sort((a,b)=>a.price-b.price);
    if(sort === 'price-desc') products.sort((a,b)=>b.price-a.price);

    // render
    container.innerHTML = products.map(renderCard).join('') || '<p>No products found.</p>';

    // attach events
    els('.view-btn').forEach(b => b.addEventListener('click', e => showProductView(e.target.dataset.id)));
    els('.contact-btn').forEach(b => b.addEventListener('click', e => showContact(e.target.dataset.id)));
    els('.delete-btn').forEach(b => b.addEventListener('click', e => deleteById(e.target.dataset.id)));
  }

  // ---------- Index page quick render (few items) ----------
  function renderIndex(){ const container = el('#home-list'); if(!container) return; const products = loadProducts().slice(0,6); container.innerHTML = products.map(renderCard).join('');
    els('.view-btn').forEach(b => b.addEventListener('click', e => showProductView(e.target.dataset.id)));
    els('.contact-btn').forEach(b => b.addEventListener('click', e => showContact(e.target.dataset.id)));
    els('.delete-btn').forEach(b => b.addEventListener('click', e => deleteById(e.target.dataset.id)));
  }

  // ---------- Sell form handling ----------
  function initSellForm(){ const form = el('#sell-form'); if(!form) return;
    // provinces & city sample
    const provinces = {
      'Bagmati': ['Kathmandu','Lalitpur','Bhaktapur'],
      'Province No. 1': ['Biratnagar','Dharan'],
      'Gandaki': ['Pokhara']
    };
    const provSel = el('#province'); const citySel = el('#city');
    if(provSel){
      provSel.innerHTML = '<option value="">Select Province</option>' + Object.keys(provinces).map(p => `<option value="${p}">${p}</option>`).join('');
      provSel.addEventListener('change', ()=>{
        const c = provinces[provSel.value]||[]; citySel.innerHTML = '<option value="">Select City</option>' + c.map(ci=>`<option value="${ci}">${ci}</option>`).join('');
      });
    }

    if(form){
      form.addEventListener('submit', (ev)=>{
        ev.preventDefault();
        const data = {
          title: el('#title').value.trim(),
          price: Number(el('#price').value) || 0,
          category: el('#category').value.trim(),
          location: (el('#province').value || '') + (el('#city').value?(' - '+el('#city').value):''),
          seller: el('#seller').value.trim(),
          contact: el('#contact').value.trim(),
          description: el('#description').value.trim(),
          images: []
        };
        // validations
        if(!data.title){ alert('Title is required'); return; }
        if(data.price < 0){ alert('Price cannot be negative'); return; }
        if(data.price === 0) data.price = 0; // FREE handled in render
        const MAX = 100000000; // 100,000,000 cap
        if(data.price > MAX){ alert('Price cannot exceed ' + MAX); return; }
        if(!/^[0-9]{10}$/.test(data.contact)){ alert('Phone number must be exactly 10 digits'); return; }

        // generate id and save
        const newId = window.NB_GENERATE_ID ? window.NB_GENERATE_ID() : ('p-'+Date.now());
        const products = loadProducts();
        products.unshift({ id:newId, createdAt: new Date().toISOString().slice(0,10), ...data });
        saveProducts(products);
        alert('Product listed successfully');
        form.reset();
        // redirect to products if exists
        if(location.pathname.endsWith('sell.html')){
          renderProductsPage();
        }
      });
    }
  }

  // ---------- Utilities ----------
  function bindSearchTop(){ const s = el('#top-search'); if(!s) return; s.addEventListener('input', ()=>{ if(location.pathname.endsWith('products.html')) renderProductsPage(); else renderIndex(); }); }

  // ---------- Init on DOM ready ----------
  document.addEventListener('DOMContentLoaded', ()=>{
    initSiteName(); renderAuth(); renderAds('#ads-home'); renderAds('#ads-products');
    bindSearchTop(); initSellForm();
    if(el('#products-list')) renderProductsPage();
    if(el('#home-list')) renderIndex();
  });

})();
