// Importa as funções do Firebase (Versão Modular - mais leve)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLE SUA CONFIGURAÇÃO AQUI (Do passo 1)
const firebaseConfig = {
    apiKey: "AIzaSyDuGpzkLI-1wFOK9wfrGblhoTqW_gQJA30",
    authDomain: "bitto-99fac.firebaseapp.com",
    projectId: "bitto-99fac",
    storageBucket: "bitto-99fac.firebasestorage.app",
    messagingSenderId: "483124758230",
    appId: "1:483124758230:web:cdf73555872c8fe733eb77",
    measurementId: "G-3VKVXDVEZM"
  };

// Inicializa
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp };