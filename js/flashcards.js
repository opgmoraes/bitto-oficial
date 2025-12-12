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

// Deck Inicial
let currentDeck = [
    { q: 'Bem-vindo ao BITTO!', a: 'Sua plataforma de estudos. Digite QUALQUER tema acima para gerar cards.' },
    { q: 'Nova Navegação', a: 'Use as Setas ⬅️ ➡️ para mudar de card. Use Seta Cima ⬆️ ou Enter para virar.' }
];
let currentIndex = 0;

// --- UI UPDATE ---
function updateCardUI() {
    if(flipCard) flipCard.classList.remove('is-flipped');
    
    setTimeout(() => {
        if(currentDeck && currentDeck[currentIndex]) {
            if(cardFrontText) cardFrontText.innerText = currentDeck[currentIndex].q;
            if(cardBackText) cardBackText.innerText = currentDeck[currentIndex].a;
            
            if(progressText) progressText.innerText = `${currentIndex + 1} / ${currentDeck.length}`;
            
            if(progressBar) {
                const percent = ((currentIndex + 1) / currentDeck.length) * 100;
                progressBar.style.width = `${percent}%`;
            }
        }
    }, 250);
}

function toggleFlip() {
    if(flipCard) flipCard.classList.toggle('is-flipped');
}

// --- NAVEGAÇÃO ---
if(prevBtn) {
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) { currentIndex--; updateCardUI(); }
    });
}

if(nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (currentIndex < currentDeck.length - 1) { currentIndex++; updateCardUI(); }
        else { showToast('Deck finalizado! 🎉', 'success'); }
    });
}

if(flipBtn) flipBtn.addEventListener('click', toggleFlip);
if(flipCard) flipCard.addEventListener('click', toggleFlip);

// --- ATALHOS DE TECLADO ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'Enter') { 
        e.preventDefault(); 
        toggleFlip(); 
    }
    if (e.code === 'ArrowRight') if(nextBtn) nextBtn.click();
    if (e.code === 'ArrowLeft') if(prevBtn) prevBtn.click();
});

// --- GERADOR BITTO ---
if(generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const topic = document.getElementById('deckTopic').value;
        const content = document.getElementById('aiContent').value;
        
        const qtyInput = document.querySelector('input[name="cardQty"]:checked');
        const quantity = qtyInput ? parseInt(qtyInput.value) : 5;

        if (!topic && !content.trim()) {
            showToast('Digite um tema para estudar!', 'error');
            return;
        }

        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="loader"></span> CONSULTANDO BITTO...';
        generateBtn.classList.add('btn-loading');
        generateBtn.disabled = true;
        
        if(statusText) {
            statusText.style.display = 'block';
            statusText.innerText = "Gerando plano de estudos...";
        }

        try {
            const prompt = `
                Você é o BITTO AI, um Tutor Universal.
                Analise o tema: "${topic}" e contexto: "${content}".
                Crie um array JSON com EXATAMENTE ${quantity} flashcards.
                
                SAÍDA OBRIGATÓRIA (JSON PURO):
                [{"q": "Pergunta (Frente)", "a": "Resposta (Verso)"}]
                Idioma: Português Brasileiro. Sem markdown.
            `;

            // CORREÇÃO: Removido modelo específico. O backend decide.
            const response = await fetch('/api/generate', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Erro na API Backend");
            }

            const data = await response.json();
            
            let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("A IA respondeu vazio.");

            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const newDeck = JSON.parse(rawText);

            if (!Array.isArray(newDeck)) throw new Error("Formato inválido recebido.");

            currentDeck = newDeck;
            currentIndex = 0;
            
            if(newDeck.length === 1 && newDeck[0].q.includes("Bloqueado")) {
                if(deckTitle) deckTitle.innerText = "Tema Recusado";
                showToast('Tema bloqueado por segurança.', 'error');
            } else {
                if(deckTitle) deckTitle.innerText = topic || "Deck de Estudos";
                showToast(`Sucesso! ${newDeck.length} cards criados.`, 'success');
            }

            updateCardUI();
            
            if(window.innerWidth < 900) {
                const studyArea = document.querySelector('.study-column');
                if(studyArea) studyArea.scrollIntoView({ behavior: 'smooth' });
            }

        } catch (error) {
            console.error("Erro:", error);
            showToast(error.message, 'error');
            if(statusText) statusText.innerText = "Falha: " + error.message;
            
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.classList.remove('btn-loading');
            generateBtn.disabled = false;
            if(statusText) setTimeout(() => statusText.style.display = 'none', 5000);
        }
    });
}

// --- TEMA & TOAST ---
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const sunIcon = document.querySelector('.icon-sun');
        const moonIcon = document.querySelector('.icon-moon');
        if (html.getAttribute('data-theme') === 'dark') {
            html.setAttribute('data-theme', 'light');
            if(sunIcon) sunIcon.style.display = 'block';
            if(moonIcon) moonIcon.style.display = 'none';
        } else {
            html.setAttribute('data-theme', 'dark');
            if(sunIcon) sunIcon.style.display = 'none';
            if(moonIcon) moonIcon.style.display = 'block';
        }
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
    let icon = type === 'success' ? '✅' : '⚠️';
    if(type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.animation = "fadeOutToast 0.3s ease forwards"; 
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

// Init
updateCardUI();