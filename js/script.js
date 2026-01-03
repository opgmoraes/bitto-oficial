import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-init.js';
import { checkMonthlyReset, calculateLevel } from './xpSystem.js';

// --- ELEMENTOS UI ---
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const themeToggle = document.getElementById('themeToggle');

// --- 1. AUTENTICAÇÃO & INICIALIZAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Verifica reset mensal assim que loga
        await checkMonthlyReset(user);

        // LISTENER EM TEMPO REAL (Onde a mágica acontece)
        // Sempre que o XP mudar no banco, essa função roda automaticamente
        onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                updateInterface(user, data);
            }
        });

        // Configura botão de salvar perfil com o UID correto
        setupSettingsSave(user);

    } else {
        // Se não tiver usuário, chuta pro login
        window.location.href = 'pages/login.html';
    }
});

// --- 2. ATUALIZAÇÃO DA INTERFACE (DOM) ---
function updateInterface(user, dbData) {
    const currentXP = dbData.xp || 0;
    const levelData = calculateLevel(currentXP);
    
    // NOME: Prefere o do Banco, senão Auth, senão Padrão
    const displayName = dbData.displayName || user.displayName || "Estudante";
    const firstName = displayName.split(' ')[0];

    // Atualiza Textos na Tela
    document.getElementById('navUserName').innerText = firstName;
    document.getElementById('ddUserName').innerText = displayName;
    document.getElementById('userXP').innerText = currentXP;
    document.getElementById('xpText').innerText = `${currentXP} / ${levelData.limit} XP`;
    document.getElementById('ddLevel').innerText = `Nível ${levelData.level}`;
    document.getElementById('mascotLevelText').innerText = `Nível ${levelData.level}`;

    // Atualiza Saudação (Bom dia/Tarde/Noite)
    updateGreeting(firstName);

    // Atualiza Barra de Progresso
    let range = levelData.limit - levelData.min;
    let progress = currentXP - levelData.min;
    let percentage = Math.max(0, Math.min(100, (progress / range) * 100)); // Trava entre 0 e 100
    document.getElementById('xpBarFill').style.width = `${percentage}%`;

    // Atualiza Mascote (Evolução)
    updateMascotImage(currentXP);

    // Atualiza Avatar (Se tiver)
    const photoURL = dbData.photoURL || user.photoURL;
    if (photoURL) {
        const avatars = document.querySelectorAll('.avatar-circle, .avatar-placeholder-large');
        avatars.forEach(el => {
            el.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        });
        // Atualiza preview no modal tbm
        const modalPreview = document.getElementById('settingsAvatarPreview');
        const modalPlaceholder = document.getElementById('settingsAvatarPlaceholder');
        if(modalPreview && modalPlaceholder) {
            modalPreview.src = photoURL;
            modalPreview.style.display = 'block';
            modalPlaceholder.style.display = 'none';
        }
    }
    
    // Preenche input de nome no modal
    document.getElementById('settingsNameInput').value = displayName;
}

// Lógica de Imagem do Mascote (Bittinho)
function updateMascotImage(xp) {
    const mascotImg = document.getElementById('mascotImage');
    if (!mascotImg) return;

    let imageName = 'bittinho-0'; // Padrão
    
    // Faixas de XP (Sincronizado com xpSystem.js)
    if (xp >= 5800) imageName = 'bittinho-5800'; 
    else if (xp >= 4200) imageName = 'bittinho-4200';
    else if (xp >= 3000) imageName = 'bittinho-3000';
    else if (xp >= 2100) imageName = 'bittinho-2100';
    else if (xp >= 1400) imageName = 'bittinho-1400';
    else if (xp >= 900) imageName = 'bittinho-900';
    else if (xp >= 500) imageName = 'bittinho-500';
    else if (xp >= 250) imageName = 'bittinho-250';
    else if (xp >= 100) imageName = 'bittinho-100';
    
    mascotImg.src = `bittinhos/${imageName}.png`;
}

function updateGreeting(name) {
    const hour = new Date().getHours();
    const greetingElement = document.getElementById('greetingText');
    if (!greetingElement) return;

    let greeting = "Olá";
    if (hour >= 5 && hour < 12) greeting = "Bom dia";
    else if (hour >= 12 && hour < 18) greeting = "Boa tarde";
    else greeting = "Boa noite";
    
    greetingElement.innerText = `${greeting}, ${name}! 👋`;
}

