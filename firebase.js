import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Production Firebase config connected - student-dd14b project
const firebaseConfig = {
  apiKey: "AIzaSyBYgb_274QAPkXo9WslmRTupAJG9DuC7EY",
  authDomain: "student-dd14b.firebaseapp.com",
  projectId: "student-dd14b",
  storageBucket: "student-dd14b.firebasestorage.app",
  messagingSenderId: "733464314668",
  appId: "1:733464314668:web:9bbc28c6b9f3990d872289",
  measurementId: "G-7MN39RYX81"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

