// Arquivo: api/generate.js
export default async function handler(req, res) {
    // 1. Configuração de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("ERRO: API Key não encontrada nas variáveis de ambiente.");
        return res.status(500).json({ error: 'Chave de API não configurada.' });
    }

    const { contents, model } = req.body;
    // Força o modelo 1.5 Flash que é o mais rápido e estável
    const modelName = model || "gemini-2.0-flash";

    try {
        // 2. Prepara a chamada com FILTROS DE SEGURANÇA REDUZIDOS
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

        // 3. Verifica se o Google retornou erro (mesmo com status 200 do fetch)
        if (data.error) {
            console.error("Erro retornado pelo Google:", data.error);
            throw new Error(data.error.message);
        }

        // 4. Verifica se foi bloqueado por segurança (Candidates vazio)
        if (!data.candidates || data.candidates.length === 0) {
            console.error("Bloqueio de Segurança ou Resposta Vazia:", JSON.stringify(data));
            return res.status(400).json({ error: "A IA bloqueou este tema por segurança. Tente reformular." });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Erro Crítico no Backend:", error);
        res.status(500).json({ error: 'Erro interno ao processar IA.' });
    }
}