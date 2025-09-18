// Sample product data and localStorage bootstrap
(function(){
  const initial = [
    {
      id: "p-1001",
      title: "Gaming Laptop — RTX 2060",
      price: 85000,
      currency: "Rs.",
      category: "Electronics",
      location: "Kathmandu",
      seller: "Rajan",
      contact: "9801234567",
      description: "Well maintained gaming laptop, 16GB RAM, RTX 2060, 512GB SSD.",
      images: ["assets/images/sample-1.jpg"],
      createdAt: "2025-07-01"
    },
    {
      id: "p-1002",
      title: "Mountain Bike — 26 inch",
      price: 18000,
      currency: "Rs.",
      category: "Vehicles",
      location: "Pokhara",
      seller: "Sita",
      contact: "9812345678",
      description: "Good condition, replaced tires recently.",
      images: ["assets/images/sample-2.jpg"],
      createdAt: "2025-07-08"
    },
    {
      id: "p-1003",
      title: "Engineering Textbooks Set",
      price: 3500,
      currency: "Rs.",
      category: "Books",
      location: "Dhulikhel",
      seller: "CampusStore",
      contact: "campus@store.test",
      description: "Semester books: Engineering Mathematics, Physics, Mechanics",
      images: ["assets/images/sample-3.jpg"],
      createdAt: "2025-06-22"
    }
  ];

  // load from localStorage or initialize
  const key = window.LOCAL_STORAGE_KEY || "nb_products_v1";
  let local = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) local = JSON.parse(raw);
  } catch (e){
    console.warn("failed reading local products", e);
  }

  // if no local, use initial
  if (!local || !Array.isArray(local) || local.length === 0) {
    local = initial;
    try { localStorage.setItem(key, JSON.stringify(local)); } catch(e){}
  }

  // attach to global so app.js can read
  window.NB_PRODUCTS = local;
})();
