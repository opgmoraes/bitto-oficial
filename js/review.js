import { auth, onAuthStateChanged } from './firebase-init.js';
import { checkUsageLimit, incrementUsage } from './userManager.js';

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

let currentUser = null;

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    if (user) currentUser = user;
    else window.location.href = 'login.html';
});

// --- EVENTO DE GERAR ---
if(generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput ? topicInput.value : "";
        const content = contentInput ? contentInput.value : "";

        if (!content.trim() && !topic.trim()) {
            showToast('Cole um texto ou defina um tema!', 'error');
            return;
        }

        if(!currentUser) return;

        // 1. LIMIT CHECK (Plano)
        const canUse = await checkUsageLimit(currentUser.uid, 'review');
        if (!canUse) {
            showToast('🔒 Limite mensal atingido (2/2).', 'error');
            return;
        }

        // UI Loading
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="loader"></span> BITTO PROCESSANDO...';
        generateBtn.classList.add('btn-loading');
        generateBtn.disabled = true;
        if(statusText) {
            statusText.style.display = 'block';
            statusText.innerText = "Gerando síntese técnica...";
        }

        try {
            const prompt = `
                BITTO AI - Modo Professor Técnico.
                Tema: "${topic}". Conteúdo: "${content}".
                Gere: 1. Resumo Teórico (Conceitos, Aplicação). 2. Simulado (15 questões variadas). 3. Gabarito.
                Formato: Markdown bonito. Idioma: PT-BR.
            `;

            const response = await fetch('../api/generate', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemini-2.5-flash-lite",
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) throw new Error("Erro no Servidor");

            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!aiResponse) throw new Error("A IA não gerou resposta.");

            // Render Markdown
            if (typeof marked !== 'undefined') {
                reviewOutput.innerHTML = marked.parse(aiResponse);
            } else {
                reviewOutput.innerHTML = `<pre style="white-space: pre-wrap;">${aiResponse}</pre>`;
            }
            
            // 2. INCREMENT LIMIT (Plano)
            await incrementUsage(currentUser.uid, 'review');
            
            // --- 3. XP E ESTATÍSTICAS (NOVO) ---
            if(window.recordActivity) window.recordActivity('review', 1); // Conta geração
            if(window.awardXP) window.awardXP(20, 'Resumo IA'); // Ganha XP

            // UI Sucesso
            if(emptyState) emptyState.style.display = 'none';
            reviewOutput.style.display = 'block';
            if(outputActions) outputActions.style.display = 'flex';
            if(topic && reviewTitle) reviewTitle.innerText = `Revisão: ${topic}`;
            showToast('Revisão gerada com sucesso!', 'success');

        } catch (error) {
            console.error(error);
            showToast('Erro ao gerar.', 'error');
            statusText.innerText = "Erro na conexão.";
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.classList.remove('btn-loading');
            generateBtn.disabled = false;
            if(statusText) setTimeout(() => statusText.style.display = 'none', 5000);
        }
    });
}

// --- UTILS ---
if(downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        if (typeof html2pdf === 'undefined') { alert("Erro: Lib html2pdf não carregada."); return; }
        const element = document.getElementById('reviewOutput');
        const opt = { margin: 10, filename: 'Bitto_Resumo.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        html2pdf().set(opt).from(element).save();
    });
}

if(copyBtn) {
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(reviewOutput.innerText)
            .then(() => showToast('Copiado!', 'success'));
    });
}

if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        if (html.getAttribute('data-theme') === 'dark') html.setAttribute('data-theme', 'light');
        else html.setAttribute('data-theme', 'dark');
    });
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type==='success'?'✅':'⚠️'}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3500);
}