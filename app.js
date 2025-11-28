// app.js — Pure Gold Jewellers Faisalabad (vanilla JS frontend)
import { supabase } from './supabase-config.js';

/* ---------- helpers ---------- */
const byId = id => document.getElementById(id);
const main = document.getElementById('main-view');

function el(html){ const div = document.createElement('div'); div.innerHTML = html; return div.firstElementChild || div; }

async function fetchCounts(){
  const [{ count: pc }, { count: sc }, { count: cu }, { count: sa }] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact' }),
    supabase.from('stock').select('id', { count: 'exact' }),
    supabase.from('customers').select('id', { count: 'exact' }),
    supabase.from('sales').select('id', { count: 'exact' }),
  ].map(p => p.catch(e=>({count:0}))));
  return {
    products: pc?.count || 0,
    stock_rows: sc?.count || 0,
    customers: cu?.count || 0,
    sales: sa?.count || 0
  }
}

/* ---------- views ---------- */

async function showDashboard(){
  main.innerHTML = '';
  const card = el(`<div class="card"><h3>Dashboard</h3><div id="dash-stats" class="row"></div></div>`);
  main.appendChild(card);

  const counts = await fetchCounts();
  const statsHtml = `
    <div class="col card"><h4>Products</h4><div style="font-size:26px">${counts.products}</div></div>
    <div class="col card"><h4>Stock rows</h4><div style="font-size:26px">${counts.stock_rows}</div></div>
    <div class="col card"><h4>Customers</h4><div style="font-size:26px">${counts.customers}</div></div>
    <div class="col card"><h4>Sales</h4><div style="font-size:26px">${counts.sales}</div></div>
  `;
  byId('dash-stats').innerHTML = statsHtml;
}

