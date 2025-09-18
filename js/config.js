// Mock/sample product data.
// Each product should have a unique id (string or number).
// Replace or extend items, and add images to assets/images/

export const PRODUCTS = [
  {
    id: "p001",
    title: "Used iPhone 11 - Good Condition",
    price: 25000,
    currency: "Rs.",
    category: "Electronics",
    location: "Kathmandu",
    seller: "Suresh",
    description: "iPhone 11 with minor scratches. Battery health 86%. Charger included.",
    images: ["assets/images/iphone11.jpg"],
    createdAt: "2025-09-05"
  },
  {
    id: "p002",
    title: "Second-hand Mountain Bike",
    price: 18000,
    currency: "Rs.",
    category: "Vehicles",
    location: "Pokhara",
    seller: "Ramesh",
    description: "Hardtail MTB, 26\" wheel, used but strong. Great for college rides.",
    images: ["assets/images/bike.jpg"],
    createdAt: "2025-09-10"
  },
  {
    id: "p003",
    title: "Textbooks — Engineering (Set of 5)",
    price: 3500,
    currency: "Rs.",
    category: "Books",
    location: "Dhulikhel",
    seller: "CampusStore",
    description: "Semester textbooks in good condition. Physics, Math, Chemistry, C Programming, Economics.",
    images: ["assets/images/books.jpg"],
    createdAt: "2025-09-12"
  },
  {
    id: "p004",
    title: "Vintage Wooden Study Table",
    price: 4500,
    currency: "Rs.",
    category: "Furniture",
    location: "Lalitpur",
    seller: "Anita",
    description: "Solid pine table, small marks but sturdy. Dimensions: 120x60 cm.",
    images: ["assets/images/table.jpg"],
    createdAt: "2025-08-30"
  },
  {
    id: "p005",
    title: "Nike Sports Shoes — Size 9",
    price: 3200,
    currency: "Rs.",
    category: "Clothing",
    location: "Kathmandu",
    seller: "SportsNepal",
    description: "Lightweight running shoes, lightly used.",
    images: ["assets/images/shoes.jpg"],
    createdAt: "2025-09-02"
  }
  // Add more items as you like...
];
