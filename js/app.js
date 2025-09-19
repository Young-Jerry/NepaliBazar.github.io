/* Full app.js — copy-paste entire file to js/app.js
   Implements:
   - working category + price filters (index + products)
   - View / Contact open an in-page modal (final popup) — no mailto links or extra buttons inside the popup (only close X)
   - profile UI integration, profile page rendering
   - per-user delete rules:
       * sohaum = admin (can delete any listing anywhere)
       * normal users (e.g. sneha) can only delete their own listings and only from their profile page
   - injects Profile link into header when logged in
   - ad hover animation (JS fallback) and ad click links
*/

(function () {
  const KEY = window.LOCAL_STORAGE_KEY || 'nb_products_v1';
  const MAX_PRICE = 100000000;

  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const isProfilePage = () => /profile\.html$/i.test(window.location.pathname) || !!el('#profile-page');

  function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]) : ''; }
  function numberWithCommas(x) { try { return Number(x).toLocaleString('en-IN'); } catch (e) { return x; } }
  function getCurrentUser() { try { return localStorage.getItem('nb_logged_in_user') || null; } catch (e) { return null; } }

  // Products helpers
  function getProducts() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    // fallback to any global
    return (window.NB_PRODUCTS && Array.isArray(window.NB_PRODUCTS)) ? window.NB_PRODUCTS.slice() : [];
  }
  function saveProducts(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { console.warn(e); }
  }

  function canDeleteProduct(product) {
    const user = getCurrentUser();
    if (!user) return false;
    if (user === 'sohaum') return true; // admin
    // normal user can delete only own product — allowed only from profile page
    if (product && product.seller === user && isProfilePage()) return true;
    return false;
  }

  // Create a product card. Will only show Delete button if allowed per rules.
  function createCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.jpg';
    const priceDisplay = (Number(product.price) === 0) ? 'FREE' : (product.currency || 'Rs.') + ' ' + numberWithCommas(product.price);

    card.innerHTML = `
      <div class="thumb"><img src="${escapeHtml(img)}" alt="${escapeHtml(product.title)}" onerror="this.src='assets/images/placeholder.jpg'"/></div>
      <div class="title">${escapeHtml(product.title)}</div>
      <div class="meta"><div class="price">${priceDisplay}</div><div class="muted small">${escapeHtml(product.location||'')}</div></div>
      <div class="card-actions" style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <div style="display:flex;gap:8px;">
          <button class="btn view-btn" data-id="${escapeHtml(product.id)}">View</button>
          <button class="btn contact-btn" data-id="${escapeHtml(product.id)}">Contact</button>
        </div>
        <div class="card-right"></div>
      </div>
    `;

    // Delete button: only show when allowed (admin anywhere; normal user only on profile page & their own listings)
    if (canDeleteProduct(product)) {
      const del = document.createElement('button');
      del.className = 'btn btn-danger delete-inline';
      del.textContent = 'Delete';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete listing?')) return;
        deleteProductById(product.id);
      });
      const right = card.querySelector('.card-right');
      if (right) right.appendChild(del);
    }

    // Keep product id on element for delegation convenience
    return card;
  }

  function deleteProductById(id) {
    const list = getProducts();
    const product = list.find(p => p.id === id);
    if (!product) return alert('Listing not found');
    // double-check permissions
    if (!canDeleteProduct(product)) {
      return alert('Not authorized to delete this listing.');
    }
    const updated = list.filter(p => p.id !== id);
    saveProducts(updated);
    // rerender visible pages
    if (el('#home-grid')) renderHomeGrid();
    if (el('#products-grid')) renderProductsPage();
    if (el('#profile-listings')) renderProfilePage();
  }

  // modal (final popup) - no mailto, no external buttons except close
  function showModalHtml(html) {
    // use existing #nb-modal if present
    const builtin = el('#nb-modal');
    if (builtin && builtin.querySelector('#nb-modal-body')) {
      const body = builtin.querySelector('#nb-modal-body');
      body.innerHTML = html;
      builtin.style.display = 'flex';
      // close handlers
      const closeBtn = builtin.querySelector('.nb-modal-close');
      if (closeBtn) closeBtn.onclick = () => { builtin.style.display = 'none'; body.innerHTML = ''; };
      builtin.onclick = (ev) => { if (ev.target === builtin) { builtin.style.display = 'none'; body.innerHTML = ''; } };
      const esc = (ev) => { if (ev.key === 'Escape') { builtin.style.display = 'none'; body.innerHTML = ''; document.removeEventListener('keydown', esc); } };
      document.addEventListener('keydown', esc);
      return;
    }

    // fallback overlay
    const existing = el('.nb-modal-overlay'); if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'nb-modal-overlay';
    overlay.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;';
    const box = document.createElement('div');
    box.className = 'nb-modal';
    box.style = 'max-width:720px;width:90%;background:#071027;color:#fff;padding:18px;border-radius:12px;position:relative;border:1px solid rgba(255,255,255,0.06);';
    box.innerHTML = `<button class="nb-modal-close" aria-label="Close" style="position:absolute;right:10px;top:10px;background:transparent;border:0;color:inherit;font-size:20px;">✕</button><div class="nb-modal-body-inner">${html}</div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector('.nb-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
    const esc = (ev) => { if (ev.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  }

  // product detail content for modal (no buttons)
  function buildProductModalHtml(product) {
    return `
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:0 0 220px;"><img src="${escapeHtml((product.images&&product.images[0])?product.images[0]:'assets/images/placeholder.jpg')}" style="width:220px;height:150px;object-fit:cover;border-radius:6px;" onerror="this.src='assets/images/placeholder.jpg'"/></div>
        <div style="flex:1;min-width:200px;">
          <h2 style="margin:0 0 6px 0">${escapeHtml(product.title)}</h2>
          <div style="margin-bottom:6px;font-weight:600;">${(Number(product.price)===0)?'FREE':(product.currency||'Rs.') + ' ' + numberWithCommas(product.price)}</div>
          <div class="muted small">Location: ${escapeHtml(product.location||'')}</div>
          <div class="muted small">Seller: ${escapeHtml(product.seller||'')}</div>
          <hr style="opacity:0.06;margin:8px 0">
          <p style="max-height:240px;overflow:auto;margin:0;padding-right:6px">${escapeHtml(product.description||'')}</p>
          <p style="margin-top:10px;"><strong>Contact:</strong> ${escapeHtml(product.contact||'')}</p>
          <p style="margin-top:6px;color:var(--muted);font-size:13px">This is an informational popup. Close (✕) to return to the site.</p>
        </div>
      </div>
    `;
  }

  // open modal for view/contact (both same content, contactOnly just focuses but content is identical)
  function openProductModal(product, contactOnly) {
    const html = buildProductModalHtml(product);
    showModalHtml(html);
  }

  // global search init (goes to products.html?q=)
  function initGlobalSearch() {
    const ids = ['#global-search', '#global-search-top', '#global-search-product', '#global-search-sell', '#search-products', '#search-products-top', '#search-products-global'];
    let s = null;
    for (const id of ids) { const eln = document.querySelector(id); if (eln) { s = eln; break; } }
    if (!s) return;
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = s.value.trim();
        if (!q) return;
        window.location.href = 'products.html?q=' + encodeURIComponent(q);
      }
    });
  }

  // Fill search inputs from ?q=
  function prefillSearchFromQuery() {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q') || '';
    if (!q) return;
    const ids = ['#search-products', '#search-products-top', '#search-products-global', '#global-search-top', '#global-search'];
    ids.forEach(id => { const n = document.querySelector(id); if (n) n.value = q; });
  }

  // categories dropdown population and change listeners (both index and products)
  function initCategories() {
    const products = getProducts();
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const selects = document.querySelectorAll('#filter-category');
    selects.forEach(sel => {
      const prev = sel.value || '';
      sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      if (prev) sel.value = prev;
      // attach change to re-render
      sel.addEventListener('change', () => {
        if (el('#home-grid')) renderHomeGrid();
        if (el('#products-grid')) renderProductsPage();
        if (el('#profile-listings')) renderProfilePage();
      });
    });
  }

  // Ads: inject images, add hover animation via JS (so you can paste without editing CSS)
  function initAds() {
    const adSlots = document.querySelectorAll('.ad-slot');
    if (!adSlots || adSlots.length === 0) return;
    const imgs = ['assets/images/ad1.jpg', 'assets/images/ad2.jpg'];
    adSlots.forEach((slot, idx) => {
      const a = document.createElement('a');
      a.href = 'https://www.google.com';
      a.target = '_blank';
      a.rel = 'noopener';
      const img = document.createElement('img');
      img.src = imgs[idx % imgs.length];
      img.alt = 'ad';
      img.style.maxWidth = '100%';
      img.style.display = 'block';
      // hover effects
      img.style.transition = 'transform .18s ease, box-shadow .18s ease';
      a.appendChild(img);
      slot.innerHTML = '';
      slot.appendChild(a);
      // hover via events (works even if CSS missing)
      a.addEventListener('mouseenter', () => { img.style.transform = 'translateY(-6px) scale(1.03)'; img.style.boxShadow = '0 18px 60px rgba(0,0,0,0.6)'; });
      a.addEventListener('mouseleave', () => { img.style.transform = ''; img.style.boxShadow = ''; });
    });
  }

  // SELL form initialization (enforce phone/email, price)
  function initSellForm() {
    const form = el('#sell-form') || el('form#sell');
    if (!form) return;
    const phone = form.querySelector('[name="contact"]');
    if (phone) {
      phone.setAttribute('placeholder', '10 digit phone number or email');
      phone.addEventListener('input', () => {
        // allow digits and @ and dots; but keep length 10 for pure phone
        phone.value = phone.value.replace(/[^\d@.\-_a-zA-Z]/g, '').slice(0, 140);
      });
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const title = (fd.get('title') || '').trim();
      let price = Number(fd.get('price') || 0);
      const location = (fd.get('location') || fd.get('province') || '').trim();
      const contact = (fd.get('contact') || '').trim();
      if (!title) return alert('Please provide a title');
      const phoneOk = /^\d{10}$/.test(contact);
      const emailOk = contact.includes('@');
      if (!phoneOk && !emailOk) return alert('Please enter a 10-digit phone number or an email');
      if (price < 0) price = 0;
      if (price > MAX_PRICE) return alert('Price exceeds maximum allowed.');
      const id = window.NB_GENERATE_ID ? window.NB_GENERATE_ID() : ('p-' + Date.now());
      const newProduct = {
        id,
        title,
        price,
        currency: 'Rs.',
        category: fd.get('category') || 'Other',
        location: location || fd.get('city') || '',
        seller: getCurrentUser() || fd.get('seller') || 'Anonymous',
        contact,
        description: fd.get('description') || '',
        images: ['assets/images/placeholder.jpg'],
        createdAt: new Date().toISOString()
      };
      const list = getProducts();
      list.push(newProduct);
      saveProducts(list);
      alert(price === 0 ? 'Listing published as FREE!' : 'Listing published!');
      window.location.href = 'products.html';
    });
  }

  // HEADER / AUTH UI — inject profile link and update login/userinfo UI
  function initAuthUI() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    // create profile link if not present
    let profileLink = document.getElementById('profile-link');
    if (!profileLink) {
      profileLink = document.createElement('a');
      profileLink.id = 'profile-link';
      profileLink.className = 'nav-link';
      profileLink.href = 'profile.html';
      profileLink.textContent = 'Profile';
      // insert before login-link if exists
      const loginLink = document.getElementById('login-link');
      if (loginLink && loginLink.parentNode) loginLink.parentNode.insertBefore(profileLink, loginLink.nextSibling);
      else nav.appendChild(profileLink);
    }

    // update display
    const loggedUser = getCurrentUser();
    const loginLink = document.getElementById('login-link');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');

    if (loggedUser) {
      if (loginLink) loginLink.style.display = 'none';
      if (userInfo) { userInfo.style.display = 'inline'; if (usernameDisplay) usernameDisplay.textContent = loggedUser; }
      profileLink.style.display = 'inline';
    } else {
      if (loginLink) loginLink.style.display = 'inline';
      if (userInfo) userInfo.style.display = 'none';
      profileLink.style.display = 'none';
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('nb_logged_in_user');
        location.reload();
      });
    }
  }

  // Render home grid (works with homepage filters)
  function renderHomeGrid(limit = 8) {
    const grid = el('#home-grid');
    if (!grid) return;
    let list = getProducts().slice();

    const catSel = el('#filter-category');
    const sortSel = el('#filter-sort');
    const catVal = catSel ? catSel.value : '';
    const sortVal = sortSel ? sortSel.value : '';

    if (catVal) list = list.filter(p => p.category === catVal);
    if (sortVal === 'price-asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortVal === 'price-desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = '';
    const slice = list.slice(0, limit);
    slice.forEach(p => grid.appendChild(createCard(p)));

    // attach events
    grid.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const prod = getProducts().find(x => x.id === id);
      if (prod) openProductModal(prod, false);
    }));
    grid.querySelectorAll('.contact-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const prod = getProducts().find(x => x.id === id);
      if (prod) openProductModal(prod, true);
    }));
  }

  // Render products page (full listing)
  function renderProductsPage() {
    const grid = el('#products-grid');
    if (!grid) return;
    const q = (el('#search-products') && el('#search-products').value) || (new URL(window.location.href).searchParams.get('q') || '');
    const cat = el('#filter-category') ? el('#filter-category').value : '';
    const sort = el('#filter-sort') ? el('#filter-sort').value : '';

    let list = getProducts().slice();
    if (q) list = list.filter(p => ((p.title || '') + ' ' + (p.description || '') + ' ' + (p.seller || '') + ' ' + (p.location || '')).toLowerCase().includes(q.toLowerCase()));
    if (cat) list = list.filter(p => p.category === cat);
    if (sort === 'price-asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === 'price-desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = '';
    if (list.length === 0) { grid.innerHTML = '<div class="muted">No listings found.</div>'; return; }
    list.forEach(p => grid.appendChild(createCard(p)));

    grid.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const prod = getProducts().find(x => x.id === id);
      if (prod) openProductModal(prod, false);
    }));
    grid.querySelectorAll('.contact-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const prod = getProducts().find(x => x.id === id);
      if (prod) openProductModal(prod, true);
    }));
  }

  // Render profile page (user's own listings + ability to delete own items)
  function renderProfilePage() {
    const container = el('#profile-listings');
    if (!container) return;
    const user = getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }
    const list = getProducts().filter(p => p.seller === user);
    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = '<div class="muted">You have not listed any items yet.</div>';
      return;
    }
    list.forEach(p => {
      const card = createCard(p); // createCard shows delete only when allowed
      container.appendChild(card);
    });

    container.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const prod = getProducts().find(x => x.id === id);
      if (prod) openProductModal(prod, false);
    }));
    container.querySelectorAll('.contact-btn').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const prod = getProducts().find(x => x.id === id);
      if (prod) openProductModal(prod, true);
    }));
  }

  // expose renderers globally (pages call them)
  window.renderHomeGrid = renderHomeGrid;
  window.renderProductsPage = renderProductsPage;
  window.renderProfilePage = renderProfilePage;

  // initial setup
  document.addEventListener('DOMContentLoaded', () => {
    // site name usage
    els('.site-name').forEach(n => { if (n.tagName === 'INPUT') n.value = window.SITE_NAME || 'NEPALI BAZAR'; else n.textContent = window.SITE_NAME || 'NEPALI BAZAR'; });

    initAuthUI();
    initAds();
    initCategories();
    initGlobalSearch();
    prefillSearchFromQuery();
    initSellForm();

    // render depending on available elements
    renderHomeGrid();
    renderProductsPage();
    renderProfilePage();

    // fallback delegation: ensure any dynamically added buttons still work
    document.body.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!t) return;
      if (t.matches && t.matches('.view-btn')) {
        const pid = t.getAttribute('data-id');
        const prod = getProducts().find(x => x.id === pid);
        if (prod) openProductModal(prod, false);
      }
      if (t.matches && t.matches('.contact-btn')) {
        const pid = t.getAttribute('data-id');
        const prod = getProducts().find(x => x.id === pid);
        if (prod) openProductModal(prod, true);
      }
    });
  });
})();
