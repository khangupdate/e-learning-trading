// ============================================
// FIREBASE CONFIG
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCw6M0ancZPIdsF8ag9hAT-xslLnKrfatA",
  authDomain: "e-learning-trading.firebaseapp.com",
  projectId: "e-learning-trading",
  storageBucket: "e-learning-trading.firebasestorage.app",
  messagingSenderId: "300051723668",
  appId: "1:300051723668:web:dda7d0490cad3d21e3cb81",
  measurementId: "G-BGZ19H2EXP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin email cố định
export const ADMIN_EMAIL = "admin@elearning.com";
