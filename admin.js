// admin.js
import { auth, db, serverTimestamp } from './app.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, writeBatch, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

onAuthStateChanged(auth, (user) => {
  if (user) {
    showScreen('dashboard-screen');
    loadOrders();
  } else {
    showScreen('login-screen');
  }
});

$('#login-btn').addEventListener('click', async () => {
  const email = $('#email').value.trim();
  const password = $('#password').value;

  if (!email || !password) {
    showLoginFeedback('Please enter both email and password.');
    return;
  }

  showLoginFeedback('Signing in...');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showLoginFeedback('');
  } catch (err) {
    showLoginFeedback(getAuthErrorMessage(err));
  }
});

$('#logout-btn').addEventListener('click', () => {
  signOut(auth);
});

$('#upload-menu-btn').addEventListener('click', () => {
  uploadMenu().catch(err => alert(err.message));
});

function showScreen(screenId) {
  $$('#admin-app .screen').forEach(s => s.classList.remove('active'));
  $(`#${screenId}`).classList.add('active');
}

function showLoginFeedback(message) {
  const feedback = $('#login-feedback');
  if (feedback) {
    feedback.textContent = message;
  }
}

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The email or password is incorrect.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this Firebase project. Turn it on in Authentication > Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized. Add 127.0.0.1 or localhost to Authentication > Settings > Authorized domains.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return error?.message || 'Unable to sign in. Please check your Firebase Authentication setup.';
  }
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function uploadMenu() {
  const seedData = {
    restaurant: {
      name: 'Checkpoint Backpacker Hostel',
      tagline: 'Good Food. Good People. Good Times.',
      currency: 'INR',
      symbol: '₹'
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

  const batch = writeBatch(db);
  batch.set(doc(db, 'config', 'restaurant'), seedData.restaurant);

  seedData.menu.forEach(category => {
    category.items.forEach((item, index) => {
      const docRef = doc(db, 'menu', `${slugify(category.category)}-${index + 1}`);
      batch.set(docRef, {
        ...item,
        category: category.category,
        category_icon: category.category_icon,
        available: true
      });
    });
  });

  await batch.commit();
  console.log('✅ Menu uploaded successfully!');
  alert('Menu uploaded successfully!');
}

window.uploadMenu = uploadMenu;

function loadOrders() {
  const storedOrders = JSON.parse(localStorage.getItem('checkpointOrders') || '[]');
  let html = '';

  storedOrders.forEach(order => {
    if (['completed', 'cancelled'].includes(order.status)) return;

    html += `
      <div class="order-card">
        <h3>${order.customerName}</h3>
        <p>${formatTime(order.createdAt)}</p>
        <p>Items: ${order.items.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
        <p>Total: ₹${order.total}</p>
        <p>Status: <strong>${order.status}</strong></p>
        <div class="status-buttons">
          <button data-id="${order.id}" data-status="accepted" ${order.status === 'accepted' ? 'disabled' : ''}>Accept</button>
          <button data-id="${order.id}" data-status="preparing" ${order.status !== 'accepted' ? 'disabled' : ''}>Preparing</button>
          <button data-id="${order.id}" data-status="ready" ${order.status !== 'preparing' ? 'disabled' : ''}>Ready</button>
          <button data-id="${order.id}" data-status="completed">Done</button>
        </div>
      </div>
    `;
  });

  $('#orders-list').innerHTML = html || '<p>No active orders.</p>';

  $$('.status-buttons button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const newStatus = e.target.dataset.status;
      updateOrderStatus(id, newStatus);
    });
  });

  try {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    onSnapshot(ordersQuery, (snapshot) => {
      let remoteHtml = '';
      snapshot.forEach(docSnap => {
        const order = docSnap.data();
        if (['completed', 'cancelled'].includes(order.status)) return;

        remoteHtml += `
          <div class="order-card">
            <h3>${order.customerName}</h3>
            <p>${formatTime(order.createdAt)}</p>
            <p>Items: ${order.items.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
            <p>Total: ₹${order.total}</p>
            <p>Status: <strong>${order.status}</strong></p>
            <div class="status-buttons">
              <button data-id="${docSnap.id}" data-status="accepted" ${order.status === 'accepted' ? 'disabled' : ''}>Accept</button>
              <button data-id="${docSnap.id}" data-status="preparing" ${order.status !== 'accepted' ? 'disabled' : ''}>Preparing</button>
              <button data-id="${docSnap.id}" data-status="ready" ${order.status !== 'preparing' ? 'disabled' : ''}>Ready</button>
              <button data-id="${docSnap.id}" data-status="completed">Done</button>
            </div>
          </div>
        `;
      });
      if (remoteHtml) {
        $('#orders-list').innerHTML = remoteHtml;
      }
    }, () => {
      console.warn('Realtime admin orders unavailable, showing local fallback');
    });
  } catch (error) {
    console.warn('Admin order listener failed:', error);
  }
}

function updateOrderStatus(orderId, newStatus) {
  const storedOrders = JSON.parse(localStorage.getItem('checkpointOrders') || '[]');
  const updatedOrders = storedOrders.map(order => order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date() } : order);
  localStorage.setItem('checkpointOrders', JSON.stringify(updatedOrders));
  loadOrders();

  try {
    updateDoc(doc(db, 'orders', orderId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    }).then(() => {
      console.log('Status updated');
    }).catch(err => alert('Error: ' + err.message));
  } catch (error) {
    console.warn('Remote status update failed:', error);
  }
}