async function showProducts(){
  main.innerHTML = '';
  const wrap = el(`<div class="card"><h3>Products</h3>
    <div id="prod-list">Loading...</div></div>`);
  main.appendChild(wrap);

  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
  if(error){ byId('prod-list').innerText = 'Error loading products'; return; }
  if(!data.length){ byId('prod-list').innerHTML = '<div class="small">No products yet.</div>'; return; }

  let html = `<table class="table"><thead><tr><th>SKU</th><th>Name</th><th>Metal</th><th>Wt(g)</th><th>Price</th></tr></thead><tbody>`;
  for(const p of data){
    html += `<tr>
      <td>${p.sku||''}</td>
      <td>${p.name}</td>
      <td>${p.metal_type||''} ${p.metal_purity||''}</td>
      <td>${p.weight_grams||''}</td>
      <td>${p.retail_price||0}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  byId('prod-list').innerHTML = html;
}

function showAddProduct(){
  main.innerHTML = '';
  main.appendChild(el(`<div class="card"><h3>Add Product</h3>
    <div class="row">
      <div class="col"><label>SKU<input id="p-sku" class="input" /></label></div>
      <div class="col"><label>Name<input id="p-name" class="input" /></label></div>
    </div>
    <div class="row">
      <div class="col"><label>Metal<input id="p-metal" class="input" placeholder="Gold/Silver" /></label></div>
      <div class="col"><label>Purity<input id="p-purity" class="input" placeholder="24/22" /></label></div>
    </div>
    <div class="row">
      <div class="col"><label>Weight (g)<input id="p-weight" class="input" type="number" /></label></div>
      <div class="col"><label>Retail Price<input id="p-price" class="input" type="number" /></label></div>
    </div>
    <div style="margin-top:12px"><button id="save-product" class="btn">Save Product</button></div>
  </div>`));

  document.getElementById('save-product').addEventListener('click', async ()=>{
    const sku = document.getElementById('p-sku').value.trim();
    const name = document.getElementById('p-name').value.trim();
    const metal = document.getElementById('p-metal').value.trim();
    const purity = document.getElementById('p-purity').value.trim();
    const weight = parseFloat(document.getElementById('p-weight').value) || 0;
    const price = parseFloat(document.getElementById('p-price').value) || 0;

    if(!name){ alert('Enter product name'); return; }
    const { data, error } = await supabase.from('products').insert([{
      sku, name, metal_type: metal, metal_purity: purity, weight_grams: weight, retail_price: price
    }]).select().single();
    if(error){ alert('Error: '+error.message); return; }
    // create stock row with qty 0 at default branch (null)
    await supabase.from('stock').upsert([{ product_id: data.id, branch_id: 1, qty: 0 }], { onConflict: ['product_id','branch_id'] });
    alert('Product saved');
    showProducts();
  });
}

async function showCustomers(){
  main.innerHTML = '';
  main.appendChild(el(`<div class="card"><h3>Customers</h3><div id="cust-list">Loading...</div>
    <div style="margin-top:12px">
      <input id="cust-name" class="input" placeholder="New customer name" />
      <button id="add-cust" class="btn">Add Customer</button>
    </div></div>`));

  async function loadCustomers(){
    const { data } = await supabase.from('customers').select('*').order('id', { ascending: false });
    if(!data?.length) { byId('cust-list').innerHTML = '<div class="small">No customers</div>'; return; }
    let html = `<table class="table"><thead><tr><th>Name</th><th>Balance</th></tr></thead><tbody>`;
    for(const c of data) html += `<tr><td>${c.name}</td><td>${c.balance||0}</td></tr>`;
    html += `</tbody></table>`;
    byId('cust-list').innerHTML = html;
  }

  byId('add-cust').addEventListener('click', async ()=>{
    const name = byId('cust-name').value.trim();
    if(!name) return alert('Enter name');
    const { error } = await supabase.from('customers').insert([{ name }]);
    if(error) return alert('Error: '+error.message);
    byId('cust-name').value = '';
    loadCustomers();
  });

  loadCustomers();
}

async function showPurchases(){
  main.innerHTML = '';
  main.appendChild(el(`<div class="card"><h3>Purchases (Receive stock)</h3>
    <div id="purchases-area">
      <div class="small">Add a purchase to increase product stock.</div>
    </div></div>`));

  const products = (await supabase.from('products').select('*')).data || [];
  const suppliers = (await supabase.from('suppliers').select('*')).data || [];
  const branches = (await supabase.from('branches').select('*')).data || [{id:1,name:'Main'}];

  const form = el(`<div class="card">
    <div class="row">
      <div class="col"><select id="buy-product" class="input"><option value="">Select product</option></select></div>
      <div class="col"><input id="buy-qty" class="input" placeholder="Qty" type="number"/></div>
      <div class="col"><input id="buy-price" class="input" placeholder="Unit price" type="number"/></div>
    </div>
    <div style="margin-top:8px"><button id="add-purchase" class="btn">Save Purchase & Increase Stock</button></div>
  </div>`);
  byId('purchases-area').appendChild(form);

  const prodSelect = document.getElementById('buy-product');
  products.forEach(p => {
    const opt = document.createElement('option'); opt.value = p.id; opt.text = `${p.sku||''} — ${p.name}`; prodSelect.add(opt);
  });

  document.getElementById('add-purchase').addEventListener('click', async ()=>{
    const prodId = parseInt(prodSelect.value);
    const qty = parseInt(document.getElementById('buy-qty').value) || 0;
    const unit = parseFloat(document.getElementById('buy-price').value) || 0;
    if(!prodId || qty<=0){ alert('Select product and qty'); return; }
    // create purchase
    const { data:purchase, error:perr } = await supabase.from('purchases').insert([{
      supplier_id: null, invoice_no: null, total_amount: qty*unit, paid_amount: qty*unit, branch_id: 1
    }]).select().single();
    if(perr){ alert('Error: '+perr.message); return; }
    await supabase.from('purchase_items').insert([{ purchase_id: purchase.id, product_id: prodId, qty, unit_price: unit, amount: qty*unit }]);
    // upsert stock increase
    const { data:stockRow } = await supabase.from('stock').select('*').match({ product_id: prodId, branch_id: 1 }).maybeSingle();
    if(stockRow){
      await supabase.from('stock').update({ qty: (stockRow.qty || 0) + qty, updated_at: new Date() }).match({ id: stockRow.id });
    } else {
      await supabase.from('stock').insert([{ product_id: prodId, branch_id: 1, qty }]);
    }
    alert('Purchase saved and stock updated');
  });
}

async function showPOS(){
  main.innerHTML = '';
  const wrap = el(`<div class="card"><h3>POS — Quick Sale</h3>
    <div class="row">
      <div class="col">
        <input id="pos-search" class="input" placeholder="Search product by SKU or name" />
        <div id="pos-results" style="margin-top:8px"></div>
      </div>
      <div style="width:320px">
        <div class="card cart"><h4>Cart</h4><div id="cart-list"></div>
        <div style="margin-top:8px"><strong>Total: Rs <span id="cart-total">0</span></strong></div>
        <div style="margin-top:8px">
          <input id="customer-name" class="input" placeholder="Customer name (optional)" />
          <button id="complete-sale" class="btn" style="margin-top:8px">Complete Sale</button>
        </div>
        </div>
      </div>
    </div>
  </div>`);
  main.appendChild(wrap);

  let products = (await supabase.from('products').select('*')).data || [];
  let cart = [];

  function renderSearchResults(list){
    const box = document.getElementById('pos-results');
    if(!list.length){ box.innerHTML = '<div class="small">No matches</div>'; return; }
    let html = '<table class="table"><tbody>';
    for(const p of list){
      html += `<tr>
        <td><strong>${p.name}</strong><div class="small">${p.sku||''} • ${p.metal_type||''}</div></td>
        <td style="width:90px">Rs ${p.retail_price||0}</td>
        <td style="width:80px"><button class="btn add-btn" data-id="${p.id}">Add</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    box.innerHTML = html;
    document.querySelectorAll('.add-btn').forEach(b=>{
      b.addEventListener('click', ()=> {
        const id = parseInt(b.dataset.id);
        const prod = products.find(x=>x.id===id);
        const cartItem = cart.find(ci=>ci.id===id);
        if(cartItem) cartItem.qty++;
        else cart.push({ id: prod.id, name: prod.name, unit: prod.retail_price||0, qty:1 });
        renderCart();
      });
    });
  }

  function renderCart(){
    const list = document.getElementById('cart-list');
    if(!cart.length){ list.innerHTML = '<div class="small">Cart is empty</div>'; document.getElementById('cart-total').innerText = '0'; return; }
    let html = '<table class="table"><tbody>';
    let total = 0;
    for(const c of cart){
      const line = c.unit * c.qty; total += line;
      html += `<tr><td>${c.name}</td><td>${c.qty} x ${c.unit}</td><td>Rs ${line}</td></tr>`;
    }
    html += `</tbody></table>`;
    list.innerHTML = html;
    document.getElementById('cart-total').innerText = total.toFixed(2);
  }

  document.getElementById('pos-search').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase().trim();
    if(!q) return document.getElementById('pos-results').innerHTML = '';
    const matches = products.filter(p => (p.name || '').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q));
    renderSearchResults(matches);
  });

  document.getElementById('complete-sale').addEventListener('click', async ()=>{
    if(!cart.length) return alert('Cart is empty');
    const customerName = document.getElementById('customer-name').value.trim();
    let customerId = null;
    if(customerName){
      const { data: existing } = await supabase.from('customers').select('*').ilike('name', customerName).limit(1);
      if(existing && existing.length) customerId = existing[0].id;
      else {
        const { data: newc } = await supabase.from('customers').insert([{ name: customerName }]).select().single();
        customerId = newc.id;
      }
    }
    const total = cart.reduce((s,c)=>s + c.unit*c.qty, 0);
    // create sale
    const { data: sale, error } = await supabase.from('sales').insert([{
      invoice_no: null, customer_id: customerId, total_amount: total, paid_amount: total, branch_id: 1
    }]).select().single();
    if(error){ alert('Sale error: '+error.message); return; }
    // create sale_items and reduce stock
    for(const item of cart){
      await supabase.from('sale_items').insert([{ sale_id: sale.id, product_id: item.id, qty: item.qty, unit_price: item.unit, amount: item.unit*item.qty }]);
      // reduce stock row (best-effort)
      const { data: stockRow } = await supabase.from('stock').select('*').match({ product_id: item.id, branch_id: 1 }).maybeSingle();
      if(stockRow){
        const newQty = Math.max(0, (stockRow.qty||0) - item.qty);
        await supabase.from('stock').update({ qty: newQty, updated_at: new Date() }).match({ id: stockRow.id });
      } else {
        // if no stock row exists, insert with 0 (sold without stock tracking)
        await supabase.from('stock').insert([{ product_id: item.id, branch_id: 1, qty: 0 }]);
      }
    }
    alert('Sale completed. Total: Rs ' + total.toFixed(2));
    cart = []; renderCart();
  });

  // load latest products into memory
  products = (await supabase.from('products').select('*')).data || [];
  renderCart();
}

async function showReports(){
  main.innerHTML = '';
  const sales = (await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(20)).data || [];
  const stock = (await supabase.from('stock').select('*, products(*)')).data || [];
  const wrap = el(`<div class="card"><h3>Reports</h3>
    <div style="margin-bottom:12px"><strong>Recent sales (20)</strong></div>
    <div id="report-sales"></div>
    <div style="margin-top:12px"><strong>Stock (all products)</strong></div>
    <div id="report-stock"></div>
  </div>`);
  main.appendChild(wrap);

  let shtml = '<table class="table"><thead><tr><th>ID</th><th>Total</th><th>Date</th></tr></thead><tbody>';
  for(const s of sales) shtml += `<tr><td>${s.id}</td><td>Rs ${s.total_amount||0}</td><td>${new Date(s.created_at).toLocaleString()}</td></tr>`;
  shtml += '</tbody></table>';
  byId('report-sales').innerHTML = shtml;

  let sthtml = '<table class="table"><thead><tr><th>Product</th><th>Branch</th><th>Qty</th></tr></thead><tbody>';
  for(const r of stock) sthtml += `<tr><td>${r.products?.name||'N/A'}</td><td>${r.branch_id||1}</td><td>${r.qty||0}</td></tr>`;
  sthtml += '</tbody></table>';
  byId('report-stock').innerHTML = sthtml;
}

