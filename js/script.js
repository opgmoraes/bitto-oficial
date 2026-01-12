import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-init.js';
import { checkMonthlyReset, calculateLevel } from './xpSystem.js';

// ELEMENTOS UI
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const themeToggle = document.getElementById('themeToggle');

// MENU MOBILE
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const mobileConfigBtn = document.getElementById('mobileConfigBtn');
const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

// --- 1. AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await checkMonthlyReset(user);

        const emailInput = document.getElementById('settingsEmailInput');
        if(emailInput) emailInput.value = user.email;

        // LISTENER REAL-TIME (Isso garante que o XP atualize na hora)
        onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                updateInterface(user, docSnapshot.data());
            }
        });

        setupSettingsSave(user);

    } else {
        // [CORREÇÃO] Volta para a raiz para achar o index.html
        window.location.href = '../index.html';
    }
});

// --- 2. ATUALIZA INTERFACE ---
function updateInterface(user, dbData) {
    const currentXP = dbData.xp || 0;
    const levelData = calculateLevel(currentXP);
    const displayName = dbData.displayName || user.displayName || "Estudante";
    const firstName = displayName.split(' ')[0];

    // ATUALIZA TEXTOS GERAIS
    document.getElementById('navUserName').innerText = firstName;
    document.getElementById('ddUserName').innerText = displayName;
    document.getElementById('userXP').innerText = currentXP; // XP TOTAL
    document.getElementById('xpText').innerText = `${currentXP} / ${levelData.limit} XP`;
    document.getElementById('ddLevel').innerText = `Nível ${levelData.level}`;
    document.getElementById('mascotLevelText').innerText = `Nível ${levelData.level}`;

    // === LÓGICA DO CARD "CARDS GERADOS" ===
    const stats = dbData.stats || {};
    const generatedCount = stats.cardsGeneratedMonth || 0;
    
    const generatedCountEl = document.getElementById('generatedCount');
    const generatedDetailsEl = document.getElementById('generatedDetails');
    
    if(generatedCountEl) {
        generatedCountEl.innerText = `${generatedCount} Cards`;
        if(generatedCount > 50) generatedCountEl.style.color = "var(--accent-green)";
        else generatedCountEl.style.color = "var(--primary-blue)";
    }
    
    if(generatedDetailsEl) {
        generatedDetailsEl.innerText = "Criados este mês";
    }

    // Barra de Progresso
    let range = levelData.limit - levelData.min;
    let progress = currentXP - levelData.min;
    let percentage = Math.max(0, Math.min(100, (progress / range) * 100));
    const bar = document.getElementById('xpBarFill');
    if(bar) bar.style.width = `${percentage}%`;

    updateGreeting(firstName);
    updateMascotImage(currentXP);

    // Avatar
    const photoURL = dbData.photoURL || user.photoURL;
    if (photoURL) {
        document.querySelectorAll('.avatar-circle, .avatar-placeholder-large').forEach(el => {
            el.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        });
        const preview = document.getElementById('settingsAvatarPreview');
        const placeholder = document.getElementById('settingsAvatarPlaceholder');
        if(preview) { preview.src = photoURL; preview.style.display = 'block'; }
        if(placeholder) placeholder.style.display = 'none';
    }
    
    const nameInput = document.getElementById('settingsNameInput');
    if(nameInput) nameInput.value = displayName;
}

function updateMascotImage(xp) {
    const mascotImg = document.getElementById('mascotImage');
    if (!mascotImg) return;
    let imageName = 'bittinho-0';
    if (xp >= 5800) imageName = 'bittinho-5800'; 
    else if (xp >= 4200) imageName = 'bittinho-4200';
    else if (xp >= 3000) imageName = 'bittinho-3000';
    else if (xp >= 2100) imageName = 'bittinho-2100';
    else if (xp >= 1400) imageName = 'bittinho-1400';
    else if (xp >= 900) imageName = 'bittinho-900';
    else if (xp >= 500) imageName = 'bittinho-500';
    else if (xp >= 250) imageName = 'bittinho-250';
    else if (xp >= 100) imageName = 'bittinho-100';
    
    // [CORREÇÃO] Sai da pasta pages (../) e entra em bittinhos
    mascotImg.src = `../bittinhos/${imageName}.png`;
}

function updateGreeting(name) {
    const hour = new Date().getHours();
    const greetingElement = document.getElementById('greetingText');
    if (greetingElement) {
        let greeting = "Olá";
        if (hour >= 5 && hour < 12) greeting = "Bom dia";
        else if (hour >= 12 && hour < 18) greeting = "Boa tarde";
        else greeting = "Boa noite";
        greetingElement.innerText = `${greeting}, ${name}! 👋`;
    }
}

// LÓGICA DO MENU MOBILE
function toggleMobileMenu() {
    mobileMenu.classList.toggle('active');
    mobileMenuOverlay.classList.toggle('active');
}

if(hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMobileMenu);
if(closeMenuBtn) closeMenuBtn.addEventListener('click', toggleMobileMenu);
if(mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', toggleMobileMenu);

// Conectar botão de configurações do mobile ao modal
if(mobileConfigBtn) {
    mobileConfigBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMobileMenu(); // Fecha o menu
        openSettings(); // Abre modal
    });
}
// Conectar botão de sair do mobile ao modal
if(mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMobileMenu();
        openLogoutModal();
    });
}


