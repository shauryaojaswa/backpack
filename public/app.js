import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-analytics.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDYucvdOMymeCAqxQ2pA8dzFtgy4H_lR40',
  authDomain: 'checkpoint-backpackers.firebaseapp.com',
  projectId: 'checkpoint-backpackers',
  storageBucket: 'checkpoint-backpackers.firebasestorage.app',
  messagingSenderId: '388997975313',
  appId: '1:388997975313:web:b182812e39d1a79098d0b0',
  measurementId: 'G-LKCVVKC44X'
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

window.app = app;
window.auth = auth;
window.db = db;
window.analytics = analytics;
window.firebase = { app, auth, db, analytics };

export { app, auth, db, analytics, serverTimestamp };

