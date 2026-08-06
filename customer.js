import { db } from './app.js';
import { collection, query, where, getDocs, setDoc, onSnapshot, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

let cart = [];
let currentOrderId = null;
let unsubscribe = null;
let localListenerInterval = null;
let autoFlowStopped = false;
let isOrdering = false;

const fallbackMenuData = {
  menu: [
    { category: 'Breakfast', category_icon: 'sun', items: [
      { id: 1, name: 'Aloo/Pyaz Paratha + Curd + Pickle', price: 80, description: 'Potato/onion stuffed flatbread with yogurt and pickle' },
      { id: 2, name: 'Poha', price: 60, description: 'Flattened rice breakfast dish' },
      { id: 3, name: 'Masala Maggi', price: 60, description: 'Spiced instant noodles' },
      { id: 4, name: 'Tea', price: 20, description: 'Indian chai' },
      { id: 5, name: 'Coffee', price: 30, description: 'Hot coffee' }
    ]},
    { category: 'Lunch', category_icon: 'plate', items: [
      { id: 6, name: 'Dal Chawal + Salad/Pickle', price: 100, description: 'Lentils and rice with salad or pickle' },
      { id: 7, name: 'Rajma Chawal', price: 120, description: 'Kidney bean curry with rice' },
      { id: 8, name: 'Simple Veg Thali', price: 150, description: 'Dal + Sabzi + Rice + 3 Roti' }
    ]},
    { category: 'Dinner', category_icon: 'moon', items: [
      { id: 9, name: 'Dal + 4 Roti', price: 100, description: 'Lentils with 4 flatbreads' },
      { id: 10, name: 'Paneer Masala + 4 Roti', price: 160, description: 'Cottage cheese curry with 4 flatbreads' }
    ]}
  ]
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function generateOrderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return 'CP-' + code;
}

$('#start-order').addEventListener('click', () => {
  const name = $('#customer-name').value.trim();
  if (name.length < 2) return alert('Please enter your name');
  $('#status-name').textContent = name;
  showScreen('menu-screen');
  loadMenu();
});

function showScreen(screenId) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#${screenId}`).classList.add('active');
}

function getCategoryIcon(icon) {
  if (icon === 'sun') return '☀️';
  if (icon === 'plate') return '🍽️';
  if (icon === 'moon') return '🌙';
  return '🍴';
}

function groupMenu(menuArray) {
  const grouped = {};
  menuArray.forEach(category => {
    grouped[category.category] = category.items.map(item => ({ ...item, category: category.category, category_icon: category.category_icon }));
  });
  return grouped;
}

function renderTabs(grouped) {
  const tabsContainer = $('#category-tabs');
  tabsContainer.innerHTML = Object.keys(grouped).map(cat =>
    `<button class="cat-tab" data-cat="${cat}">${getCategoryIcon(grouped[cat][0].category_icon)} ${cat}</button>`
  ).join('');
  renderCategory(grouped[Object.keys(grouped)[0]]);
  tabsContainer.onclick = (e) => {
    if (e.target.classList.contains('cat-tab')) renderCategory(grouped[e.target.dataset.cat]);
  };
}

async function loadMenu() {
  renderTabs(groupMenu(fallbackMenuData.menu));
  try {
    const snapshot = await getDocs(query(collection(db, 'menu'), where('available', '==', true)));
    const remote = {};
    snapshot.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      if (!item.category_icon) item.category_icon = item.category === 'Breakfast' ? 'sun' : item.category === 'Lunch' ? 'plate' : 'moon';
      (remote[item.category] = remote[item.category] || []).push(item);
    });
    if (Object.keys(remote).length > 0) renderTabs(remote);
  } catch (error) {
    console.warn('Using starter menu:', error);
  }
}

function renderCategory(items) {
  const menuContainer = $('#menu-items');
  menuContainer.innerHTML = items.map(item => `
    <div class="menu-item">
      <div class="item-info">
        <h3>${item.name}</h3>
        <p>${item.description || ''}</p>
        <span class="price">₹${item.price}</span>
      </div>
      <button class="add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">+</button>
    </div>
  `).join('');

  $$('.add-to-cart').forEach(btn => btn.addEventListener('click', () => addToCart(btn.dataset.id, btn.dataset.name, parseInt(btn.dataset.price))));
}

function addToCart(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++; else cart.push({ id, name, price, qty: 1 });
  updateCartUI();
}

function updateCartUI() {
  const cartList = $('#cart-list');
  let total = 0, count = 0;
  cartList.innerHTML = '';
  cart.forEach(item => {
    total += item.price * item.qty; count += item.qty;
    const li = document.createElement('li');
    li.textContent = `${item.name} x${item.qty} `;
    const btn = document.createElement('button');
    btn.className = 'remove-item'; btn.textContent = '×';
    btn.onclick = () => { cart = cart.filter(c => c.id !== item.id); updateCartUI(); };
    li.appendChild(btn); cartList.appendChild(li);
  });
  $('#cart-total').textContent = total;
  $('#cart-count').textContent = count;
  $('#place-order').disabled = cart.length === 0 || isOrdering;
}

