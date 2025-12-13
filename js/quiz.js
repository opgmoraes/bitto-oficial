const themeToggle = document.getElementById('themeToggle');
const startBtn = document.getElementById('startQuizBtn');
const nextBtn = document.getElementById('nextQuestionBtn');

// Elementos de UI
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const gameActive = document.getElementById('gameActive');
const gameResult = document.getElementById('gameResult');

const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackArea = document.getElementById('feedbackArea');
const feedbackMsg = document.getElementById('feedbackMsg');
const scoreBadge = document.getElementById('scoreBadge');
const progressSteps = document.getElementById('progressSteps');
const finalScoreEl = document.getElementById('finalScore');
const resultTopicEl = document.getElementById('resultTopic');
const gameTitle = document.getElementById('gameTitle');
const statusText = document.getElementById('statusText');

// CONFIGURAÇÃO
// ⚠️ Se não usar backend, insira a chave aqui. Se usar backend (/api/generate), a chave fica no servidor.
// Para este exemplo, manterei a estrutura do flashcards.js que sugere backend, 
// mas você pode reverter para a chamada direta se preferir.
const API_URL = "/api/generate"; 

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
const TOTAL_QUESTIONS = 5;

// --- INICIAR JOGO ---
if(startBtn) {
    startBtn.addEventListener('click', async () => {
        const topic = document.getElementById('quizTopic').value;
        const difficultyEl = document.querySelector('input[name="difficulty"]:checked');
        const difficulty = difficultyEl ? difficultyEl.value : 'Iniciante';

        if (!topic.trim()) {
            showToast('Digite um tema para começar!', 'error');
            return;
        }

        // Setup UI
        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<span class="loader"></span> GERANDO...';
        startBtn.classList.add('btn-loading');
        startBtn.disabled = true;

        emptyState.style.display = 'none';
        loadingState.style.display = 'flex';
        gameResult.style.display = 'none';
        gameActive.style.display = 'none';

        try {
            await fetchQuestions(topic, difficulty);
            
            // Sucesso
            loadingState.style.display = 'none';
            gameActive.style.display = 'block';
            if(gameTitle) gameTitle.innerText = topic;
            if(resultTopicEl) resultTopicEl.innerText = topic;
            
            score = 0;
            currentQuestionIndex = 0;
            if(scoreBadge) scoreBadge.innerText = `XP: ${score}`;
            
            setupProgressSteps();
            loadQuestion();

        } catch (error) {
            console.error(error);
            showToast('Erro ao criar quiz. Tente novamente.', 'error');
            
            loadingState.style.display = 'none';
            emptyState.style.display = 'flex';
            
            startBtn.innerHTML = originalText;
            startBtn.classList.remove('btn-loading');
            startBtn.disabled = false;
        } finally {
             // Retorna botão ao normal caso sucesso
             startBtn.innerHTML = originalText;
             startBtn.classList.remove('btn-loading');
             startBtn.disabled = false;
        }
    });
}

// --- API FETCH (Estrutura Flashcards.js) ---
async function fetchQuestions(topic, difficulty) {
    const prompt = `
        Gere um Quiz JSON válido sobre: "${topic}".
        Nível: ${difficulty}.
        Quantidade: ${TOTAL_QUESTIONS} perguntas.
        
        FORMATO OBRIGATÓRIO (JSON ARRAY):
        [
            {
                "q": "Pergunta curta aqui?",
                "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
                "correct": 0,
                "why": "Explicação curta (1 frase)."
            }
        ]
        
        Regras:
        1. JSON PURO. Sem markdown.
        2. Português Brasil.
    `;

    // ⚠️ Se você não tiver backend configurado, substitua este fetch pela chamada direta ao Gemini
    // igual você tinha no arquivo quiz.js antigo, apenas atualizando o prompt.
    const response = await fetch('../api/generate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gemini-2.5-flash-lite", // Usando modelo rápido
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) throw new Error("Erro na API");

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if(!rawText) throw new Error("Resposta vazia.");

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    questions = JSON.parse(rawText);
}

// --- LÓGICA DO JOGO ---
function setupProgressSteps() {
    progressSteps.innerHTML = '';
    for(let i=0; i<TOTAL_QUESTIONS; i++) {
        const step = document.createElement('div');
        step.className = 'step';
        progressSteps.appendChild(step);
    }
}

function updateProgress(isCorrect = null) {
    const steps = document.querySelectorAll('.step');
    
    // Marca o anterior como concluído (com cor de erro/acerto se quiser)
    if(currentQuestionIndex > 0 && isCorrect !== null) {
        steps[currentQuestionIndex - 1].className = isCorrect ? 'step completed' : 'step wrong-history';
    }

    // Marca o atual
    if(currentQuestionIndex < steps.length) {
        steps[currentQuestionIndex].className = 'step active';
    }
}

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    questionText.innerText = q.q;
    optionsContainer.innerHTML = '';
    feedbackArea.style.display = 'none';
    
    // Reset steps visual for current
    updateProgress(null);

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx, btn);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedIdx, btnElement) {
    const q = questions[currentQuestionIndex];
    const correctIdx = q.correct;
    const buttons = optionsContainer.querySelectorAll('.option-btn');

    buttons.forEach(btn => btn.classList.add('disabled'));

    const isCorrect = (selectedIdx === correctIdx);

    if (isCorrect) {
        btnElement.classList.add('correct');
        score += 100;
        if(scoreBadge) scoreBadge.innerText = `XP: ${score}`;
        showFeedback(true, q.why);
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIdx].classList.add('correct');
        showFeedback(false, q.why);
    }
    
    // Atualiza step visualmente no próximo load ou agora
    const steps = document.querySelectorAll('.step');
    steps[currentQuestionIndex].className = isCorrect ? 'step completed' : 'step wrong-history';
}

function showFeedback(isCorrect, explanation) {
    feedbackArea.style.display = 'block';
    if(isCorrect) {
        feedbackMsg.innerHTML = `<strong>Correto! 🎉</strong><br>${explanation}`;
        feedbackMsg.className = "feedback-box feedback-correct";
    } else {
        feedbackMsg.innerHTML = `<strong>Ops! ❌</strong><br>${explanation}`;
        feedbackMsg.className = "feedback-box feedback-wrong";
    }
}

// --- PRÓXIMA ---
if(nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            finishGame();
        }
    });
}

function finishGame() {
    gameActive.style.display = 'none';
    gameResult.style.display = 'block';
    finalScoreEl.innerText = score;
    
    if(score >= 300) showToast('Parabéns! Excelente pontuação! 🏆', 'success');
}

// --- TEMA E UTILS ---
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