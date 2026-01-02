// Arquivo: js/login.js
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, googleProvider } from './firebase-init.js';
import { syncUserDatabase } from './userManager.js';

const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const googleBtn = document.getElementById('googleBtn'); // Adicione id="googleBtn" no botão Google do HTML

// UI - Mantendo sua lógica de Tilt e Tema
const themeToggle = document.getElementById('themeToggle');
// ... (Mantenha o código do Tilt e ThemeToggle original aqui, ele não muda) ...
// (Para economizar espaço, foquei na lógica nova abaixo)

// Função Toast
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    // ... (ícones SVG) ...
    toast.innerHTML = message; // Simplificado
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3000);
}

// --- LÓGICA DE LOGIN FIREBASE ---

// Login Email/Senha
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const pass = loginForm.querySelector('input[type="password"]').value;
    const btn = loginForm.querySelector('button[type="submit"]');

    try {
        btn.innerHTML = '<span class="loader"></span> Entrando...';
        btn.classList.add('btn-loading');

        const result = await signInWithEmailAndPassword(auth, email, pass);
        await syncUserDatabase(result.user); // Garante sync no banco

        showToast("Login realizado!", "success");
        setTimeout(() => window.location.href = '../index.html', 1000);

    } catch (error) {
        console.error(error);
        let msg = "Erro ao entrar.";
        if(error.code === 'auth/invalid-credential') msg = "Dados incorretos.";
        showToast(msg, "error");
        btn.innerHTML = "Entrar";
        btn.classList.remove('btn-loading');
    }
});

// Registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm.querySelector('input[type="email"]').value;
    const pass = registerForm.querySelector('input[type="password"]').value;
    const btn = registerForm.querySelector('button[type="submit"]');

    try {
        btn.innerHTML = '<span class="loader"></span> Criando...';
        btn.classList.add('btn-loading');

        const result = await createUserWithEmailAndPassword(auth, email, pass);
        await syncUserDatabase(result.user);

        showToast("Conta criada com sucesso!", "success");
        setTimeout(() => window.location.href = '../index.html', 1000);

    } catch (error) {
        let msg = "Erro ao criar conta.";
        if(error.code === 'auth/email-already-in-use') msg = "Email já cadastrado.";
        if(error.code === 'auth/weak-password') msg = "Senha muito fraca.";
        showToast(msg, "error");
        btn.innerHTML = "Criar Conta";
        btn.classList.remove('btn-loading');
    }
});

// Login Google
if(googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await syncUserDatabase(result.user);
            showToast("Conectado com Google!", "success");
            setTimeout(() => window.location.href = '../index.html', 1000);
        } catch (error) {
            console.error(error);
            showToast("Erro no Google Login.", "error");
        }
    });
}

// Alternância de Telas (Login/Register) - Mantém sua lógica original
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    formTitle.innerText = "Crie sua conta";
    formSubtitle.innerText = "Junte-se à comunidade Bitto";
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    formTitle.innerText = "Bem-vindo de volta";
    formSubtitle.innerText = "Entre para continuar seus estudos";
});