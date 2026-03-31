// ========================
// UI RENDER FUNCTIONS
// ========================

function showPage(page){
  const content = document.getElementById("content");

  if(page === "customers"){
    renderCustomers();
  }

  if(page === "shops"){
    renderShops();
  }

  if(page === "employees"){
    renderEmployees();
  }

  if(page === "partners"){
    renderPartners();
  }

  if(page === "sales"){
    renderSales();
  }
}

// ========================
// CUSTOMERS UI
// ========================
function renderCustomers(){
  const content = document.getElementById("content");

  let html = `
    <h3>العملاء</h3>
    <input id="cname" placeholder="اسم العميل">
    <input id="cphone" placeholder="رقم الهاتف">
    <button onclick="addCustomer()">إضافة</button>
    <hr>
  `;

  S.customers.forEach(c=>{
    html += `<div>${c.name} - ${c.phone}</div>`;
  });

  content.innerHTML = html;
}

// ========================
// SHOPS UI
// ========================
function renderShops(){
  const content = document.getElementById("content");

  let html = `
    <h3>المحلات</h3>
    <input id="sh-name" placeholder="اسم المحل">
    <button onclick="addShop()">إضافة</button>
    <hr>
  `;

  S.shops.forEach(s=>{
    html += `
      <div>
        ${s.name} | عليه: ${s.balance} جنيه
      </div>
    `;
  });

  content.innerHTML = html;
}

// ========================
// SALES UI
// ========================
function renderSales(){
  const content = document.getElementById("content");

  let html = `
    <h3>المبيعات</h3>

    <select id="shopSelect">
      ${S.shops.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}
    </select>

    <select id="itemSelect">
      ${S.items.map(i=>`<option value="${i.id}">${i.name}</option>`).join("")}
    </select>

    <input id="qty" placeholder="الكمية">

    <button onclick="addSale()">بيع</button>
    <hr>
  `;

  S.sales.forEach(s=>{
    html += `<div>عملية بيع: ${s.total} جنيه</div>`;
  });

  content.innerHTML = html;
}

// ========================
// EMPLOYEES UI
// ========================
function renderEmployees(){
  const content = document.getElementById("content");
  content.innerHTML = `<h3>الموظفين (قريبًا)</h3>`;
}

// ========================
// PARTNERS UI
// ========================
function renderPartners(){
  const content = document.getElementById("content");
  content.innerHTML = `<h3>الشركاء (قريبًا)</h3>`;
}
