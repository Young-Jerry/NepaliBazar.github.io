// Sample product data (used if localStorage is empty)
window.NB_PRODUCTS = [
  { id: 'p-1001', title: 'iPhone 11', price: 25000, category: 'Electronics', location: 'Bagmati - Kathmandu', seller: 'Ram', contact: '9800000001', description: 'Good condition', images: ['assets/images/placeholder.png'] },
  { id: 'p-1002', title: 'Wooden Table', price: 5000, category: 'Furniture', location: 'Gandaki - Pokhara', seller: 'Sita', contact: '9800000002', description: 'Solid wood', images: ['assets/images/placeholder.png'] },
  { id: 'p-1003', title: 'Honda Bike', price: 120000, category: 'Vehicles', location: 'Province No. 1 - Biratnagar', seller: 'Hari', contact: '9800000003', description: 'Well maintained', images: ['assets/images/placeholder.png'] }
];

// ID generator helper
window.NB_GENERATE_ID = function(){
    return 'p-' + Math.floor(Math.random()*900000 + 100000);
}
