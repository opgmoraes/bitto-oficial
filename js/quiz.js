const themeToggle = document.getElementById('themeToggle');
const startBtn = document.getElementById('startQuizBtn');
const quizSetup = document.getElementById('quizSetup');
const quizGame = document.getElementById('quizGame');
const quizResult = document.getElementById('quizResult');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackArea = document.getElementById('feedbackArea');
const feedbackMsg = document.getElementById('feedbackMsg');
const nextBtn = document.getElementById('nextQuestionBtn');
const currentScoreEl = document.getElementById('currentScore');
const progressSteps = document.getElementById('progressSteps');
const finalScoreEl = document.getElementById('finalScore');
const resultTopicEl = document.getElementById('resultTopic');
const statusText = document.getElementById('statusText');

// --- 🔑 CHAVE GOOGLE (Mesma dos outros arquivos) ---
const API_KEY = "AIzaSyBQCx1ep0eaN0f79i9U2wURNWnCvPSuJi8";
const MODEL_NAME = "gemini-1.5-flash"; // Modelo rápido para Quiz
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Variáveis do Jogo
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
const TOTAL_QUESTIONS = 5;

// --- INICIAR JOGO ---
startBtn.addEventListener('click', async () => {
    const topic = document.getElementById('quizTopic').value;
    const difficultyEl = document.querySelector('input[name="difficulty"]:checked');
    const difficulty = difficultyEl ? difficultyEl.value : 'Iniciante';

    if (!topic.trim()) {
        showToast('Digite um tema para o Quiz!', 'error');
        return;
    }

    // UI Loading
    const originalText = startBtn.innerHTML;
    startBtn.innerHTML = '<span class="loader"></span> CRIANDO PERGUNTAS...';
    startBtn.classList.add('btn-loading');
    startBtn.disabled = true;
    
    if(statusText) {
        statusText.style.display = 'block';
        statusText.innerText = "Bitto está gerando o desafio...";
    }

    try {
        await fetchQuestions(topic, difficulty);
        
        // Sucesso -> Muda de tela
        quizSetup.style.display = 'none';
        quizGame.style.display = 'block';
        if(resultTopicEl) resultTopicEl.innerText = topic;
        
        setupProgressSteps();
        loadQuestion();

    } catch (error) {
        console.error(error);
        showToast('Erro ao criar quiz. Tente novamente.', 'error');
        if(statusText) statusText.innerText = "Falha na conexão.";
        
        // Reverte botão
        startBtn.innerHTML = originalText;
        startBtn.classList.remove('btn-loading');
        startBtn.disabled = false;
    }
});

// --- BUSCAR PERGUNTAS NA API ---
async function fetchQuestions(topic, difficulty) {
    const prompt = `
        Gere um Quiz JSON sobre: "${topic}".
        Nível: ${difficulty}.
        Quantidade: ${TOTAL_QUESTIONS} perguntas.
        
        FORMATO OBRIGATÓRIO (JSON PURO):
        [
            {
                "q": "Texto da pergunta?",
                "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
                "correct": 0, // Índice da correta (0 a 3)
                "why": "Explicação curta"
            }
        ]
        
        Regras:
        1. Retorne APENAS o JSON.
        2. Sem markdown.
        3. Português Brasil.
    `;

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
        })
    });

    if (!response.ok) throw new Error("Erro na API do Google");

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if(!rawText) throw new Error("Resposta vazia.");

    // Limpeza
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

function updateProgress() {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, idx) => {
        if(idx < currentQuestionIndex) step.classList.add('completed');
        else if(idx === currentQuestionIndex) step.classList.add('active');
        else step.classList.remove('active', 'completed');
    });
}

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    questionText.innerText = q.q;
    optionsContainer.innerHTML = '';
    feedbackArea.style.display = 'none';
    updateProgress();

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

    // Desativa todos
    buttons.forEach(btn => btn.classList.add('disabled'));

    if (selectedIdx === correctIdx) {
        btnElement.classList.add('correct');
        score += 100;
        currentScoreEl.innerText = score;
        showFeedback(true, q.why);
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIdx].classList.add('correct'); // Mostra a certa
        showFeedback(false, q.why);
    }
}

function showFeedback(isCorrect, explanation) {
    feedbackArea.style.display = 'block';
    
    if(isCorrect) {
        feedbackMsg.innerText = "Excelente! " + explanation;
        feedbackMsg.className = "feedback-box feedback-correct";
    } else {
        feedbackMsg.innerText = "Ops! " + explanation;
        feedbackMsg.className = "feedback-box feedback-wrong";
    }
}

// --- PRÓXIMA / FIM ---
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        loadQuestion();
    } else {
        finishGame();
    }
});

function finishGame() {
    quizGame.style.display = 'none';
    quizResult.style.display = 'block';
    finalScoreEl.innerText = score;
    
    // Efeito de confete simples (Toast)
    if(score >= 300) showToast('Parabéns! Excelente pontuação! 🏆', 'success');
}

// --- UTILS ---
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