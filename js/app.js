(function(){
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const key = "nb_products_v1";

  function escapeHtml(s){ return s ? String(s).replace(/[&<>\"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])) : ""; }
  function numberWithCommas(x){ return Number(x).toLocaleString('en-IN'); }

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

  function createCard(product){
    const card = document.createElement("div");
    card.className = "card";
    const img = (product.images && product.images[0]) || "assets/images/placeholder.jpg";
    const priceDisplay = Number(product.price) === 0 ? "FREE" : (product.currency||"Rs.")+" "+numberWithCommas(product.price);

    card.innerHTML = `
      <div class="thumb"><img src="${escapeHtml(img)}" alt="${escapeHtml(product.title)}"/></div>
      <div class="title">${escapeHtml(product.title)}</div>
      <div class="meta"><div class="price">${priceDisplay}</div><div class="muted small">${escapeHtml(product.location||"")}</div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <button class="btn view-btn" data-id="${product.id}">View</button>
        <button class="btn contact-btn" data-id="${product.id}">Contact</button>
      </div>
    `;
    return card;
  }

  // Use the built-in modal in index.html
  function openModal(html){
    const modal = el("#nb-modal");
    const body = el("#nb-modal-body");
    body.innerHTML = html;
    modal.style.display = "flex";
  }

  function renderHomeGrid(limit=8){
    const grid = el("#home-grid"); if(!grid) return;
    let list = getProducts().slice();

    // Apply filters
    const cat = el("#filter-category") ? el("#filter-category").value : "";
    const sort = el("#filter-sort") ? el("#filter-sort").value : "";

    if(cat) list = list.filter(p => p.category === cat);

    if(sort === "price-asc") list.sort((a,b)=> a.price - b.price);
    else if(sort === "price-desc") list.sort((a,b)=> b.price - a.price);
    else list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = "";
    list.slice(0,limit).forEach(p=>{
      const card = createCard(p);
      grid.appendChild(card);
    });

    // attach modal events
    grid.querySelectorAll(".view-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const p = getProducts().find(x=>x.id===btn.dataset.id);
        if(p){
          openModal(`
            <h2>${escapeHtml(p.title)}</h2>
            <p>${escapeHtml(p.description||"")}</p>
            <p><b>Price:</b> ${p.price==0?"FREE":"Rs. "+numberWithCommas(p.price)}</p>
            <p><b>Location:</b> ${escapeHtml(p.location||"")}</p>
            <p><b>Seller:</b> ${escapeHtml(p.seller||"")}</p>
          `);
        }
      });
    });
    grid.querySelectorAll(".contact-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const p = getProducts().find(x=>x.id===btn.dataset.id);
        if(p){
          openModal(`
            <h2>Contact Seller</h2>
            <p><b>Item:</b> ${escapeHtml(p.title)}</p>
            <p><b>Phone/Email:</b> ${escapeHtml(p.contact||"")}</p>
          `);
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    renderHomeGrid();

    // Hook filters
    const cat = el("#filter-category");
    const sort = el("#filter-sort");
    if(cat) cat.addEventListener("change", ()=>renderHomeGrid());
    if(sort) sort.addEventListener("change", ()=>renderHomeGrid());
  });
})();
