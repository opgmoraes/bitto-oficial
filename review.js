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

// Modelo Gemini 2.0
const MODEL_NAME = "gemini-2.0-flash"; 

// --- 🏠 CONFIGURAÇÃO DA API (MODELO ENV/VERCEL) ---
// O Vite (usado pela Vercel) injeta a chave aqui automaticamente
const API_KEY = import.meta.env.VITE_API_KEY;

// --- EVENTO DE GERAR ---
if(generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput ? topicInput.value : "";
        const content = contentInput ? contentInput.value : "";

        // Validação
        if (!content.trim() && !topic.trim()) {
            showToast('Cole um texto ou defina um tema para começar!', 'error');
            return;
        }

        // UI Loading
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="loader"></span> BITTO PROCESSANDO...';
        generateBtn.classList.add('btn-loading');
        generateBtn.disabled = true;

        if(statusText) {
            statusText.style.display = 'block';
            statusText.innerText = "Gerando síntese técnica e 15 questões...";
        }

        try {
            // Verificação de Segurança da Vercel
            if (!API_KEY) {
                throw new Error("ERRO DE CONFIGURAÇÃO: Chave de API não encontrada nas Variáveis de Ambiente.");
            }

            // 2. Constrói a URL dinamicamente
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

            // --- PROMPT TÉCNICO & DIDÁTICO ---
            const prompt = `
                Você é o BITTO AI, um Professor Especialista focado em Síntese Técnica.

                CONTEXTO:
                O aluno está estudando: "${topic}".
                Material Base: "${content}".

                OBJETIVO:
                Criar um material de estudo COMPLETO (Resumo Teórico + Exercícios).
                - Use a terminologia técnica correta.
                - Explique conceitos complexos de forma resumida e cristalina.
                - O conteúdo deve ser rico e formatado para leitura fácil.

                ESTRUTURA VISUAL OBRIGATÓRIA (Markdown):

                # 📘 REVISÃO TÉCNICA: ${topic || 'Conteúdo'}

                ## 🧠 PARTE 1: SÍNTESE DOS CONCEITOS (RESUMO)
                Identifique os 3 a 5 tópicos fundamentais do texto. Para cada um:

                ### 1. [Nome do Tópico]
                * **Definição Técnica:** (Explicação objetiva e precisa).
                * **Aplicação Prática:** (Onde isso é utilizado no mundo real).
                * **Ponto de Atenção:** (O detalhe técnico que causa confusão).

                ---
                ## 📝 PARTE 2: SIMULADO DE FIXAÇÃO (15 QUESTÕES)
                Numere de 1 a 15 sequencialmente.

                ### 🔹 Bloco A: Domínio Conceitual (Dissertativas)
                1. (Questão técnica...)
                2. (...)
                3. (...)

                ### 🔹 Bloco B: Verificação de Fatos (Verdadeiro ou Falso)
                4. (Afirmação técnica...)
                5. (...)
                6. (...)

                ### 🔹 Bloco C: Relação de Causalidade ("PORQUE")
                7. (A asserção I é... PORQUE a II é...)
                8. (...)
                9. (...)

                ### 🔹 Bloco D: Seleção Múltipla (Marque a Correta)
                10. (Alternativas plausíveis)
                11. (...)
                12. (...)

                ### 🔹 Bloco E: Identificação de Inconsistências (Encontre o Erro)
                13. (Qual alternativa apresenta erro conceitual?)
                14. (...)
                15. (...)

                ---
                ## 🔑 PARTE 3: GABARITO COMENTADO
                (Liste de 1 a 15 com breve justificativa).
                1. **Resposta:** ...
                ...
                15. **Resposta:** ...

                DIRETRIZES:
                - Use negrito (**Texto**) para destaques.
                - Idioma: Português Brasileiro.
            `;

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    "contents": [{
                        "parts": [{ "text": prompt }]
                    }],
                    "generationConfig": {
                        "temperature": 0.4, 
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Erro na conexão com BITTO AI");
            }

            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!aiResponse) throw new Error("A IA não gerou resposta.");

            if (typeof marked !== 'undefined') {
                reviewOutput.innerHTML = marked.parse(aiResponse);
            } else {
                reviewOutput.innerHTML = `<pre style="white-space: pre-wrap;">${aiResponse}</pre>`;
            }
            
            if(emptyState) emptyState.style.display = 'none';
            reviewOutput.style.display = 'block';
            if(outputActions) outputActions.style.display = 'flex';
            
            if(topic && reviewTitle) reviewTitle.innerText = `Revisão: ${topic}`;
            showToast('Revisão gerada com sucesso!', 'success');
            
            if(window.innerWidth < 900) {
                const contentCol = document.querySelector('.content-column');
                if(contentCol) contentCol.scrollIntoView({ behavior: 'smooth' });
            }

        } catch (error) {
            console.error("Erro no processo:", error);
            showToast('Erro ao gerar. Tente novamente.', 'error');
            
            reviewOutput.innerHTML = `
                <div style="text-align:center; padding: 20px; color: var(--accent-color);">
                    <h3>⚠️ Ops, erro na conexão.</h3>
                    <p>${error.message}</p>
                </div>
            `;
            if(emptyState) emptyState.style.display = 'none';
            reviewOutput.style.display = 'block';

        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.classList.remove('btn-loading');
            generateBtn.disabled = false;
            if(statusText) statusText.style.display = 'none';
        }
    });
}

// --- FUNÇÃO DE BAIXAR PDF ---
if(downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        if (typeof html2pdf === 'undefined') {
            alert("ERRO: Biblioteca 'html2pdf' não encontrada. Verifique o HTML.");
            return;
        }

        const oldText = downloadPdfBtn.innerText;
        downloadPdfBtn.innerText = "⏳ Preparando...";
        downloadPdfBtn.disabled = true;

        const element = document.getElementById('reviewOutput');
        const clone = element.cloneNode(true);

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = '#ffffff';
        overlay.style.zIndex = '999999';
        overlay.style.overflowY = 'scroll';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '20px';

        const pdfContent = document.createElement('div');
        pdfContent.appendChild(clone);
        
        pdfContent.style.width = '750px';
        pdfContent.style.color = '#000000';
        pdfContent.style.fontFamily = 'Helvetica, Arial, sans-serif';
        pdfContent.style.fontSize = '12pt';
        pdfContent.style.lineHeight = '1.6';
        pdfContent.style.backgroundColor = 'white';

        const allElements = pdfContent.querySelectorAll('*');
        allElements.forEach(el => {
            el.style.color = '#000000';
            el.style.backgroundColor = 'transparent';
        });

        overlay.appendChild(pdfContent);
        document.body.appendChild(overlay);

        const opt = {
            margin:       10, 
            filename:     `BITTO_Revisao_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollY: 0 }, 
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } 
        };

        html2pdf().set(opt).from(pdfContent).save().then(() => {
            document.body.removeChild(overlay);
            downloadPdfBtn.innerText = oldText;
            downloadPdfBtn.disabled = false;
            showToast('PDF baixado com sucesso!', 'success');
        }).catch(err => {
            console.error("Erro PDF:", err);
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            downloadPdfBtn.innerText = oldText;
            downloadPdfBtn.disabled = false;
            showToast('Erro ao criar PDF.', 'error');
        });
    });
}

// --- COPIAR TEXTO ---
if(copyBtn) {
    copyBtn.addEventListener('click', () => {
        const text = reviewOutput.innerText;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Texto copiado!', 'success');
        }).catch(() => {
            showToast('Erro ao copiar.', 'error');
        });
    });
}

// --- TEMA ---
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

// --- TOAST ---
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