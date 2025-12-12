// Arquivo: api/generate.js
export default async function handler(req, res) {
    // 1. Configuração de CORS (Permite que seu site converse com esse backend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido se for só verificação do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Segurança: Pega a chave do servidor (Vercel)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada no servidor.' });
    }

    // 3. Recebe os dados do Frontend
    const { contents, model } = req.body;
    const modelName = model || "gemini-2.0-flash";

    try {
        // 4. Chama o Google (Server to Server)
        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await googleResponse.json();

        // 5. Devolve a resposta limpa para o seu site
        res.status(200).json(data);

    } catch (error) {
        console.error("Erro no Backend:", error);
        res.status(500).json({ error: 'Erro ao processar solicitação.' });
    }
}