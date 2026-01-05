import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

// Inicializa o Firebase Admin (Segurança do Servidor)
// Configure a variável de ambiente: FIREBASE_SERVICE_ACCOUNT no Vercel
if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("ERRO: FIREBASE_SERVICE_ACCOUNT não configurado.");
    }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // 1. Configuração de CORS (Mantida do seu código original)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' // Adicionei 'Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. SEGURANÇA: Verificar Token do Usuário (NOVO)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Valida quem é o usuário
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Pega os dados que o front enviou
        const { contents, model, type } = req.body; // 'type' avisa se é quiz, flashcard ou review

        // 3. CONTROLE DE LIMITE NO SERVIDOR (NOVO)
        // Se não tiver 'type', assumimos uso livre ou teste, mas ideal é sempre mandar.
        if (type) {
            await db.runTransaction(async (transaction) => {
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) throw new Error("Usuário não encontrado no banco.");

                const userData = userDoc.data();
                const currentUsage = userData.usage?.[type] || 0;
                
                // Limites do Plano Free
                const LIMITS = { flashcards: 5, quiz: 5, review: 5 }; 
                const limit = LIMITS[type] || 99; // Se type for inválido, dá erro ou limite alto

                if (currentUsage >= limit) {
                    throw new Error("LIMIT_EXCEEDED");
                }

                // Cobra o crédito
                transaction.update(userRef, {
                    [`usage.${type}`]: admin.firestore.FieldValue.increment(1),
                    "stats.cardsGeneratedMonth": admin.firestore.FieldValue.increment(type === 'flashcards' ? 5 : 1)
                });
            });
        }

        // 4. CHAMADA AO GEMINI (Sua lógica original mantida)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'Chave de API não configurada.' });

        const modelName = model || "gemini-2.0-flash"; 

        const googleResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents,
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
        console.error("Erro no Backend:", error);
        if (error.message === "LIMIT_EXCEEDED") {
            return res.status(403).json({ error: "Limite mensal atingido! Faça upgrade." });
        }
        res.status(500).json({ error: 'Erro interno ao processar solicitação.' });
    }
}