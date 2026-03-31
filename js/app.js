// ========================
// DATA
// ========================
let S = {
  customers: [],
  items: [],
  sales: [],
  shops: [],
  employees: [],
  partners: []
};

// ========================
// SAVE & LOAD
// ========================
function save(){
  localStorage.setItem("vegshop", JSON.stringify(S));
}

function load(){
  let data = localStorage.getItem("vegshop");
  if(data){
    S = JSON.parse(data);
  }
}

// ========================
// CUSTOMERS
// ========================
function addCustomer(){
  const name = document.getElementById("cname").value;
  const phone = document.getElementById("cphone").value;

  S.customers.push({
    id: Date.now(),
    name,
    phone
  });

  save();
  renderCustomers();
}

// ========================
// ITEMS
// ========================
function addItem(){
  const name = document.getElementById("iname").value;
  const price = document.getElementById("iprice").value;

  S.items.push({
    id: Date.now(),
    name,
    price
  });

  save();
  renderItems();
}

// ========================
// SHOPS
// ========================
function addShop(){
  const name = document.getElementById("sh-name").value;

  S.shops.push({
    id: Date.now(),
    name,
    balance: 0,
    total: 0,
    paid: 0
  });

  save();
  renderShops();
}

// ========================
// SALES
// ========================
function addSale(){
  const shopId = document.getElementById("shopSelect").value;
  const itemId = document.getElementById("itemSelect").value;
  const qty = document.getElementById("qty").value;

  const item = S.items.find(i => i.id == itemId);
  const total = qty * item.price;

  S.sales.push({
    id: Date.now(),
    shopId,
    itemId,
    qty,
    total
  });

  // تحديث المحل
  let shop = S.shops.find(s => s.id == shopId);
  if(shop){
    shop.total += total;
    shop.balance += total;
  }

  save();
  renderSales();
}
// ========================
// INIT
// ========================
function init(){
  load();
}
init();
