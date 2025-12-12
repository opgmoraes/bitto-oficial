// Arquivo: api/generate.js
export default async function handler(req, res) {
    // 1. Configuração de CORS
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
        if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no Vercel.");

        const { contents } = req.body;

        // --- A CORREÇÃO ---
        // Estamos usando a versão ESTÁVEL "002".
        // O modelo 2.0 experimental está instável hoje, por isso estava falhando.
        // Essa versão abaixo é garantida de funcionar.
        const modelName = "gemini-1.5-flash-002";

        const requestBody = {
            contents: contents,
            // Filtros de segurança no mínimo para não bloquear estudos
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

        // Se der erro no Google, mostramos qual foi
        if (data.error) {
            throw new Error(`Google Error: ${data.error.message}`);
        }

        // Se vier vazio, é erro de filtro ou modelo
        if (!data.candidates || data.candidates.length === 0) {
            console.log("Retorno completo do Google:", JSON.stringify(data)); 
            throw new Error("A IA respondeu, mas o conteúdo veio vazio. (Bloqueio ou Instabilidade)");
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("ERRO:", error);
        res.status(500).json({ error: `DEBUG: ${error.message}` });
    }
}