// ARQUIVO: js/tools-core.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addUserXP } from './xpSystem.js';

// ELEMENTOS DA UI (Navbar)
// Certifique-se que suas páginas de ferramentas tem esses IDs/Classes
const navName = document.getElementById('navUserName');
const navAvatar = document.querySelector('.avatar-circle'); // Se tiver mais de um, usa querySelectorAll
const toastContainer = document.getElementById('toast-container');

// --- 1. AUTENTICAÇÃO E PERFIL ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Carrega dados do usuário
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const data = snap.data();
            updateToolHeader(user, data);
        }
    } else {
        // Se não estiver logado, manda pro login
        window.location.href = 'login.html';
    }
});

// Atualiza o Topo da Página (Foto e Nome)
function updateToolHeader(user, dbData) {
    const displayName = dbData.displayName || user.displayName || "Estudante";
    const firstName = displayName.split(' ')[0];
    const photoURL = dbData.photoURL || user.photoURL;

    // Atualiza Nome
    if (navName) navName.innerText = firstName;

    // Atualiza Foto
    if (photoURL && navAvatar) {
        navAvatar.innerHTML = `<img src="${photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    }
}

// --- 2. SISTEMA DE GANHAR XP (Global) ---
// Use essa função dentro dos seus jogos: window.awardXP(10, 'Quiz')
window.awardXP = async (amount, source = "Atividade") => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const result = await addUserXP(user.uid, amount, source);
        
        // Mostra o Toast de Sucesso
        showToolToast(`+${amount} XP! ${result.leveledUp ? 'SUBIU DE NÍVEL! 🆙' : ''}`, 'success');
        
        // Se quiser tocar um som, pode por aqui
    } catch (error) {
        console.error("Erro ao dar XP:", error);
    }
};

// --- 3. TOAST (Notificação Visual) ---
function showToolToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    // Estilos inline básicos caso o CSS não carregue
    toast.style.cssText = `
        background: white; color: #111; padding: 12px 20px; border-radius: 8px; 
        box-shadow: 0 4px 15px rgba(0,0,0,0.2); margin-top: 10px; display: flex; 
        align-items: center; gap: 10px; font-family: sans-serif; font-weight: bold;
        border-left: 4px solid ${type === 'success' ? '#CCFF00' : 'red'};
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `<span>${type==='success'?'🚀':'⚠️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3000);
}