import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const themeToggle = document.getElementById('themeToggle');
const navName = document.getElementById('navUserName');
const navAvatar = document.querySelector('.avatar-circle');

// Elementos de Valor
const valFlashcards = document.getElementById('valFlashcards');
const valQuiz = document.getElementById('valQuiz');
const valReview = document.getElementById('valReview');
const currentMonthDisplay = document.getElementById('currentMonthDisplay');

// --- DATA ATUAL ---
const date = new Date();
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
if(currentMonthDisplay) {
    currentMonthDisplay.innerText = `${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
}

// --- AUTENTICAÇÃO E DADOS ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Carrega Navbar
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const data = snap.data();
            updateHeader(user, data);
            updateStats(data.stats || {});
        }
    } else {
        window.location.href = 'login.html';
    }
});

function updateHeader(user, dbData) {
    const displayName = dbData.displayName || user.displayName || "Estudante";
    if (navName) navName.innerText = displayName.split(' ')[0];
    const photoURL = dbData.photoURL || user.photoURL;
    if (photoURL && navAvatar) {
        navAvatar.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }
}

function updateStats(stats) {
    // Animação simples de contagem
    animateValue(valFlashcards, 0, stats.flashcardsGen || 0, 1000);
    animateValue(valQuiz, 0, stats.quizGen || 0, 1000);
    animateValue(valReview, 0, stats.reviewGen || 0, 1000);
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- TEMA ---
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const sunIcon = document.querySelector('.icon-sun');
        const moonIcon = document.querySelector('.icon-moon');
        
        if (html.getAttribute('data-theme') === 'dark') {
            html.setAttribute('data-theme', 'light');
            if(sunIcon) sunIcon.style.display = 'block';
            if(moonIcon) moonIcon.style.display = 'none';
        } else {
            html.setAttribute('data-theme', 'dark');
            if(sunIcon) sunIcon.style.display = 'none';
            if(moonIcon) moonIcon.style.display = 'block';
        }
    });
}