// customer.js
import { db } from './app.js';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

let cart = [];
let currentOrderId = null;
let unsubscribe = null;
let isOrdering = false;

const fallbackMenuData = {
  restaurant: {
    name: 'Checkpoint Backpacker Hostel',
    tagline: 'Good Food. Good People. Good Times.'
  },
  menu: [
    {
      category: 'Breakfast',
      category_icon: 'sun',
      items: [
        { id: 1, name: 'Aloo/Pyaz Paratha + Curd + Pickle', price: 80, description: 'Potato/onion stuffed flatbread with yogurt and pickle' },
        { id: 2, name: 'Poha', price: 60, description: 'Flattened rice breakfast dish' },
        { id: 3, name: 'Masala Paratha + Pickle', price: 70, description: 'Spiced flatbread with pickle' },
        { id: 4, name: 'Masala Maggi', price: 60, description: 'Spiced instant noodles' },
        { id: 5, name: 'Masala Maggie', price: 70, description: 'Spiced instant noodles' },
        { id: 6, name: 'Tea', price: 20, description: 'Indian chai' },
        { id: 7, name: 'Coffee', price: 30, description: 'Hot coffee' }
      ]
    },
    {
      category: 'Lunch',
      category_icon: 'plate',
      items: [
        { id: 8, name: 'Dal Chawal + Salad/Pickle', price: 100, description: 'Lentils and rice with salad or pickle' },
        { id: 9, name: 'Rajma Chawal', price: 120, description: 'Kidney bean curry with rice' },
        { id: 10, name: 'Chole Chawal', price: 120, description: 'Chickpea curry with rice' },
        { id: 11, name: 'Simple Veg Thali', price: 150, description: 'Dal + Sabzi + Rice + 3 Roti' },
        { id: 12, name: 'Paneer Curry + Rice', price: 160, description: 'Cottage cheese curry with rice' },
        { id: 13, name: 'Mix Veg + Rice', price: 140, description: 'Mixed vegetable curry with rice' },
        { id: 14, name: 'Jeera Rice + Dal Tadka', price: 130, description: 'Cumin rice with tempered lentils' }
      ]
    },
    {
      category: 'Dinner',
      category_icon: 'moon',
      items: [
        { id: 15, name: 'Dal Chawal', price: 100, description: 'Lentils and rice' },
        { id: 16, name: 'Dal + 4 Roti', price: 100, description: 'Lentils with 4 flatbreads' },
        { id: 17, name: 'Seasonal Sabzi + 4 Roti', price: 110, description: 'Seasonal vegetable curry with 4 flatbreads' },
        { id: 18, name: 'Dal + Sabzi + 3 Roti', price: 140, description: 'Lentils, vegetable curry, and 3 flatbreads' },
        { id: 19, name: 'Simple Veg Thali', price: 150, description: 'Dal + Sabzi + Rice + 3 Roti' },
        { id: 20, name: 'Paneer Masala + 4 Roti', price: 160, description: 'Cottage cheese curry with 4 flatbreads' },
        { id: 21, name: 'Jeera Rice + Dal Tadka', price: 130, description: 'Cumin rice with tempered lentils' },
        { id: 22, name: 'Veg Pulao + Raita', price: 140, description: 'Vegetable rice with yogurt dip' }
      ]
    }
  ]
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

$('#start-order').addEventListener('click', () => {
  const name = $('#customer-name').value.trim();
  if (name.length < 2) {
    alert('Please enter your name');
    return;
  }

  localStorage.setItem('checkpointResumeOrder', 'false');
  localStorage.removeItem('checkpointOrderId');
  localStorage.removeItem('checkpointName');

  $('#status-name').textContent = name;
  showScreen('menu-screen');
  loadMenu();
});

function showScreen(screenId) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#${screenId}`).classList.add('active');
}

function getCategoryIcon(icon) {
  switch (icon) {
    case 'sun': return '☀️';
    case 'plate': return '🍽️';
    case 'moon': return '🌙';
    default: return '🍴';
  }
}

async function loadMenu() {
  const menuContainer = $('#menu-items');
  const tabsContainer = $('#category-tabs');

  const grouped = {};
  fallbackMenuData.menu.forEach(category => {
    grouped[category.category] = category.items.map(item => ({ ...item, category: category.category, category_icon: category.category_icon, available: true }));
  });

  let tabsHTML = '';
  Object.keys(grouped).forEach(cat => {
    const icon = getCategoryIcon(grouped[cat][0].category_icon);
    tabsHTML += `<button class="cat-tab" data-cat="${cat}">${icon} ${cat}</button>`;
  });
  tabsContainer.innerHTML = tabsHTML;

  const firstCat = Object.keys(grouped)[0];
  renderCategory(grouped[firstCat]);

  tabsContainer.onclick = (e) => {
    if (e.target.classList.contains('cat-tab')) {
      const cat = e.target.dataset.cat;
      renderCategory(grouped[cat]);
    }
  };

  try {
    const menuQuery = query(collection(db, 'menu'), where('available', '==', true));
    const snapshot = await getDocs(menuQuery);
    const remoteGrouped = {};

    snapshot.forEach(docSnap => {
      const item = { id: docSnap.id, ...docSnap.data() };
      if (!remoteGrouped[item.category]) remoteGrouped[item.category] = [];
      remoteGrouped[item.category].push(item);
    });

    if (Object.keys(remoteGrouped).length > 0) {
      const remoteCats = Object.keys(remoteGrouped);
      tabsContainer.innerHTML = remoteCats.map(cat => {
        const icon = getCategoryIcon(remoteGrouped[cat][0].category_icon);
        return `<button class="cat-tab" data-cat="${cat}">${icon} ${cat}</button>`;
      }).join('');
      renderCategory(remoteGrouped[remoteCats[0]]);
      tabsContainer.onclick = (e) => {
        if (e.target.classList.contains('cat-tab')) {
          const cat = e.target.dataset.cat;
          renderCategory(remoteGrouped[cat]);
        }
      };
    }
  } catch (error) {
    console.warn('Using starter menu:', error);
  }
}

function renderCategory(items) {
  const menuContainer = $('#menu-items');
  let html = '';
  items.forEach(item => {
    html += `
      <div class="menu-item">
        <div class="item-info">
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <span class="price">₹${item.price}</span>
        </div>
        <button class="add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">+</button>
      </div>
    `;
  });
  menuContainer.innerHTML = html;

  $$('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseInt(btn.dataset.price, 10);
      addToCart(id, name, price);
    });
  });
}

function addToCart(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, qty: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  const cartList = $('#cart-list');
  const totalEl = $('#cart-total');
  const countEl = $('#cart-count');
  const placeBtn = $('#place-order');

  let total = 0;
  let count = 0;
  cartList.innerHTML = '';

  cart.forEach(item => {
    total += item.price * item.qty;
    count += item.qty;
    const li = document.createElement('li');
    li.innerHTML = `${item.name} x${item.qty} <button class="remove-item" data-id="${item.id}">×</button>`;
    cartList.appendChild(li);
  });

  totalEl.textContent = total;
  countEl.textContent = count;
  placeBtn.disabled = cart.length === 0 || isOrdering;

  $$('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      cart = cart.filter(item => item.id !== id);
      updateCartUI();
    });
  });
}

