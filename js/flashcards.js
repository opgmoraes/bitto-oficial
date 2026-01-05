import { auth, db } from './firebase-init.js'; // Adicionei db para o perfil
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const themeToggle = document.getElementById('themeToggle');
const flipCard = document.getElementById('flashcardElement');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const flipBtn = document.getElementById('flipBtn');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const cardFrontText = document.getElementById('cardFrontText');
const cardBackText = document.getElementById('cardBackText');
const generateBtn = document.getElementById('generateBtn');
const deckTitle = document.getElementById('deckTitle');
const statusText = document.getElementById('statusText');

// Elementos de Perfil (Para corrigir o sumiço)
const navName = document.getElementById('navUserName');
const navAvatar = document.querySelector('.avatar-circle');

let currentDeck = [
    { q: 'Bem-vindo ao BITTO!', a: 'Sua plataforma de estudos. Digite QUALQUER tema acima para gerar cards.' },
    { q: 'Login Necessário', a: 'Agora seus estudos são salvos e contados no seu plano.' }
];
let currentIndex = 0;
let currentUser = null;

// --- AUTH E PERFIL ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Restaurar Perfil Visual
        try {
            if(navName || navAvatar) {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    if(navName) navName.innerText = data.displayName?.split(' ')[0] || "Aluno";
                    if(navAvatar && data.photoURL) navAvatar.innerHTML = `<img src="${data.photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                }
            }
        } catch(e) { console.error("Erro perfil:", e); }
    } else {
        window.location.href = 'login.html';
    }
});

function updateCardUI() {
    if(flipCard) flipCard.classList.remove('is-flipped');
    setTimeout(() => {
        if(currentDeck && currentDeck[currentIndex]) {
            cardFrontText.innerText = currentDeck[currentIndex].q;
            cardBackText.innerText = currentDeck[currentIndex].a;
            if(progressText) progressText.innerText = `${currentIndex + 1} / ${currentDeck.length}`;
            if(progressBar) {
                const percent = ((currentIndex + 1) / currentDeck.length) * 100;
                progressBar.style.width = `${percent}%`;
            }
        }
    }, 250);
}

function toggleFlip() { if(flipCard) flipCard.classList.toggle('is-flipped'); }

if(prevBtn) prevBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; updateCardUI(); } });
if(nextBtn) nextBtn.addEventListener('click', () => { 
    if (currentIndex < currentDeck.length - 1) { 
        currentIndex++; 
        updateCardUI(); 
    } else { 
        showToast('Deck finalizado! 🎉 +50 XP', 'success');
        if(window.awardXP) window.awardXP(50, 'Flashcards Concluído');
        currentIndex = 0; setTimeout(updateCardUI, 1000);
    }
});
if(flipBtn) flipBtn.addEventListener('click', toggleFlip);
if(flipCard) flipCard.addEventListener('click', toggleFlip);

// --- GERADOR BLINDADO ---
if(generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const topic = document.getElementById('deckTopic').value;
        const content = document.getElementById('aiContent').value;
        const qtyInput = document.querySelector('input[name="cardQty"]:checked');
        const quantity = qtyInput ? parseInt(qtyInput.value) : 5;

        if (!topic && !content.trim()) { showToast('Digite um tema!', 'error'); return; }
        if (!currentUser) { showToast('Faça login.', 'error'); return; }

        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="loader"></span> PROCESSANDO...';
        generateBtn.classList.add('btn-loading');
        generateBtn.disabled = true;
        
        if(statusText) { statusText.style.display = 'block'; statusText.innerText = "Verificando limites e gerando..."; }

        try {
            // 1. Obter Token Seguro
            const token = await currentUser.getIdToken();

            const prompt = `
                Você é o BITTO AI, Tutor Universal.
                Tema: "${topic}". Contexto: "${content}".
                Crie um JSON array com ${quantity} flashcards.
                Formato: [{"q": "Pergunta", "a": "Resposta"}]
                Idioma: Português BR. JSON PURO.
            `;

            // 2. Chamar API com Token e Tipo (para cobrança)
            const response = await fetch('../api/generate', {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    model: "gemini-2.0-flash",
                    type: 'flashcards' // Importante para o backend saber o que cobrar
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if(response.status === 403) throw new Error("🔒 Limite atingido! Faça upgrade.");
                throw new Error(data.error || "Erro na geração.");
            }

            let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("IA retornou vazio.");
            
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const newDeck = JSON.parse(rawText);

            currentDeck = newDeck;
            currentIndex = 0;

            if(window.recordActivity) window.recordActivity('flashcards', quantity); 
            if(window.awardXP) window.awardXP(10, 'Criação de Deck');

            if(deckTitle) deckTitle.innerText = topic || "Deck Gerado";
            showToast(`Sucesso! ${newDeck.length} cards criados.`, 'success');
            updateCardUI();

        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
            if(statusText) statusText.innerText = "Erro.";
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.classList.remove('btn-loading');
            generateBtn.disabled = false;
            if(statusText) setTimeout(() => statusText.style.display = 'none', 5000);
        }
    });
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type==='success'?'✅':(type==='error'?'❌':'ℹ️');
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

if(themeToggle) themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

updateCardUI();