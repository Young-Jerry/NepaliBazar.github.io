/* Full app.js — paste whole file to js/app.js
   All demands implemented:
   - expiryDate support (max 7 days). Required on publish.
   - expired ads auto-filtered and removed from listing views.
   - sort by newest (createdAt). Price sort removed.
   - "View" and "Contact" open an in-page informational modal (final popup) with only close X.
   - profile support: sohaum = admin (delete anywhere); normal users delete only own items from profile.
   - admin pin/unpin exactly ONE ad; pinned ad shown in hero (with pin icon) and clickable to open its modal.
   - createdAt stored and shown as YYYY-MM-DD HH:mm (24h).
   - ad hover animation (JS-driven).
   - exposes renderHomeGrid, renderProductsPage, renderProfilePage globally.
*/

(function () {
  const KEY = window.LOCAL_STORAGE_KEY || 'nb_products_v1';
  const MAX_PRICE = 100000000; // safety cap
  const MAX_EXPIRY_DAYS = 7;

  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const isProfilePage = () => /profile\.html$/i.test(window.location.pathname) || !!el('#profile-page');

  // Helpers
  function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]) : ''; }
  function numberWithCommas(x) { try { return Number(x).toLocaleString('en-IN'); } catch (e) { return x; } }
  function getCurrentUser() { try { return localStorage.getItem('nb_logged_in_user') || null; } catch (e) { return null; } }

  function nowIsoDateTime() {
    // returns YYYY-MM-DD HH:mm (local time)
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}`;
  }

  function parseDateOnly(dateStr) {
    // accepts YYYY-MM-DD or ISO; returns Date at local midnight
    try {
      const parts = dateStr.split('T')[0].split(' ')[0];
      return new Date(parts + 'T00:00:00');
    } catch (e) {
      return new Date(dateStr);
    }
  }

  // Products helpers (raw read/write)
  function getProductsRaw() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('Failed read products', e); }
    if (Array.isArray(window.NB_PRODUCTS)) return window.NB_PRODUCTS.slice();
    return [];
  }

  function saveProducts(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) { console.warn('Failed save products', e); }
  }

  // getProducts filters out expired ads automatically
  function getProducts() {
    const today = new Date();
    const raw = getProductsRaw();
    return raw.filter(p => {
      if (!p) return false;
      if (!p.expiryDate) return true;
      try {
        const exp = parseDateOnly(p.expiryDate);
        // Keep if expiry date >= today's date (midnight)
        const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return exp >= todayMid;
      } catch (e) {
        return true;
      }
    });
  }

  // utility to find pinned product (there should be at most one)
  function getPinnedProduct() {
    const raw = getProductsRaw();
    return raw.find(p => p && p.pinned === true) || null;
  }

  function canDeleteProduct(product) {
    const user = getCurrentUser();
    if (!user) return false;
    if (user === 'sohaum') return true; // admin
    // normal users can delete only own product and only from profile page
    if (product && product.seller === user && isProfilePage()) return true;
    return false;
  }

  // Pin/unpin helpers (admin only)
  function pinProductById(id) {
    const user = getCurrentUser();
    if (user !== 'sohaum') return alert('Only admin can pin ads.');
    const list = getProductsRaw();
    const found = list.find(p => p.id === id);
    if (!found) return alert('Listing not found');
    // unpin any existing
    for (const p of list) { if (p.pinned) p.pinned = false; }
    // pin this one
    found.pinned = true;
    found.pinnedBy = user;
    found.pinnedAt = new Date().toISOString();
    saveProducts(list);
    renderPinnedHero();
    // rerender grids to reflect pin icon
    renderHomeGrid();
    renderProductsPage();
    renderProfilePage();
  }

  function unpinProductById(id) {
    const user = getCurrentUser();
    if (user !== 'sohaum') return alert('Only admin can unpin ads.');
    const list = getProductsRaw();
    const found = list.find(p => p.id === id);
    if (!found) return alert('Listing not found');
    found.pinned = false;
    delete found.pinnedBy;
    delete found.pinnedAt;
    saveProducts(list);
    renderPinnedHero();
    renderHomeGrid();
    renderProductsPage();
    renderProfilePage();
  }

  // --- Create product card DOM (adds pin/unpin and delete controls depending on permissions)
  function createCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = (product.images && product.images[0]) ? product.images[0] : 'assets/images/placeholder.jpg';
    const priceDisplay = (Number(product.price) === 0) ? 'FREE' : (product.currency || 'Rs.') + ' ' + numberWithCommas(product.price);
    const posted = product.createdAt || '';
    const expires = product.expiryDate || '';

    // pin icon on card if pinned
    const pinnedHtml = product.pinned ? `<span title="Pinned" style="display:inline-block;margin-left:6px;color:var(--accent);font-weight:800">📌</span>` : '';

    card.innerHTML = `
      <div class="thumb" style="position:relative;">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(product.title)}" onerror="this.src='assets/images/placeholder.jpg'"/>
        ${product.pinned ? '<div style="position:absolute;left:8px;top:8px;background:rgba(0,0,0,0.45);padding:6px;border-radius:8px;">📌 Pinned</div>' : ''}
      </div>
      <div class="title">${escapeHtml(product.title)} ${pinnedHtml}</div>
      <div class="meta"><div class="price">${priceDisplay}</div><div class="muted small">${escapeHtml(product.location||'')}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <div style="display:flex;flex-direction:column">
          <div style="display:flex;gap:8px;">
            <button class="btn view-btn" data-id="${escapeHtml(product.id)}">View</button>
            <button class="btn contact-btn" data-id="${escapeHtml(product.id)}">Contact</button>
          </div>
          <div style="margin-top:6px;font-size:12px;color:var(--muted);">
            <span>Posted: ${escapeHtml(posted)}</span>
            ${expires ? `<span style="margin-left:8px">Expires: ${escapeHtml(expires)}</span>` : ''}
          </div>
        </div>
        <div class="card-right" style="display:flex;gap:8px;align-items:center"></div>
      </div>
    `;

    const right = card.querySelector('.card-right');

    // admin pin/unpin control
    const currentUser = getCurrentUser();
    if (currentUser === 'sohaum') {
      const pinBtn = document.createElement('button');
      pinBtn.className = 'btn';
      pinBtn.textContent = product.pinned ? 'Unpin' : 'Pin';
      pinBtn.title = product.pinned ? 'Unpin this ad from hero' : 'Pin this ad to hero';
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (product.pinned) unpinProductById(product.id);
        else pinProductById(product.id);
      });
      right.appendChild(pinBtn);
    }

    // delete button if authorized
    if (canDeleteProduct(product)) {
      const del = document.createElement('button');
      del.className = 'btn btn-danger delete-inline';
      del.textContent = 'Delete';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Delete listing?')) return;
        deleteProductById(product.id);
      });
      right.appendChild(del);
    }

    // attach id dataset on top-level for delegation convenience
    card.setAttribute('data-id', product.id);

    // add hover effect on card (JS fallback)
    card.style.transition = 'transform .18s ease, box-shadow .18s ease';
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-6px)';
      card.style.boxShadow = '0 18px 60px rgba(0,0,0,0.6)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });

    return card;
  }

  function deleteProductById(id) {
    let list = getProductsRaw();
    const product = list.find(p => p.id === id);
    if (!product) return alert('Listing not found');
    if (!canDeleteProduct(product)) return alert('Not authorized to delete this listing.');
    list = list.filter(p => p.id !== id);
    // if deleted one was pinned, remove pinned state
    for (const p of list) { if (p.pinned && p.id === id) p.pinned = false; }
    saveProducts(list);
    // rerender
    renderPinnedHero();
    if (el('#home-grid')) renderHomeGrid();
    if (el('#products-grid')) renderProductsPage();
    if (el('#profile-listings')) renderProfilePage();
  }

  // --- Modal (final informational popup) - only close X allowed inside content
  function showModalHtml(html) {
    const builtin = el('#nb-modal');
    if (builtin && builtin.querySelector('#nb-modal-body')) {
      const body = builtin.querySelector('#nb-modal-body');
      body.innerHTML = html;
      builtin.style.display = 'flex';
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

  function buildProductModalHtml(product) {
    const posted = product.createdAt || '';
    const expires = product.expiryDate || '';
    return `
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div style="flex:0 0 320px;"><img src="${escapeHtml((product.images&&product.images[0])?product.images[0]:'assets/images/placeholder.jpg')}" style="width:320px;height:220px;object-fit:cover;border-radius:6px;" onerror="this.src='assets/images/placeholder.jpg'"/></div>
        <div style="flex:1;min-width:200px;">
          <h2 style="margin:0 0 6px 0">${escapeHtml(product.title)}</h2>
          <div style="margin-bottom:6px;font-weight:600;">${(Number(product.price)===0)?'FREE':(product.currency||'Rs.') + ' ' + numberWithCommas(product.price)}</div>
          <div class="muted small">Location: ${escapeHtml(product.location||'')}</div>
          <div class="muted small">Seller: ${escapeHtml(product.seller||'')}</div>
          <hr style="opacity:0.06;margin:8px 0">
          <p style="max-height:240px;overflow:auto;margin:0;padding-right:6px">${escapeHtml(product.description||'')}</p>
          <p style="margin-top:10px;"><strong>Contact:</strong> ${escapeHtml(product.contact||'')}</p>
          <p style="margin-top:8px;font-size:13px;color:var(--muted)">Posted: ${escapeHtml(posted)} ${expires ? ` | Expires: ${escapeHtml(expires)}` : ''}</p>
          <p style="margin-top:6px;color:var(--muted);font-size:13px">This is an informational popup. Close (✕) to return to the site.</p>
        </div>
      </div>
    `;
  }

  function openProductModal(product, contactOnly) {
    const html = buildProductModalHtml(product);
    showModalHtml(html);
  }

  // --- Search
  function initGlobalSearch() {
    const ids = ['#global-search', '#global-search-top', '#global-search-product', '#global-search-sell', '#search-products', '#search-products-top', '#search-products-global'];
    let s = null;
    for (const id of ids) { const n = document.querySelector(id); if (n) { s = n; break; } }
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

  function prefillSearchFromQuery() {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q') || '';
    if (!q) return;
    const ids = ['#search-products', '#search-products-top', '#search-products-global', '#global-search-top', '#global-search'];
    ids.forEach(id => { const n = document.querySelector(id); if (n) n.value = q; });
  }

  // --- Categories (populate and attach change handlers)
  function initCategories() {
    const products = getProductsRaw();
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const selects = document.querySelectorAll('#filter-category');
    selects.forEach(sel => {
      const prev = sel.value || '';
      sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      if (prev) sel.value = prev;
      sel.addEventListener('change', () => {
        if (el('#home-grid')) renderHomeGrid();
        if (el('#products-grid')) renderProductsPage();
        if (el('#profile-listings')) renderProfilePage();
      });
    });
  }

  // --- Ads injection & hover animation
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
      img.style.transition = 'transform .18s ease, box-shadow .18s ease';
      a.appendChild(img);
      slot.innerHTML = '';
      slot.appendChild(a);
      a.addEventListener('mouseenter', () => { img.style.transform = 'translateY(-6px) scale(1.03)'; img.style.boxShadow = '0 18px 60px rgba(0,0,0,0.6)'; });
      a.addEventListener('mouseleave', () => { img.style.transform = ''; img.style.boxShadow = ''; });
    });
  }

  // --- Sell form init: add expiry date field if not present, validate max 7 days
  function initSellForm() {
    const form = el('#sell-form') || el('form#sell');
    if (!form) return;

    // ensure expiry date input exists
    if (!form.querySelector('[name="expiryDate"]')) {
      const wrap = document.createElement('label');
      wrap.innerHTML = `Expiry Date (max ${MAX_EXPIRY_DAYS} day(s) from today)
        <input type="date" name="expiryDate" required class="input" />`;
      // insert before form-actions if exists, else at end
      const actions = form.querySelector('.form-actions');
      if (actions) form.insertBefore(wrap, actions);
      else form.appendChild(wrap);

      // set min/max
      const inp = wrap.querySelector('input[name="expiryDate"]');
      const today = new Date();
      const min = today.toISOString().split('T')[0];
      const max = new Date(today.getTime() + MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      inp.min = min;
      inp.max = max;
      inp.value = max;
    }

    // phone/email sanitization
    const phone = form.querySelector('[name="contact"]');
    if (phone) {
      phone.setAttribute('placeholder', '10 digit phone number or email');
      phone.addEventListener('input', () => {
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
      const expiryDate = fd.get('expiryDate');

      if (!title) return alert('Please provide a title');
      const phoneOk = /^\d{10}$/.test(contact);
      const emailOk = contact.includes('@');
      if (!phoneOk && !emailOk) return alert('Please enter a 10-digit phone number or an email');
      if (price < 0) price = 0;
      if (price > MAX_PRICE) return alert('Price exceeds maximum allowed.');
      if (!expiryDate) return alert('Please select an expiry date');

      // validate expiry within allowed window
      const today = new Date();
      const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const max = new Date(today.getTime() + MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const chosen = parseDateOnly(expiryDate);
      if (chosen < min || chosen > max) return alert(`Expiry date must be between today and ${MAX_EXPIRY_DAYS} days from today.`);

      const id = (window.NB_GENERATE_ID && typeof window.NB_GENERATE_ID === 'function') ? window.NB_GENERATE_ID() : ('p-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
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
        createdAt: nowIsoDateTime(), // store YYYY-MM-DD HH:mm
        expiryDate: expiryDate // YYYY-MM-DD
      };

      const list = getProductsRaw();
      list.push(newProduct);
      saveProducts(list);
      alert(price === 0 ? 'Listing published as FREE!' : 'Listing published!');
      window.location.href = 'products.html';
    });
  }

  // --- AUTH UI: inject Profile link and update header user-info
  function initAuthUI() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // ensure profile link exists
    let profileLink = document.getElementById('profile-link');
    if (!profileLink) {
      profileLink = document.createElement('a');
      profileLink.id = 'profile-link';
      profileLink.className = 'nav-link';
      profileLink.href = 'profile.html';
      profileLink.textContent = 'Profile';
      const loginLink = document.getElementById('login-link');
      if (loginLink && loginLink.parentNode) loginLink.parentNode.insertBefore(profileLink, loginLink.nextSibling);
      else nav.appendChild(profileLink);
    }

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

  // --- Render pinned hero (if pinned ad exists). If on profile page, hero hidden.
  function renderPinnedHero() {
    const hero = el('.hero');
    if (!hero) return;
    // if on profile page, hide hero
    if (isProfilePage()) { hero.style.display = 'none'; return; }
    const pinned = getPinnedProduct();
    const right = hero.querySelector('.hero-right');
    const left = hero.querySelector('.hero-left');
    if (!right || !left) return;
    if (!pinned) {
      hero.style.display = ''; // show default hero
      return;
    }
    // render pinned ad in hero-right
    hero.style.display = '';
    right.innerHTML = `
      <div class="hero-card neon-card pinned-hero" style="cursor:pointer;position:relative;">
        <div style="position:absolute;left:12px;top:12px;background:linear-gradient(90deg,var(--neon-1),var(--neon-2));color:#041026;padding:6px 8px;border-radius:10px;font-weight:700;display:flex;align-items:center;gap:8px;">
          📌 Pinned
        </div>
        <img src="${escapeHtml((pinned.images&&pinned.images[0])?pinned.images[0]:'assets/images/placeholder.jpg')}" alt="${escapeHtml(pinned.title)}" style="width:100%;height:240px;object-fit:cover;border-radius:10px;" onerror="this.style.display='none'"/>
        <div class="meta" style="margin-top:10px">${escapeHtml(pinned.title)} — ${(Number(pinned.price)===0)?'FREE':(pinned.currency||'Rs.')+' '+numberWithCommas(pinned.price)}</div>
      </div>
    `;
    // clicking the pinned hero opens the final popup for that product
    const heroCard = right.querySelector('.pinned-hero');
    if (heroCard) {
      heroCard.addEventListener('click', () => {
        const prod = getProducts().find(x => x.id === pinned.id) || pinned;
        if (prod) openProductModal(prod, false);
      });
    }
  }

  // --- Renderers (no price sort; default newest first)
  function renderHomeGrid(limit = 8) {
    const grid = el('#home-grid'); if (!grid) return;
    let list = getProducts().slice(); // already filtered for expiry

    // category filter (if present)
    const catSel = el('#filter-category');
    const catVal = catSel ? catSel.value : '';
    if (catVal) list = list.filter(p => p.category === catVal);

    // sort by createdAt descending (newest first) - parse date/time
    list.sort((a, b) => {
      const da = new Date(a.createdAt || 0);
      const db = new Date(b.createdAt || 0);
      return db - da;
    });

    grid.innerHTML = '';
    const slice = list.slice(0, limit);
    slice.forEach(p => grid.appendChild(createCard(p)));

    // attach events (defensive)
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

  function renderProductsPage() {
    const grid = el('#products-grid'); if (!grid) return;
    const q = (el('#search-products') && el('#search-products').value) || (new URL(window.location.href).searchParams.get('q') || '');
    const cat = el('#filter-category') ? el('#filter-category').value : '';

    let list = getProducts().slice();
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(p => (((p.title || '') + ' ' + (p.description || '') + ' ' + (p.seller || '') + ' ' + (p.location || '')).toLowerCase().includes(ql)));
    }
    if (cat) list = list.filter(p => p.category === cat);

    // newest first
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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

  function renderProfilePage() {
    const container = el('#profile-listings');
    // hide hero for profile page
    const hero = el('.hero');
    if (hero) hero.style.display = 'none';
    if (!container) return;
    const user = getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }
    const list = getProducts().filter(p => p.seller === user);
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<div class="muted">You have not listed any items yet.</div>';
      return;
    }
    list.forEach(p => container.appendChild(createCard(p)));
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

  // expose renderers
  window.renderHomeGrid = renderHomeGrid;
  window.renderProductsPage = renderProductsPage;
  window.renderProfilePage = renderProfilePage;

  // --- Initialization
  document.addEventListener('DOMContentLoaded', () => {
    // site name
    els('.site-name').forEach(n => { if (n.tagName === 'INPUT') n.value = window.SITE_NAME || 'NEPALI BAZAR'; else n.textContent = window.SITE_NAME || 'NEPALI BAZAR'; });

    initAuthUI();
    initAds();
    initCategories();
    initGlobalSearch();
    prefillSearchFromQuery();
    initSellForm();

    // initial render
    renderPinnedHero();
    renderHomeGrid();
    renderProductsPage();
    renderProfilePage();

    // fallback body delegation for dynamically added buttons
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
