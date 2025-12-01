const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const themeToggle = document.getElementById('themeToggle');

let userXP = 1250; 

// --- TILT 3D ---
const tiltElements = document.querySelectorAll('.tilt-element');
document.addEventListener('mousemove', (e) => {
    tiltElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= -50 && x <= rect.width + 50 && y >= -50 && y <= rect.height + 50) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -3; 
            const rotateY = ((x - centerX) / centerX) * 3;
            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        } else {
            el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        }
    });
});

// --- TEMA ---
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

// --- FUNÇÃO TOAST ---
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
    
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = "fadeOutToast 0.3s ease forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- MODAL CONFIRMAÇÃO LOGOUT ---
const confirmModal = document.getElementById('confirmModal');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');

function handleLogout() {
    confirmModal.classList.add('active');
}

if(cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener('click', () => {
        confirmModal.classList.remove('active');
    });
}

if(acceptConfirmBtn) {
    acceptConfirmBtn.addEventListener('click', () => {
        confirmModal.classList.remove('active');
        localStorage.removeItem('bitto_session');
        showToast("Desconectado com sucesso!", "info");
        setTimeout(() => window.location.href = 'login.html', 1000);
    });
}

const logoutBtn = document.getElementById('logoutBtn');
const modalLogoutBtn = document.getElementById('modalLogoutBtn');
if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if(modalLogoutBtn) modalLogoutBtn.addEventListener('click', handleLogout);


// --- MODAL SETTINGS ---
const settingsModal = document.getElementById('settingsModal');
const navConfigBtn = document.getElementById('navConfigBtn');
const ddAccountBtn = document.getElementById('ddAccountBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const avatarInput = document.getElementById('avatarInput');

function openSettings() {
    settingsModal.classList.add('active');
    document.getElementById('settingsNameInput').value = document.getElementById('navUserName').innerText;
}
function closeSettings() { settingsModal.classList.remove('active'); }

if(navConfigBtn) navConfigBtn.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if(ddAccountBtn) ddAccountBtn.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

if(avatarInput) {
    avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('settingsAvatarPreview');
                const placeholder = document.getElementById('settingsAvatarPlaceholder');
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
            reader.readAsDataURL(file);
        }
    });
}

