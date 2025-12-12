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

        if(emptyState) emptyState.style.display = 'none';
        if(loadingState) loadingState.style.display = 'flex';
        if(gameResult) gameResult.style.display = 'none';
        if(gameActive) gameActive.style.display = 'none';

        try {
            await fetchQuestions(topic, difficulty);
            
            // Sucesso
            if(loadingState) loadingState.style.display = 'none';
            if(gameActive) gameActive.style.display = 'block';
            if(gameTitle) gameTitle.innerText = topic;
            if(resultTopicEl) resultTopicEl.innerText = topic;
            
            score = 0;
            currentQuestionIndex = 0;
            if(scoreBadge) scoreBadge.innerText = `XP: ${score}`;
            
            setupProgressSteps();
            loadQuestion();

        } catch (error) {
            console.error(error);
            showToast('Erro ao criar quiz: ' + error.message, 'error');
            
            if(loadingState) loadingState.style.display = 'none';
            if(emptyState) emptyState.style.display = 'flex';
        } finally {
             startBtn.innerHTML = originalText;
             startBtn.classList.remove('btn-loading');
             startBtn.disabled = false;
        }
    });
}

// --- API FETCH CORRIGIDO ---
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

    // CORREÇÃO: Removida a linha 'model: ...' para evitar conflito. O backend decide.
    const response = await fetch('/api/generate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na API");
    }

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if(!rawText) throw new Error("Resposta vazia da IA.");

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    questions = JSON.parse(rawText);
}

// --- LÓGICA DO JOGO ---
function setupProgressSteps() {
    if(!progressSteps) return;
    progressSteps.innerHTML = '';
    for(let i=0; i<TOTAL_QUESTIONS; i++) {
        const step = document.createElement('div');
        step.className = 'step';
        progressSteps.appendChild(step);
    }
}

function updateProgress(isCorrect = null) {
    if(!progressSteps) return;
    const steps = document.querySelectorAll('.step');
    
    if(currentQuestionIndex > 0 && isCorrect !== null) {
        steps[currentQuestionIndex - 1].className = isCorrect ? 'step completed' : 'step wrong-history';
    }

    if(currentQuestionIndex < steps.length) {
        steps[currentQuestionIndex].className = 'step active';
    }
}

function loadQuestion() {
    if(!questions[currentQuestionIndex]) return;
    const q = questions[currentQuestionIndex];
    if(questionText) questionText.innerText = q.q;
    if(optionsContainer) optionsContainer.innerHTML = '';
    if(feedbackArea) feedbackArea.style.display = 'none';
    
    updateProgress(null);

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx, btn);
        if(optionsContainer) optionsContainer.appendChild(btn);
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
    
    // Atualiza visualmente o passo atual nos steps
    const steps = document.querySelectorAll('.step');
    if(steps[currentQuestionIndex]) {
        steps[currentQuestionIndex].className = isCorrect ? 'step completed' : 'step wrong-history';
    }
}

function showFeedback(isCorrect, explanation) {
    if(feedbackArea) {
        feedbackArea.style.display = 'block';
        if(isCorrect) {
            feedbackMsg.innerHTML = `<strong>Correto! 🎉</strong><br>${explanation}`;
            feedbackMsg.className = "feedback-box feedback-correct";
        } else {
            feedbackMsg.innerHTML = `<strong>Ops! ❌</strong><br>${explanation}`;
            feedbackMsg.className = "feedback-box feedback-wrong";
        }
    }
}

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
    if(gameActive) gameActive.style.display = 'none';
    if(gameResult) gameResult.style.display = 'block';
    if(finalScoreEl) finalScoreEl.innerText = score;
    
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