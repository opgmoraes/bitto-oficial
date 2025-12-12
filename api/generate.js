// Arquivo: api/generate.js
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY não encontrada nas variáveis de ambiente (Vercel Settings).");

        const { contents, model } = req.body;
        const modelName = model || "gemini-1.5-flash";

        // Configuração de segurança
        const requestBody = {
            contents: contents,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
        };

        // Log para debug (aparece no painel da Vercel)
        console.log(`Tentando conectar com modelo: ${modelName}`);

        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await googleResponse.json();

        if (data.error) {
            throw new Error(`Google API Error: ${data.error.message}`);
        }
        
        if (!data.candidates || data.candidates.length === 0) {
             // Se vier vazio, retornamos o JSON inteiro para entender o motivo
            throw new Error(`Resposta Vazia do Google. Detalhes: ${JSON.stringify(data)}`);
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("ERRO NO BACKEND:", error);
        // AQUI ESTÁ O SEGREDO: Mandamos a mensagem real para o front
        res.status(500).json({ 
            error: `DEBUG: ${error.message}` 
        });
    }
}