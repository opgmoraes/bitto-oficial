// Configura para rodar no Edge (mais rápido e compatível)
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // 1. Tratamento de CORS (Para permitir que o front chame a API)
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    // 2. Apenas aceita POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Método não permitido' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 3. Pega os dados do Frontend
        const { contents } = await req.json();
        
        // 4. Pega a chave da Vercel (Environment Variables)
        const apiKey = process.env.GEMINI_API_CHAT;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Chave de API (GEMINI_API_CHAT) não configurada na Vercel.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 5. Chama o Google Gemini
        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: contents,
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
        
        // 6. Devolve a resposta para o seu site
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            }
        });
    }
}