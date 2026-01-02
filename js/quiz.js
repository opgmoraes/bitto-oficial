import { auth, onAuthStateChanged } from './firebase-init.js';
import { checkUsageLimit, incrementUsage } from './userManager.js';

const themeToggle = document.getElementById('themeToggle');
const startBtn = document.getElementById('startQuizBtn');
const nextBtn = document.getElementById('nextQuestionBtn');

// Elementos de UI (MANTIDOS)
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

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentUser = null;
const TOTAL_QUESTIONS = 5;

// --- AUTH CHECK ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'login.html';
    }
});

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

        if (!currentUser) return;

        // 1. CHECK LIMIT
        const canUse = await checkUsageLimit(currentUser.uid, 'quiz');
        if (!canUse) {
            showToast('🔒 Limite mensal de Quizzes atingido (2/2).', 'error');
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
            
            // 2. INCREMENT USAGE
            await incrementUsage(currentUser.uid, 'quiz');

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
            showToast('Erro ao criar quiz.', 'error');
            loadingState.style.display = 'none';
            emptyState.style.display = 'flex';
        } finally {
             startBtn.innerHTML = originalText;
             startBtn.classList.remove('btn-loading');
             startBtn.disabled = false;
        }
    });
}

// --- API FETCH ---
async function fetchQuestions(topic, difficulty) {
    const prompt = `
        Gere um Quiz JSON válido sobre: "${topic}".
        Nível: ${difficulty}. Quantidade: ${TOTAL_QUESTIONS}.
        FORMATO JSON: [{"q": "...", "options": ["A", "B", "C", "D"], "correct": 0, "why": "..."}]
        Regras: JSON PURO. Português.
    `;

    const response = await fetch('../api/generate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gemini-2.5-flash-lite",
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

// --- LÓGICA DO JOGO (MANTIDA) ---
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
    if(currentQuestionIndex > 0 && isCorrect !== null) {
        steps[currentQuestionIndex - 1].className = isCorrect ? 'step completed' : 'step wrong-history';
    }
    if(currentQuestionIndex < steps.length) {
        steps[currentQuestionIndex].className = 'step active';
    }
}

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    questionText.innerText = q.q;
    optionsContainer.innerHTML = '';
    feedbackArea.style.display = 'none';
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
    const steps = document.querySelectorAll('.step');
    steps[currentQuestionIndex].className = isCorrect ? 'step completed' : 'step wrong-history';
}

function showFeedback(isCorrect, explanation) {
    feedbackArea.style.display = 'block';
    feedbackMsg.innerHTML = isCorrect ? `<strong>Correto! 🎉</strong><br>${explanation}` : `<strong>Ops! ❌</strong><br>${explanation}`;
    feedbackMsg.className = isCorrect ? "feedback-box feedback-correct" : "feedback-box feedback-wrong";
}

if(nextBtn) {
    nextBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) loadQuestion();
        else finishGame();
    });
}

function finishGame() {
    gameActive.style.display = 'none';
    gameResult.style.display = 'block';
    finalScoreEl.innerText = score;
    if(score >= 300) showToast('Parabéns! Excelente pontuação! 🏆', 'success');
}

// --- TEMA E TOAST (MANTIDOS) ---
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