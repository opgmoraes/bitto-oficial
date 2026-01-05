import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";

// Inicializa o Firebase Admin com a chave de serviço
if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.error("ERRO: Variável FIREBASE_SERVICE_ACCOUNT não encontrada no Vercel.");
        }
    } catch (error) {
        console.error("Erro ao iniciar Firebase Admin:", error);
    }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Configuração de CORS
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
        // 1. SEGURANÇA: Verifica Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Não autorizado. Faça login.' });
        }
        const idToken = authHeader.split('Bearer ')[1];

        // Decodifica Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        // Pega parâmetros. Aceita tanto 'prompt' quanto 'contents' para compatibilidade
        const { prompt, type, model, contents } = req.body; 

        // 2. CONTROLE DE LIMITE NO SERVIDOR
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

                // Cobra o crédito
                transaction.update(userRef, {
                    [`usage.${type}`]: admin.firestore.FieldValue.increment(1),
                    "stats.cardsGeneratedMonth": admin.firestore.FieldValue.increment(type === 'flashcards' ? 5 : 1)
                });
            });
        }

        // 3. GERAÇÃO COM GEMINI
        const modelName = model || "gemini-2.0-flash";
        const geminiModel = genAI.getGenerativeModel({ model: modelName });
        
        // Normaliza o prompt
        const finalPrompt = contents ? contents[0].parts[0].text : prompt;
        
        const result = await geminiModel.generateContent(finalPrompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({ candidates: [{ content: { parts: [{ text }] } }] });

    } catch (error) {
        console.error("Erro API:", error);
        if (error.message === "LIMIT_EXCEEDED") {
            return res.status(403).json({ error: "Limite mensal atingido! Faça upgrade." });
        }
        // Retorna JSON de erro para o frontend tratar
        return res.status(500).json({ error: "Erro interno: " + error.message });
    }
}