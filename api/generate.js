import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

// Inicializa o Firebase Admin (Camada de Segurança)
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.error("ERRO: FIREBASE_SERVICE_ACCOUNT não configurado no Vercel.");
        }
    } catch (error) {
        console.error("Erro crítico ao iniciar Firebase Admin:", error);
    }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // 1. Mantendo sua configuração de CORS original
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        // 2. SEGURANÇA: Verificar quem é o usuário (Token)
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Não autorizado. Faça login.' });
        }
        const idToken = authHeader.split('Bearer ')[1];

        // Decodifica o token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Pega os dados enviados pelo frontend
        const { contents, model, type } = req.body; 

        // 3. COBRANÇA SEGURA NO SERVIDOR
        // O frontend DEVE mandar o 'type' (flashcards, quiz, review) para descontar
        if (type) {
            await db.runTransaction(async (transaction) => {
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) throw new Error("Usuário não encontrado.");

                const userData = userDoc.data();
                const currentUsage = userData.usage?.[type] || 0;
                
                // Limites do Plano Free
                const LIMITS = { flashcards: 5, quiz: 5, review: 5 }; 
                const limit = LIMITS[type] || 50; 

                if (currentUsage >= limit) {
                    throw new Error("LIMIT_EXCEEDED");
                }

                // Cobra o uso
                transaction.update(userRef, {
                    [`usage.${type}`]: admin.firestore.FieldValue.increment(1),
                    "stats.cardsGeneratedMonth": admin.firestore.FieldValue.increment(type === 'flashcards' ? 5 : 1)
                });
            });
        }

        // 4. CHAMADA AO GEMINI (Sua lógica original preservada)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'API Key do Google não configurada.' });

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
        console.error("Erro API:", error);
        if (error.message === "LIMIT_EXCEEDED") {
            return res.status(403).json({ error: "Limite mensal atingido! Faça upgrade." });
        }
        return res.status(500).json({ error: "Erro interno: " + error.message });
    }
}