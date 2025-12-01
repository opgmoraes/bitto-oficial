const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const themeToggle = document.getElementById('themeToggle');

// FUNÇÃO TOAST (REPLICADA PARA FUNCIONAR NO LOGIN)
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if(type === 'success') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    if(type === 'info') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    toast.innerHTML = `${icon} ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOutToast 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

if (localStorage.getItem('bitto_session') === 'active') { window.location.href = 'index.html'; }

const tiltElement = document.querySelector('.tilt-element');
document.addEventListener('mousemove', (e) => {
    if(tiltElement) {
        const rect = tiltElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= -50 && x <= rect.width + 50 && y >= -50 && y <= rect.height + 50) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5; 
            const rotateY = ((x - centerX) / centerX) * 5;
            tiltElement.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        } else {
            tiltElement.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        }
    }
});

themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        html.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
});

const togglePassBtns = document.querySelectorAll('.toggle-pass-btn');
togglePassBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const eyeOpen = btn.querySelector('.eye-open');
        const eyeClosed = btn.querySelector('.eye-closed');
        if (input.type === 'password') {
            input.type = 'text';
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
        } else {
            input.type = 'password';
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
        }
    });
});

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

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('button[type="submit"]');
    btn.innerHTML = '<span class="loader"></span> Carregando...';
    btn.classList.add('btn-loading');
    
    setTimeout(() => {
        localStorage.setItem('bitto_session', 'active');
        showToast("Login realizado com sucesso!", "success");
        setTimeout(() => window.location.href = 'index.html', 1000);
    }, 1500);
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('button[type="submit"]');
    btn.innerHTML = '<span class="loader"></span> Criando...';
    btn.classList.add('btn-loading');
    const nameInput = registerForm.querySelector('input[type="text"]');
    if(nameInput) localStorage.setItem('bitto_username', nameInput.value);
    setTimeout(() => {
        localStorage.setItem('bitto_session', 'active');
        showToast("Conta criada com sucesso!", "success");
        setTimeout(() => window.location.href = 'index.html', 1000);
    }, 1500);
});