$('#place-order').addEventListener('click', () => {
  if (isOrdering) return;

  const name = $('#customer-name').value.trim();
  if (cart.length === 0) return;

  isOrdering = true;
  const placeBtn = $('#place-order');
  placeBtn.disabled = true;
  placeBtn.textContent = 'Placing...';

  const orderData = {
    customerName: name,
    items: cart.map(item => ({ id: item.id, name: item.name, qty: item.qty, price: item.price })),
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    status: 'placed',
    paymentMethod: 'cash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const fallbackId = `local-${Date.now()}`;
  const storedOrders = JSON.parse(localStorage.getItem('checkpointOrders') || '[]');
  storedOrders.push({ ...orderData, id: fallbackId, source: 'local-fallback' });
  localStorage.setItem('checkpointOrders', JSON.stringify(storedOrders));

  currentOrderId = fallbackId;
  localStorage.setItem('checkpointOrderId', currentOrderId);
  localStorage.setItem('checkpointName', name);
  localStorage.setItem('checkpointResumeOrder', 'true');

  cart = [];
  updateCartUI();

  showScreen('status-screen');
  playOrderSound();
  showSuccessCelebration();
  $('#status-message').innerHTML = '<span class="status-badge">✓ Order placed</span><br>Our chef is preparing your order now.';
  startAutoStatusFlow();
  listenToOrder();

  isOrdering = false;
  placeBtn.disabled = false;
  placeBtn.textContent = 'Place Order';

  addDoc(collection(db, 'orders'), orderData)
    .then((docRef) => {
      currentOrderId = docRef.id;
      localStorage.setItem('checkpointOrderId', currentOrderId);
    })
    .catch((error) => {
      console.warn('Firestore order write failed, using local fallback:', error);
      localStorage.setItem('checkpointOrderId', fallbackId);
    });
});

function listenToOrder() {
  if (unsubscribe) unsubscribe();

  const storedOrders = JSON.parse(localStorage.getItem('checkpointOrders') || '[]');
  const localOrder = storedOrders.find(order => order.id === currentOrderId);

  if (localOrder) {
    updateStatusUI(localOrder.status || 'placed');
    return;
  }

  unsubscribe = onSnapshot(doc(db, 'orders', currentOrderId), (docSnap) => {
    if (docSnap.exists()) {
      updateStatusUI(docSnap.data().status);
    }
  }, (error) => {
    console.warn('Realtime order listener failed, using local fallback UI:', error);
    updateStatusUI('placed');
  });
}

function playOrderSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (error) {
    console.warn('Audio not available:', error);
  }
}

function showSuccessCelebration() {
  const statusScreen = $('#status-screen');
  statusScreen.classList.add('celebrate');
  setTimeout(() => statusScreen.classList.remove('celebrate'), 1200);
}

function startAutoStatusFlow() {
  const stages = ['placed', 'accepted', 'preparing'];
  let index = 0;

  const tick = () => {
    if (index < stages.length) {
      updateStatusUI(stages[index]);
      index += 1;
      setTimeout(tick, 5000);
    }
  };

  tick();
}

function updateStatusUI(status) {
  const steps = $$('.status-step');
  let activate = true;

  steps.forEach(step => {
    step.classList.remove('active', 'done');
    if (step.dataset.step === status) {
      step.classList.add('active');
      activate = false;
    } else if (activate) {
      step.classList.add('done');
    }
  });

  let message = '';
  switch (status) {
    case 'placed':
      message = '<span class="status-badge">✓ Order placed</span><br>Chef is getting your meal ready...';
      break;
    case 'accepted':
      message = '<span class="status-badge">👨‍🍳 Chef accepted your order</span><br>Your food is now in the kitchen queue.';
      break;
    case 'preparing':
      message = '<span class="status-badge">🔥 The chef is preparing your order</span><br>Almost there — smell that magic?';
      break;
    case 'ready':
      message = '<span class="status-badge">✅ Your order is ready</span><br>Please collect it from the counter.';
      break;
    case 'completed':
      message = '<span class="status-badge">✨ Enjoy your meal</span><br>Thanks for ordering with Checkpoint.';
      break;
    default:
      message = 'Order updated.';
  }

  $('#status-message').innerHTML = message;
  $('#order-summary').innerHTML = `
    <p><strong>Order status:</strong> ${status}</p>
    <p><strong>Payment:</strong> Cash at pickup</p>
  `;
}

window.addEventListener('load', () => {
  const savedOrderId = localStorage.getItem('checkpointOrderId');
  const savedName = localStorage.getItem('checkpointName');
  const shouldResume = localStorage.getItem('checkpointResumeOrder') === 'true';

  if (shouldResume && savedOrderId && savedName) {
    currentOrderId = savedOrderId;
    $('#customer-name').value = savedName;
    $('#status-name').textContent = savedName;
    showScreen('status-screen');
    listenToOrder();
  } else {
    localStorage.removeItem('checkpointOrderId');
    localStorage.removeItem('checkpointName');
    localStorage.setItem('checkpointResumeOrder', 'false');
  }
});
