// Arquivo: api/generate.js
export default async function handler(req, res) {
    // 1. Configuração de CORS (Obrigatório)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
        }

        const { contents, model } = req.body;

        // VOLTANDO PARA O SEU MODELO ORIGINAL
        // Adicionei "-exp" pois é o nome técnico oficial para não dar erro de "not found"
        const modelName = model || "gemini-2.0-flash-exp";

        // 2. Configuração de Segurança (Isso impede o erro de "Resposta Vazia")
        const requestBody = {
            contents: contents,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
        };

        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await googleResponse.json();

        // 3. Verificação de erros reais do Google
        if (data.error) {
            // Se o modelo 2.0 estiver instável, ele vai avisar aqui
            throw new Error(`Google API Error: ${data.error.message}`);
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Bloqueio de segurança ou modelo instável (resposta vazia).");
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("ERRO BACKEND:", error);
        res.status(500).json({ error: `DEBUG: ${error.message}` });
    }
}