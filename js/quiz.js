import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const themeToggle = document.getElementById('themeToggle');
const startBtn = document.getElementById('startQuizBtn');
const nextBtn = document.getElementById('nextQuestionBtn');

// UI Elements
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

// Perfil
const navName = document.getElementById('navUserName');
const navAvatar = document.querySelector('.avatar-circle');

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentUser = null;
const TOTAL_QUESTIONS = 5;

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

if(startBtn) {
    startBtn.addEventListener('click', async () => {
        const topic = document.getElementById('quizTopic').value;
        const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value || 'Iniciante';

        if (!topic.trim()) { showToast('Digite um tema!', 'error'); return; }
        if (!currentUser) { showToast('Faça login.', 'error'); return; }

        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<span class="loader"></span> GERANDO...';
        startBtn.classList.add('btn-loading');
        startBtn.disabled = true;

        if(statusText) statusText.innerText = "Bitto está elaborando as perguntas...";
        emptyState.style.display = 'none';
        loadingState.style.display = 'flex';
        gameResult.style.display = 'none';
        gameActive.style.display = 'none';

        try {
            await fetchQuestions(topic, difficulty);
            
            if(window.recordActivity) window.recordActivity('quiz', 1);

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
            showToast(error.message, 'error');
            loadingState.style.display = 'none';
            emptyState.style.display = 'flex';
        } finally {
             startBtn.innerHTML = originalText;
             startBtn.classList.remove('btn-loading');
             startBtn.disabled = false;
        }
    });
}

async function fetchQuestions(topic, difficulty) {
    const token = await currentUser.getIdToken();

    const prompt = `
        Gere um Quiz JSON válido sobre: "${topic}".
        Nível: ${difficulty}. Quantidade: ${TOTAL_QUESTIONS}.
        FORMATO JSON: [{"q": "...", "options": ["A", "B", "C", "D"], "correct": 0, "why": "..."}]
        Regras: JSON PURO. Português.
    `;

    const response = await fetch('../api/generate', {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            model: "gemini-2.0-flash",
            type: 'quiz'
        })
    });

    const data = await response.json();

    if (!response.ok) {
        if(response.status === 403) throw new Error("🔒 Limite atingido!");
        throw new Error(data.error || "Erro na API");
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!rawText) throw new Error("Resposta vazia.");

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    questions = JSON.parse(rawText);
}

// Funções de jogo originais (Preservadas)
function setupProgressSteps() { progressSteps.innerHTML = ''; for(let i=0; i<TOTAL_QUESTIONS; i++) { const step = document.createElement('div'); step.className = 'step'; progressSteps.appendChild(step); } }
function updateProgress(isCorrect = null) { const steps = document.querySelectorAll('.step'); if(currentQuestionIndex > 0 && isCorrect !== null) steps[currentQuestionIndex - 1].className = isCorrect ? 'step completed' : 'step wrong-history'; if(currentQuestionIndex < steps.length) steps[currentQuestionIndex].className = 'step active'; }
function loadQuestion() { const q = questions[currentQuestionIndex]; questionText.innerText = q.q; optionsContainer.innerHTML = ''; feedbackArea.style.display = 'none'; updateProgress(null); q.options.forEach((opt, idx) => { const btn = document.createElement('button'); btn.className = 'option-btn'; btn.innerText = opt; btn.onclick = () => checkAnswer(idx, btn); optionsContainer.appendChild(btn); }); }
function checkAnswer(selectedIdx, btnElement) { const q = questions[currentQuestionIndex]; const correctIdx = q.correct; const buttons = optionsContainer.querySelectorAll('.option-btn'); buttons.forEach(btn => btn.classList.add('disabled')); const isCorrect = (selectedIdx === correctIdx); if (isCorrect) { btnElement.classList.add('correct'); score += 10; if(scoreBadge) scoreBadge.innerText = `XP: ${score}`; if(window.awardXP) window.awardXP(10, 'Quiz Acerto'); showFeedback(true, q.why); } else { btnElement.classList.add('wrong'); buttons[correctIdx].classList.add('correct'); showFeedback(false, q.why); } updateProgress(isCorrect); }
function showFeedback(isCorrect, explanation) { feedbackArea.style.display = 'block'; feedbackMsg.innerHTML = isCorrect ? `<strong>Correto! 🎉</strong><br>${explanation}` : `<strong>Ops! ❌</strong><br>${explanation}`; feedbackMsg.className = isCorrect ? "feedback-box feedback-correct" : "feedback-box feedback-wrong"; }
nextBtn.addEventListener('click', () => { currentQuestionIndex++; if (currentQuestionIndex < questions.length) loadQuestion(); else finishGame(); });
function finishGame() { gameActive.style.display = 'none'; gameResult.style.display = 'block'; finalScoreEl.innerText = score; if(score >= 30) showToast('Parabéns! Excelente pontuação! 🏆', 'success'); }
if(themeToggle) themeToggle.addEventListener('click', () => { const html = document.documentElement; html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });
function showToast(message, type = 'success') { let container = document.getElementById('toast-container'); if(!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); } const toast = document.createElement('div'); toast.className = `toast toast-${type}`; toast.innerHTML = `<span>${type==='success'?'✅':'❌'}</span> ${message}`; container.appendChild(toast); setTimeout(() => { toast.remove() }, 3500); }