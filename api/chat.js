// Arquivo: api/chat.js
export default async function handler(req, res) {
    // 1. Configuração de CORS (Idêntico ao generate.js)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tratamento para preflight request do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Busca a chave específica do CHAT
    const apiKey = process.env.GEMINI_API_CHAT;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API do Chat (GEMINI_API_CHAT) não configurada.' });
    }

    const { contents, model } = req.body;
    
    // 3. Define o modelo.
    // Estamos usando o "gemini-2.0-flash" pois é o mesmo que está funcionando no seu generate.js
    const modelName = model || "gemini-2.0-flash"; 

    try {
        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents,
                    // Configurações de segurança para evitar bloqueios excessivos
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            }
        );

        const data = await googleResponse.json();

        // Se o Google der erro (ex: 400, 429 ou 500), repassa para o front
        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json(data);
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Erro no Backend (Chat):", error);
        res.status(500).json({ error: 'Erro interno ao processar solicitação do chat.' });
    }
}