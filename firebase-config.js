import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, serverTimestamp };