// Configurações e Logout
const settingsModal = document.getElementById('settingsModal');
const navConfigBtn = document.getElementById('navConfigBtn');
const ddAccountBtn = document.getElementById('ddAccountBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const avatarInput = document.getElementById('avatarInput');

function openSettings() { settingsModal.classList.add('active'); }
function closeSettings() { settingsModal.classList.remove('active'); }

if(navConfigBtn) navConfigBtn.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if(ddAccountBtn) ddAccountBtn.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

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

function setupSettingsSave(user) {
    if(saveSettingsBtn) {
        const newBtn = saveSettingsBtn.cloneNode(true);
        saveSettingsBtn.parentNode.replaceChild(newBtn, saveSettingsBtn);
        newBtn.addEventListener('click', async () => {
            const newName = document.getElementById('settingsNameInput').value;
            const previewSrc = document.getElementById('settingsAvatarPreview').src;
            const hasNewImage = document.getElementById('settingsAvatarPreview').style.display !== 'none';
            const originalText = newBtn.innerText;
            newBtn.innerText = "Salvando...";
            newBtn.disabled = true;
            try {
                await updateProfile(user, { displayName: newName });
                const updateData = { displayName: newName };
                if (hasNewImage && previewSrc.startsWith('data:image')) updateData.photoURL = previewSrc; 
                await updateDoc(doc(db, "users", user.uid), updateData);
                showToast("Perfil atualizado!", "success");
                closeSettings();
            } catch (error) {
                console.error(error);
                showToast("Erro ao atualizar.", "error");
            } finally {
                newBtn.innerText = originalText;
                newBtn.disabled = false;
            }
        });
    }
}

const logoutBtn = document.getElementById('logoutBtn');
const modalLogoutBtn = document.getElementById('modalLogoutBtn');
const confirmModal = document.getElementById('confirmModal');
const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

function openLogoutModal(e) { if(e) e.preventDefault(); confirmModal.classList.add('active'); }
if(logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
if(modalLogoutBtn) modalLogoutBtn.addEventListener('click', openLogoutModal);
if(cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', () => confirmModal.classList.remove('active'));

if(acceptConfirmBtn) acceptConfirmBtn.addEventListener('click', async () => { 
    await signOut(auth); 
    // [CORREÇÃO] Volta para a raiz
    window.location.href = '../index.html'; 
});

// UI Tilt e Tema
const tiltElements = document.querySelectorAll('.tilt-element');
document.addEventListener('mousemove', (e) => {
    if(window.innerWidth > 900) {
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
    }
});

themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('bitto_theme', newTheme);
    updateThemeIcons(newTheme);
});
function updateThemeIcons(theme) {
    const sun = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    if(theme === 'dark') { sun.style.display = 'none'; moon.style.display = 'block'; } 
    else { sun.style.display = 'block'; moon.style.display = 'none'; }
}
if(localStorage.getItem('bitto_theme') === 'dark') updateThemeIcons('dark');
else updateThemeIcons('light');

const profileDropdown = document.getElementById('profileDropdown');
const profileBtn = document.getElementById('profileBtn');
if(profileBtn) profileBtn.addEventListener('click', (e) => { e.stopPropagation(); profileDropdown.classList.toggle('active'); });
document.addEventListener('click', () => { if(profileDropdown) profileDropdown.classList.remove('active'); });

function typeWriter(text, i) {
    if (i < (text.length)) {
        const target = document.getElementById("typewriterText");
        if(target) {
            target.innerHTML = text.substring(0, i+1);
            setTimeout(function() { typeWriter(text, i + 1) }, 30);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => { typeWriter("Oi! Sou o Bitto. Vamos evoluir juntos?", 0); });
window.sendChip = (text) => { if(chatInput) { chatInput.value = text; handleSend(); } }
function handleSend() {
    const text = chatInput.value.trim();
    if (text) {
        addMessage(text, 'user');
        chatInput.value = '';
        setTimeout(() => {
            const msgs = ["Interessante!", "Vou anotar isso.", "Continue assim!", "Foco nos estudos!"];
            addMessage(msgs[Math.floor(Math.random() * msgs.length)], 'bot');
        }, 1000);
    }
}
if(sendBtn) sendBtn.addEventListener('click', handleSend);
if(chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // [CORREÇÃO] Sai da pasta pages (../) e entra em imagens
    let contentHtml = type === 'bot' 
        ? `<div class="header-avatar" style="border:none; background: transparent; flex-shrink:0;"><div class="header-avatar" style="width:32px; height:32px;"><img src="../imagens/bittochat.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;"></div></div><div class="message-bubble">${text}<span class="message-time">${time}</span></div>` 
        : `<div class="message-bubble">${text}<span class="message-time">${time}</span></div>`;
    
    messageDiv.innerHTML = contentHtml;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type==='success'?'✅':(type==='error'?'❌':'ℹ️');
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3000);
}