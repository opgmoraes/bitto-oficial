import { db, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from './firebase-init.js';

/**
 * Cria ou atualiza o usuário no banco ao fazer login
 */
export async function syncUserDatabase(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Novo usuário: Plano FREE padrão
        await setDoc(userRef, {
            email: user.email,
            name: user.displayName || "Estudante",
            plan: "free", // free, monthly, quarterly
            subscriptionEnd: null,
            usage: {
                flashcards: 0,
                quiz: 0,
                review: 0
            },
            lastReset: serverTimestamp() // Data do último reset de cotas
        });
    }
}

/**
 * Verifica se o usuário pode usar a ferramenta
 * @param {string} userId - ID do usuário
 * @param {string} tool - 'flashcards', 'quiz' ou 'review'
 * @returns {Promise<boolean>} - true se permitido, false se bloqueado
 */
export async function checkUsageLimit(userId, tool) {
    if (!userId) return false;
    
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return false;

    const userData = userSnap.data();
    const now = new Date();
    
    // 1. Verificar se é PLANO PAGO e se está ATIVO
    if (userData.plan !== 'free' && userData.subscriptionEnd) {
        const endDate = userData.subscriptionEnd.toDate(); // Converte timestamp firebase
        if (now < endDate) {
            return true; // Plano pago ativo = liberado
        } else {
            // Plano venceu, volta para free (opcional: atualizar no banco aqui)
            // Vamos tratar como free abaixo
        }
    }

    // 2. Lógica do PLANO FREE
    // Verifica se precisa resetar o contador mensal (virou o mês?)
    const lastReset = userData.lastReset ? userData.lastReset.toDate() : new Date(0);
    const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    if (isNewMonth) {
        // Reseta contadores se virou o mês
        await updateDoc(userRef, {
            "usage.flashcards": 0,
            "usage.quiz": 0,
            "usage.review": 0,
            lastReset: serverTimestamp()
        });
        return true; // Liberado pois resetou
    }

    // Verifica limite (2 usos)
    const currentUsage = userData.usage?.[tool] || 0;
    
    if (currentUsage < 2) {
        return true;
    } else {
        return false; // Bloqueado
    }
}

/**
 * Incrementa o uso após o sucesso da geração
 */
export async function incrementUsage(userId, tool) {
    const userRef = doc(db, "users", userId);
    // Usa notação de ponto para atualizar campo aninhado
    await updateDoc(userRef, {
        [`usage.${tool}`]: increment(1)
    });
}