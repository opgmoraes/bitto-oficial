// Arquivo: api/generateChat.js
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

    // AQUI ESTÁ A MUDANÇA PRINCIPAL 👇
    const apiKey = process.env.GEMINI_API_CHAT;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API do Chat não configurada.' });
    }

    const { contents, model } = req.body;
    // Usa o modelo flash 2.0 que é muito rápido para chat, ou o que vier do front
    const modelName = model || "gemini-2.0-flash"; 

    try {
        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents,
                    // Configurações de segurança para evitar bloqueios desnecessários em contexto educacional
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

        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json(data);
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Erro no Backend do Chat:", error);
        res.status(500).json({ error: 'Erro interno ao processar solicitação do chat.' });
    }
}