import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Elementos
const themeToggle = document.getElementById('themeToggle');
const navName = document.getElementById('navUserName');
const navAvatar = document.querySelector('.avatar-circle');

// Stats Elements
const valTotal = document.getElementById('valTotal');
const valFlashcards = document.getElementById('valFlashcards');
const valQuiz = document.getElementById('valQuiz');
const valReview = document.getElementById('valReview');
const currentMonthDisplay = document.getElementById('currentMonthDisplay');
const monthProgressBar = document.getElementById('monthProgressBar');
const daysLeftText = document.getElementById('daysLeftText');

// --- 1. CÁLCULO DE DATAS (MÊS) ---
function setupMonthInfo() {
    const date = new Date();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    // Nome do Mês
    if(currentMonthDisplay) {
        currentMonthDisplay.innerText = `${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
    }

    // Dias Restantes
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); // Último dia do mês (28, 30, 31)
    const today = date.getDate();
    const daysLeft = lastDay - today;
    const progress = (today / lastDay) * 100;

    if(monthProgressBar) monthProgressBar.style.width = `${progress}%`;
    if(daysLeftText) daysLeftText.innerText = `${daysLeft} dias restantes para o Reset Mensal`;
}

// --- 2. AUTENTICAÇÃO E DADOS ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
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
    // Busca valores (se não existir, usa 0)
    const flashcards = stats.flashcardsGen || 0;
    const quiz = stats.quizGen || 0;
    const review = stats.reviewGen || 0;
    const total = stats.cardsGeneratedMonth || (flashcards + quiz + review); // Fallback soma manual

    // Anima os números
    animateValue(valFlashcards, 0, flashcards, 1000);
    animateValue(valQuiz, 0, quiz, 1000);
    animateValue(valReview, 0, review, 1000);
    animateValue(valTotal, 0, total, 1500);
}

// Efeito de contagem "slot machine"
function animateValue(obj, start, end, duration) {
    if(!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end; // Garante valor final exato
        }
    };
    window.requestAnimationFrame(step);
}

// --- TEMA E UI ---
setupMonthInfo();

// Tilt 3D
const tiltElements = document.querySelectorAll('.tilt-element');
document.addEventListener('mousemove', (e) => {
    if(window.innerWidth > 768) { // Só no PC
        tiltElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= -20 && x <= rect.width + 20 && y >= -20 && y <= rect.height + 20) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -2; 
                const rotateY = ((x - centerX) / centerX) * 2;
                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            } else {
                el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            }
        });
    }
});

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