/* ---------- initial setup & routing ---------- */

async function initDefaultData(){
  // ensure one branch exists (main)
  const { data: branch } = await supabase.from('branches').select('*').eq('name','Main').limit(1);
  if(!branch || branch.length===0) await supabase.from('branches').insert([{ name: 'Main', address: 'Faisalabad' }]);
}

function attachMenuHandlers(){
  document.querySelectorAll('.menu a').forEach(a=>{
    a.addEventListener('click', (ev)=>{
      ev.preventDefault();
      const v = a.dataset.view;
      routeTo(v);
      // on small screens collapse sidebar (not implemented: it's just hidden on mobile css)
    });
  });
}

function routeTo(v){
  if(v === 'dashboard') showDashboard();
  else if(v === 'products') showProducts();
  else if(v === 'add-product') showAddProduct();
  else if(v === 'pos') showPOS();
  else if(v === 'customers') showCustomers();
  else if(v === 'purchases') showPurchases();
  else if(v === 'reports') showReports();
  else showDashboard();
}

(async function start(){
  main.innerHTML = `<div class="card"><h3>Loading ERP...</h3><div class="small">Connecting to database...</div></div>`;
  attachMenuHandlers();
  try{
    await initDefaultData();
    routeTo('dashboard');
  }catch(e){
    main.innerHTML = `<div class="card"><h3>Error</h3><div class="small">Could not connect to Supabase. Check keys.</div></div>`;
    console.error(e);
  }
})();