$('#place-order').addEventListener('click', async () => {
  if (isOrdering) return;
  const name = $('#customer-name').value.trim();
  if (!name || cart.length === 0) return;

  isOrdering = true;
  const placeBtn = $('#place-order');
  placeBtn.disabled = true;
  placeBtn.textContent = 'Placing...';

  showScreen('status-screen');

  const orderCode = generateOrderCode();
  const orderData = {
    orderCode,
    customerName: name,
    items: cart.map(item => ({ id: item.id, name: item.name, qty: item.qty, price: item.price })),
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    status: 'placed',
    paymentMethod: 'cash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  cart = [];
  updateCartUI();
  updateStatusUI('placed');
  playOrderSound();

  let remoteId = null;
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
    await Promise.race([ setDoc(doc(db, 'orders', orderCode), orderData), timeoutPromise ]);
    remoteId = orderCode;
  } catch (error) {
    console.warn('Firebase slow/blocked, using local demo mode');
  }

  autoFlowStopped = false;
  currentOrderId = remoteId || ('local-' + Date.now());
  localStorage.setItem('checkpointOrderId', currentOrderId);

  if (remoteId) {
    listenToOrder();
    startAutoStatusFlow();
  } else {
    const storedOrders = JSON.parse(localStorage.getItem('checkpointOrders') || '[]');
    storedOrders.push({ ...orderData, id: currentOrderId, source: 'local-fallback' });
    localStorage.setItem('checkpointOrders', JSON.stringify(storedOrders));
    startAutoStatusFlow();
    startLocalAdminListener();
  }

  isOrdering = false;
  placeBtn.disabled = false;
  placeBtn.textContent = 'Place Order ★';
});

function startAutoStatusFlow() {
  const stages = ['placed', 'accepted', 'preparing'];
  let index = 0;
  const tick = () => {
    if (index < stages.length && !autoFlowStopped) {
      updateStatusUI(stages[index]);
      syncStatusToFirebase(stages[index]);
      index += 1;
      if (index < stages.length) setTimeout(tick, 10000);
    }
  };
  tick();
}

function syncStatusToFirebase(status) {
  if (currentOrderId && !currentOrderId.startsWith('local-')) {
    updateDoc(doc(db, 'orders', currentOrderId), { status }).catch(() => {});
  }
}

function startLocalAdminListener() {
  if (localListenerInterval) clearInterval(localListenerInterval);
  localListenerInterval = setInterval(() => {
    const storedOrders = JSON.parse(localStorage.getItem('checkpointOrders') || '[]');
    const order = storedOrders.find(o => o.id === currentOrderId);
    if (order && (order.status === 'ready' || order.status === 'completed')) {
      autoFlowStopped = true;
      updateStatusUI(order.status);
      clearInterval(localListenerInterval);
      localListenerInterval = null;
    }
  }, 1000);
}

function listenToOrder() {
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(doc(db, 'orders', currentOrderId), (docSnap) => {
    if (!docSnap.exists()) return;
    const status = docSnap.data().status;
    if (status === 'ready' || status === 'completed') {
      autoFlowStopped = true;
      updateStatusUI(status);
    }
  }, (error) => console.warn('Listener failed:', error));
}

function updateStatusUI(status) {
  const steps = $$('.status-step');
  const order = ['placed', 'accepted', 'preparing', 'ready'];
  const currentIndex = order.indexOf(status);

  steps.forEach(step => {
    step.classList.remove('active', 'done');
    const stepIndex = order.indexOf(step.dataset.step);
    if (stepIndex === currentIndex) step.classList.add('active');
    else if (stepIndex < currentIndex) step.classList.add('done');
  });

  let message = '';
  switch (status) {
    case 'placed': message = '<span class="status-badge">✓ Order placed</span><br>Chef is getting your meal ready...'; break;
    case 'accepted': message = '<span class="status-badge">👨‍ Chef accepted your order</span><br>Your food is now in the kitchen queue.'; break;
    case 'preparing': message = '<span class="status-badge">🔥 The chef is preparing your order</span><br>Waiting for the chef to finish...'; break;
    case 'ready': message = '<span class="status-badge">✅ Your order is ready</span><br>Please collect it from the counter.'; break;
    case 'completed': message = '<span class="status-badge">✨ Enjoy your meal</span><br>Thanks for ordering with Checkpoint.'; break;
  }
  $('#status-message').innerHTML = message;
  $('#order-summary').innerHTML = `
    <p><strong>Order ID:</strong> <span class="order-code">${currentOrderId || '-'}</span></p>
    <p><strong>Order status:</strong> ${status}</p>
    <p><strong>Payment:</strong> Cash at pickup</p>
  `;
}

function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}