// --- 3. CONFIGURAÇÕES & PERFIL ---
// Modal Settings
const settingsModal = document.getElementById('settingsModal');
const navConfigBtn = document.getElementById('navConfigBtn');
const ddAccountBtn = document.getElementById('ddAccountBtn'); // Botão "Minha Conta" no dropdown
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const avatarInput = document.getElementById('avatarInput');

// Abrir Modal
function openSettings() { settingsModal.classList.add('active'); }
function closeSettings() { settingsModal.classList.remove('active'); }

if(navConfigBtn) navConfigBtn.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if(ddAccountBtn) ddAccountBtn.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

// Preview de Avatar Local
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

// Salvar Perfil no Firebase
function setupSettingsSave(user) {
    if(saveSettingsBtn) {
        // Remove listeners antigos para não duplicar
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
                // 1. Atualiza no Auth (Login)
                await updateProfile(user, {
                    displayName: newName,
                    // Nota: Para salvar imagem real no Storage precisaríamos de outro código.
                    // Aqui vamos salvar a Base64 no Firestore (limitado, mas funciona pro MVP)
                    // ou apenas manter a URL se fosse externa.
                });

                // 2. Atualiza no Firestore (Dados Visuais)
                const updateData = { displayName: newName };
                
                // Se o usuário selecionou uma imagem nova (Base64)
                if (hasNewImage && previewSrc.startsWith('data:image')) {
                    // ATENÇÃO: Base64 pode ser pesado. O ideal futuramente é usar Firebase Storage.
                    // Por enquanto, salvamos no Firestore.
                    updateData.photoURL = previewSrc; 
                }

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

// --- 4. LOGOUT ---
const logoutBtn = document.getElementById('logoutBtn');
const modalLogoutBtn = document.getElementById('modalLogoutBtn');
const confirmModal = document.getElementById('confirmModal');
const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');

function openLogoutModal(e) { 
    if(e) e.preventDefault();
    confirmModal.classList.add('active'); 
}

if(logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
if(modalLogoutBtn) modalLogoutBtn.addEventListener('click', openLogoutModal);
if(cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', () => confirmModal.classList.remove('active'));

if(acceptConfirmBtn) {
    acceptConfirmBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'pages/login.html';
    });
}

// --- 5. UI GERAL (Tilt, Tema, Chat) ---

// Tilt 3D
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

// Tema
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
    if(theme === 'dark') {
        sun.style.display = 'none'; moon.style.display = 'block';
    } else {
        sun.style.display = 'block'; moon.style.display = 'none';
    }
}
// Init Tema
if(localStorage.getItem('bitto_theme') === 'dark') updateThemeIcons('dark');
else updateThemeIcons('light');

// Dropdown Menu
const profileDropdown = document.getElementById('profileDropdown');
const profileBtn = document.getElementById('profileBtn');
if(profileBtn) {
    profileBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        profileDropdown.classList.toggle('active'); 
    });
}
document.addEventListener('click', () => { 
    if(profileDropdown) profileDropdown.classList.remove('active'); 
});

// Chatbot (Mantido Visualmente)
function typeWriter(text, i) {
    if (i < (text.length)) {
        const target = document.getElementById("typewriterText");
        if(target) {
            target.innerHTML = text.substring(0, i+1);
            setTimeout(function() { typeWriter(text, i + 1) }, 30);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const welcomeMsg = "Oi! Sou o Bitto. Vamos evoluir juntos?";
    typeWriter(welcomeMsg, 0);
});

window.sendChip = (text) => { 
    if(chatInput) { chatInput.value = text; handleSend(); }
}

function handleSend() {
    const text = chatInput.value.trim();
    if (text) {
        addMessage(text, 'user');
        chatInput.value = '';
        setTimeout(() => {
            const msgs = ["Interessante!", "Vou anotar isso.", "Continue assim!", "Foco nos estudos!"];
            const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
            addMessage(randomMsg, 'bot');
        }, 1000);
    }
}
if(sendBtn) sendBtn.addEventListener('click', handleSend);
if(chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let contentHtml = '';
    if (type === 'bot') {
        contentHtml = `
            <div class="header-avatar" style="border:none; background: transparent; flex-shrink:0;">
                <div class="header-avatar" style="width:32px; height:32px;">
                   <img src="imagens/bittochat.png" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
                </div>
            </div>
            <div class="message-bubble">${text}<span class="message-time">${time}</span></div>
        `;
    } else {
        contentHtml = `<div class="message-bubble">${text}<span class="message-time">${time}</span></div>`;
    }
    messageDiv.innerHTML = contentHtml;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

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
    let icon = type==='success'?'✅':(type==='error'?'❌':'ℹ️');
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3000);
}