if(saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        const newName = document.getElementById('settingsNameInput').value;
        if (newName) {
            document.getElementById('navUserName').innerText = newName;
            document.getElementById('ddUserName').innerText = newName;
        }
        const previewSrc = document.getElementById('settingsAvatarPreview').src;
        if (document.getElementById('settingsAvatarPreview').style.display !== 'none') {
            const navAvatar = document.querySelector('.user-profile .avatar-circle');
            navAvatar.innerHTML = `<img src="${previewSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        }
        closeSettings();
        showToast("Perfil atualizado!", "success");
    });
}

// --- OUTRAS FUNÇÕES (XP, CHAT, ETC) ---
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.getElementById('greetingText');
    let greeting = "Olá";
    if (hour >= 5 && hour < 12) greeting = "Bom dia";
    else if (hour >= 12 && hour < 18) greeting = "Boa tarde";
    else greeting = "Boa noite";
    if(greetingElement) {
        const currentName = document.getElementById('navUserName').innerText;
        greetingElement.innerText = `${greeting}, ${currentName}! 👋`;
    }
}

function updateXPBar(xp) {
    const xpLevels = [
        { limit: 100, name: "Nível 1", min: 0 },
        { limit: 250, name: "Nível 2", min: 100 },
        { limit: 500, name: "Nível 3", min: 250 },
        { limit: 900, name: "Nível 4", min: 500 },
        { limit: 1400, name: "Nível 5", min: 900 },
        { limit: 2100, name: "Nível 6", min: 1400 },
        { limit: 3000, name: "Nível 7", min: 2100 },
        { limit: 4200, name: "Nível 8", min: 3000 },
        { limit: 5800, name: "Nível 9", min: 4200 },
        { limit: 8000, name: "Nível 10", min: 5800 }
    ];
    let currentLevel = xpLevels.find(l => xp < l.limit) || xpLevels[xpLevels.length - 1];
    let range = currentLevel.limit - currentLevel.min;
    let progress = xp - currentLevel.min;
    let percentage = (progress / range) * 100;
    document.getElementById('ddLevel').innerText = currentLevel.name;
    document.getElementById('xpText').innerText = `${xp} / ${currentLevel.limit} XP`;
    document.getElementById('xpBarFill').style.width = `${percentage}%`;
}

function updateMascot(xp) {
    const mascotImg = document.getElementById('mascotImage');
    const levelText = document.getElementById('mascotLevelText');
    const xpDisplay = document.getElementById('userXP');
    let imageName = 'bittinho-0'; 
    let levelName = "Nível 1";
    if (xp >= 5800) { imageName = 'bittinho-5800'; levelName = "Nível 10"; }
    else if (xp >= 4200) { imageName = 'bittinho-4200'; levelName = "Nível 9"; }
    else if (xp >= 3000) { imageName = 'bittinho-3000'; levelName = "Nível 8"; }
    else if (xp >= 2100) { imageName = 'bittinho-2100'; levelName = "Nível 7"; }
    else if (xp >= 1400) { imageName = 'bittinho-1400'; levelName = "Nível 6"; }
    else if (xp >= 900) { imageName = 'bittinho-900'; levelName = "Nível 5"; }
    else if (xp >= 500) { imageName = 'bittinho-500'; levelName = "Nível 4"; }
    else if (xp >= 250) { imageName = 'bittinho-250'; levelName = "Nível 3"; }
    else if (xp >= 100) { imageName = 'bittinho-100'; levelName = "Nível 2"; }
    if(mascotImg) mascotImg.src = `bittinhos/${imageName}.png`;
    if(levelText) levelText.innerText = levelName;
    if(xpDisplay) xpDisplay.innerText = xp;
}

function typeWriter(text, i, fnCallback) {
    if (i < (text.length)) {
        const target = document.getElementById("typewriterText");
        if(target) {
            target.innerHTML = text.substring(0, i+1);
            setTimeout(function() { typeWriter(text, i + 1, fnCallback) }, 30);
        }
    }
}

const profileDropdown = document.getElementById('profileDropdown');
const profileBtn = document.getElementById('profileBtn');
profileBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
document.addEventListener('click', () => { profileDropdown.classList.remove('active'); });

document.addEventListener('DOMContentLoaded', () => {
    updateMascot(userXP);
    updateXPBar(userXP);
    updateGreeting();
    const welcomeMsg = "Oi! Sou o Bitto. Quanto mais estudamos, mais eu evoluo! O que vamos ver hoje?";
    typeWriter(welcomeMsg, 0);
});

function getCurrentTime() { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    let contentHtml = '';
    if (type === 'bot') {
        contentHtml = `
            <div class="header-avatar" style="border:none; background: transparent; flex-shrink:0;">
                <div class="header-avatar" style="width:32px; height:32px;">
                   <img src="imagens/bittochat.png" alt="Bitto" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
                </div>
            </div>
            <div class="message-bubble">
                ${text}
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        `;
    } else {
        contentHtml = `<div class="message-bubble">${text}<span class="message-time">${getCurrentTime()}</span></div>`;
    }
    messageDiv.innerHTML = contentHtml;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSend() {
    const text = chatInput.value.trim();
    if (text) {
        addMessage(text, 'user');
        chatInput.value = '';
        setTimeout(() => {
            const random = Math.random();
            let msg = "Analisando...";
            if(random > 0.6) msg = "Entendi! Vou adicionar isso aos seus flashcards.";
            else if(random > 0.3) msg = "Isso faz sentido. Quer criar um resumo?";
            else msg = "Interessante... Me conte mais sobre isso.";
            addMessage(msg, 'bot');
        }, 800);
    }
}

function sendChip(text) { chatInput.value = text; handleSend(); }

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });