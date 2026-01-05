import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const themeToggle = document.getElementById('themeToggle');
const generateBtn = document.getElementById('generateBtn');
const topicInput = document.getElementById('topicInput');
const contentInput = document.getElementById('contentInput');
const reviewOutput = document.getElementById('reviewOutput');
const emptyState = document.getElementById('emptyState');
const outputActions = document.getElementById('outputActions');
const copyBtn = document.getElementById('copyBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const reviewTitle = document.getElementById('reviewTitle');
const statusText = document.getElementById('statusText');

// Perfil
const navName = document.getElementById('navUserName');
const navAvatar = document.querySelector('.avatar-circle');

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            if(navName || navAvatar) {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    if(navName) navName.innerText = data.displayName?.split(' ')[0] || "Aluno";
                    if(navAvatar && data.photoURL) navAvatar.innerHTML = `<img src="${data.photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                }
            }
        } catch(e) {}
    } else {
        window.location.href = 'login.html';
    }
});

if(generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput ? topicInput.value : "";
        const content = contentInput ? contentInput.value : "";

        if (!content.trim() && !topic.trim()) { showToast('Preencha algo!', 'error'); return; }
        if (!currentUser) { showToast('Login necessário.', 'error'); return; }

        generateBtn.innerHTML = '<span class="loader"></span> ANALISANDO...';
        generateBtn.classList.add('btn-loading');
        generateBtn.disabled = true;
        if(statusText) { statusText.style.display = 'block'; statusText.innerText = "Gerando síntese técnica..."; }

        try {
            const token = await currentUser.getIdToken();
            const prompt = `
                BITTO AI - Modo Professor Técnico.
                Tema: "${topic}". Conteúdo: "${content}".
                Gere: 1. Resumo Teórico (Conceitos, Aplicação). 2. Simulado (15 questões variadas). 3. Gabarito.
                Formato: Markdown bonito. Idioma: PT-BR.
            `;

            const response = await fetch('../api/generate', {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: prompt }] }],
                    type: 'review', 
                    model: "gemini-2.0-flash" 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if(response.status === 403) throw new Error("🔒 Limite atingido!");
                throw new Error(data.error);
            }

            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // XSS Protection
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                const unsafeHtml = marked.parse(aiResponse);
                reviewOutput.innerHTML = DOMPurify.sanitize(unsafeHtml); 
            } else {
                reviewOutput.textContent = aiResponse;
            }
            
            if(window.recordActivity) window.recordActivity('review', 1);
            if(window.awardXP) window.awardXP(20, 'Resumo');
            
            if(emptyState) emptyState.style.display = 'none';
            reviewOutput.style.display = 'block';
            if(outputActions) outputActions.style.display = 'flex';
            if(topic && reviewTitle) reviewTitle.innerText = `Revisão: ${topic}`;
            showToast('Resumo gerado!', 'success');

        } catch (error) {
            showToast(error.message, 'error');
            if(statusText) statusText.innerText = "Erro na conexão.";
        } finally {
            generateBtn.innerHTML = 'CRIAR GUIA ⚡';
            generateBtn.classList.remove('btn-loading');
            generateBtn.disabled = false;
            if(statusText) setTimeout(() => statusText.style.display = 'none', 5000);
        }
    });
}

if(downloadPdfBtn) downloadPdfBtn.addEventListener('click', () => { if (typeof html2pdf === 'undefined') { alert("Erro PDF."); return; } const element = document.getElementById('reviewOutput'); html2pdf().from(element).save(); });
if(copyBtn) copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(reviewOutput.innerText).then(() => showToast('Copiado!', 'success')); });
if(themeToggle) themeToggle.addEventListener('click', () => { const html = document.documentElement; html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });
function showToast(message, type = 'success') { let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); } const toast = document.createElement('div'); toast.className = `toast toast-${type}`; toast.innerHTML = `<span>${type==='success'?'✅':'⚠️'}</span> ${message}`; container.appendChild(toast); setTimeout(() => { toast.remove() }, 3500); }