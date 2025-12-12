// Arquivo: api/generate.js
export default async function handler(req, res) {
    // 1. Configuração de CORS (Para o site funcionar)
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
        if (!apiKey) throw new Error("Chave API não configurada na Vercel.");

        const { contents } = req.body;

        // --- A MUDANÇA ---
        // Usamos o apelido GENÉRICO. O Google escolhe a melhor versão estável.
        // Isso evita o erro "model not found".
        const modelName = "gemini-1.5-flash";

        // Filtros de segurança relaxados para evitar "Resposta Vazia"
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

        // Se o Google retornar erro, mostramos qual foi
        if (data.error) {
            throw new Error(`Google Error: ${data.error.message}`);
        }

        // Se a resposta vier vazia (bloqueio ou falha)
        if (!data.candidates || data.candidates.length === 0) {
            console.log("JSON Retornado:", JSON.stringify(data));
            throw new Error("A IA respondeu vazio. Pode ser bloqueio de segurança.");
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("ERRO:", error);
        res.status(500).json({ error: `DEBUG: ${error.message}` });
    }
}