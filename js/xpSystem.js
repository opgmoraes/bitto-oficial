import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- TABELA DE NÍVEIS (Configuração) ---
// Define quanto XP precisa para cada nível
export const XP_TABLE = [
    { level: 1, min: 0, limit: 100 },
    { level: 2, min: 100, limit: 250 },
    { level: 3, min: 250, limit: 500 },
    { level: 4, min: 500, limit: 900 },
    { level: 5, min: 900, limit: 1400 },
    { level: 6, min: 1400, limit: 2100 },
    { level: 7, min: 2100, limit: 3000 },
    { level: 8, min: 3000, limit: 4200 },
    { level: 9, min: 4200, limit: 5800 },
    { level: 10, min: 5800, limit: 10000 }
];

// Calcula o nível atual com base no XP total
export function calculateLevel(xp) {
    // Encontra o nível onde o XP atual é menor que o limite
    const levelData = XP_TABLE.find(l => xp < l.limit) || XP_TABLE[XP_TABLE.length - 1];
    return levelData;
}

// --- VERIFICAÇÃO MENSAL (O Segredo do Plano Free) ---
export async function checkMonthlyReset(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    // Pega o mês atual no formato "AAAA-MM" (ex: "2024-02")
    const currentMonth = new Date().toISOString().slice(0, 7); 

    if (snap.exists()) {
        const data = snap.data();
        
        // Se a data salva no banco for diferente do mês atual...
        if (data.lastResetMonth !== currentMonth) {
            console.log("📅 Novo mês detectado! Resetando XP...");
            
            // ... Zera o XP e atualiza a data
            await updateDoc(userRef, {
                xp: 0,
                level: 1,
                lastResetMonth: currentMonth
            });
            return 0; // Retorna 0 pois acabou de resetar
        }
        return data.xp || 0; // Retorna o XP atual se for o mesmo mês
    } else {
        // Se o usuário não existe no banco (primeiro acesso), cria ele
        await setDoc(userRef, {
            displayName: user.displayName || "Estudante",
            email: user.email,
            xp: 0,
            level: 1,
            lastResetMonth: currentMonth,
            photoURL: user.photoURL || ""
        }, { merge: true });
        return 0;
    }
}

// --- FUNÇÃO PARA GANHAR XP (Usar no Quiz/Flashcards) ---
export async function addUserXP(userId, amount) {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
        const currentXP = snap.data().xp || 0;
        const newXP = currentXP + amount;
        
        // Calcula se subiu de nível para avisar o usuário (opcional)
        const oldLevel = calculateLevel(currentXP).level;
        const newLevelData = calculateLevel(newXP);
        
        await updateDoc(userRef, {
            xp: newXP,
            level: newLevelData.level
        });

        return { 
            newXP, 
            leveledUp: newLevelData.level > oldLevel,
            newLevel: newLevelData.level 
        };
    }
}