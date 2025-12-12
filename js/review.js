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

// --- EVENTO DE GERAR ---
if(generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput ? topicInput.value : "";
        const content = contentInput ? contentInput.value : "";

        if (!content.trim() && !topic.trim()) {
            showToast('Cole um texto ou defina um tema para começar!', 'error');
            return;
        }

        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<span class="loader"></span> BITTO PROCESSANDO...';
        generateBtn.classList.add('btn-loading');
        generateBtn.disabled = true;

        if(statusText) {
            statusText.style.display = 'block';
            statusText.innerText = "Gerando síntese técnica e 15 questões...";
        }

        try {
            const prompt = `
                Você é o BITTO AI, um Professor Especialista focado em Síntese Técnica.
                CONTEXTO: "${topic}". Material Base: "${content}".
                OBJETIVO: Material de estudo COMPLETO (Resumo Teórico + 15 Exercícios).
                ESTRUTURA VISUAL OBRIGATÓRIA (Markdown).
                Idioma: Português Brasileiro.
            `;

            // CORREÇÃO: Fetch simplificado
            const response = await fetch('/api/generate', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Erro na conexão com o Servidor");
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
            showToast(error.message, 'error');
            
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

// --- PDF, COPY, THEME ---
if(downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
        if (typeof html2pdf === 'undefined') { alert("ERRO: Biblioteca 'html2pdf' não encontrada."); return; }
        const oldText = downloadPdfBtn.innerText;
        downloadPdfBtn.innerText = "⏳ Preparando...";
        downloadPdfBtn.disabled = true;

        const element = document.getElementById('reviewOutput');
        const clone = element.cloneNode(true);
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:99999; display:flex; justify-content:center; overflow-y:scroll; padding:20px;';
        
        const pdfContent = document.createElement('div');
        pdfContent.appendChild(clone);
        pdfContent.style.cssText = 'width:750px; color:#000; font-family:Helvetica, Arial, sans-serif; font-size:12pt; line-height:1.6; background:white;';
        
        pdfContent.querySelectorAll('*').forEach(el => { el.style.color = '#000'; el.style.backgroundColor = 'transparent'; });
        overlay.appendChild(pdfContent);
        document.body.appendChild(overlay);

        const opt = {
            margin: 10, filename: `BITTO_Revisao_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(pdfContent).save().then(() => {
            document.body.removeChild(overlay);
            downloadPdfBtn.innerText = oldText; downloadPdfBtn.disabled = false;
            showToast('PDF baixado!', 'success');
        }).catch(err => {
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            downloadPdfBtn.innerText = oldText; downloadPdfBtn.disabled = false;
            showToast('Erro PDF.', 'error');
        });
    });
}

if(copyBtn) {
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(reviewOutput.innerText).then(() => showToast('Copiado!', 'success')).catch(() => showToast('Erro.', 'error'));
    });
}

if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const sunIcon = document.querySelector('.icon-sun');
        const moonIcon = document.querySelector('.icon-moon');
        if (html.getAttribute('data-theme') === 'dark') {
            html.setAttribute('data-theme', 'light');
            if(sunIcon) sunIcon.style.display = 'block'; if(moonIcon) moonIcon.style.display = 'none';
        } else {
            html.setAttribute('data-theme', 'dark');
            if(sunIcon) sunIcon.style.display = 'none'; if(moonIcon) moonIcon.style.display = 'block';
        }
    });
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = type === 'success' ? '✅' : '⚠️'; if(type === 'error') icon = '❌';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove() }, 3000);
}