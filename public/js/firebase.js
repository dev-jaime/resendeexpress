// js/firebase.js
// Firestore modular v9+
// Substitua os valores do firebaseConfig abaixo pelas suas credenciais
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB08o9qqRQklCb5BckWswP6VbA8HXxVX1g",
  authDomain: "resendeexpress.firebaseapp.com",
  projectId: "resendeexpress",
  storageBucket: "resendeexpress.firebasestorage.app",
  messagingSenderId: "276573193219",
  appId: "1:276573193219:web:0749aaa2a57326e299ba36",
  measurementId: "G-E0Z9YWEXQR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// exporta o que for necessário
window.Firebase = {
  app,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  serverTimestamp
};
