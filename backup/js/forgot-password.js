// Arquivo: js/forgot-password.js
import { auth } from './firebase-init.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const resetForm = document.getElementById('resetForm');
const themeToggle = document.getElementById('themeToggle');

// --- TEMA (Mesma lógica do Login) ---
const htmlElement = document.documentElement;
const sunIcon = document.querySelector('.icon-sun');
const moonIcon = document.querySelector('.icon-moon');

if (localStorage.getItem('bitto_theme') === 'dark') setTheme('dark');

function setTheme(theme) {
    if (theme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
        localStorage.setItem('bitto_theme', 'dark');
    } else {
        htmlElement.setAttribute('data-theme', 'light');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
        localStorage.setItem('bitto_theme', 'light');
    }
}

if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = htmlElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    });
}

// --- LOGICA DE RECUPERAÇÃO ---
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    const btn = resetForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    if(!email) {
        showToast("Digite seu e-mail.", "error");
        return;
    }

    try {
        btn.innerHTML = '<span class="loader"></span> Enviando...';
        btn.classList.add('btn-loading');

        // Função mágica do Firebase
        await sendPasswordResetEmail(auth, email);

        showToast("E-mail enviado! Verifique sua caixa de entrada.", "success");
        
        // Limpa o campo e espera um pouco antes de voltar
        resetForm.reset();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 4000);

    } catch (error) {
        console.error(error);
        let msg = "Erro ao enviar e-mail.";
        if(error.code === 'auth/user-not-found') msg = "E-mail não encontrado.";
        if(error.code === 'auth/invalid-email') msg = "E-mail inválido.";
        showToast(msg, "error");
        
        btn.innerHTML = originalText;
        btn.classList.remove('btn-loading');
    }
});

// Toast System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type==='success'?'✅':'⚠️';
    if(type==='error') icon='❌';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3500);
}