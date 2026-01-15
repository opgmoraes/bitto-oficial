import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY 
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
                : undefined,
        }),
    });
}

const db = admin.firestore();
const auth = admin.auth();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const data = req.body;
    const eventName = data.event || ""; 
    const status = data.state || data.status || "";

    console.log(`WEBHOOK: Evento [${eventName}] | Status [${status}] | Email [${data.customer?.email}]`);

    const userEmail = data.customer?.email;
    if (!userEmail) return res.status(400).json({ error: "Email não identificado." });

    // --- CENÁRIO 1: REMOVER ACESSO (Reembolso/Chargeback) ---
    // Se o cliente pediu dinheiro de volta ou contestou, cortamos o mal pela raiz.
    if (['refund', 'chargeback', 'purchase_refused'].includes(eventName) || status === 'refunded' || status === 'refused') {
        console.log(`⛔ REVOGANDO ACESSO de ${userEmail} por ${eventName}`);
        
        try {
            const userRecord = await auth.getUserByEmail(userEmail);
            await db.collection('users').doc(userRecord.uid).set({
                plan: 'free',
                subscriptionEnd: null, // Remove a data de validade
                lastStatus: eventName
            }, { merge: true });
            return res.json({ success: true, action: 'revoked' });
        } catch (e) {
            console.log("Usuário não encontrado para revogar ou erro:", e.message);
            return res.json({ message: "Nada a revogar." });
        }
    }

    // --- CENÁRIO 2: LIBERAR/RENOVAR ACESSO ---
    let isApproved = false;

    // Lista de eventos que dão acesso
    // Adicionei 'subscription_renewed' (nome padrão provável) e verificação de status 'paid'
    if (eventName === 'purchase_approved' || eventName === 'subscription_renewed' || status === 'paid' || status === 'approved') {
        isApproved = true;
    } 
    // MODO TESTE (Pix Gerado) - APAGUE ISSO DEPOIS
    else if (eventName === 'pix_gerado') {
        console.log("⚠️ TESTE: Liberando por Pix Gerado");
        isApproved = true;
    }

    if (!isApproved) {
        return res.json({ message: `Evento ${eventName} ignorado (não altera acesso).` });
    }

    try {
        // Lógica de Produtos (Mensal vs Trimestral)
        const productName = data.product?.name?.toLowerCase() || "";
        let monthsToAdd = 1;
        let planType = 'monthly';

        if (productName.includes('trimestral')) {
            monthsToAdd = 3;
            planType = 'quarterly';
        }

        // CÁLCULO INTELIGENTE DE RENOVAÇÃO
        // Se for renovação, o ideal seria somar tempo à data atual do usuário,
        // mas para simplificar e evitar erros, somar a partir de "HOJE" funciona bem para garantir acesso.
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(now.getMonth() + monthsToAdd);

        // Busca ou Cria Usuário
        let userRecord;
        let isNewUser = false;
        try {
            userRecord = await auth.getUserByEmail(userEmail);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                userRecord = await auth.createUser({
                    email: userEmail,
                    emailVerified: true,
                    displayName: data.customer?.name || "Estudante"
                });
                isNewUser = true;
            } else throw error;
        }

        // Grava no Firestore
        const userRef = db.collection('users').doc(userRecord.uid);
        const updateData = {
            email: userEmail,
            plan: planType,
            subscriptionEnd: admin.firestore.Timestamp.fromDate(endDate),
            lastPaymentId: data.id || `webhook_${Date.now()}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (isNewUser) {
            updateData.name = data.customer?.name || "Estudante";
            updateData.usage = { flashcards: 0, quiz: 0, review: 0 };
            updateData.xp = 0;
            updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        await userRef.set(updateData, { merge: true });

        console.log(`✅ SUCESSO: ${planType} ativado/renovado até ${endDate.toISOString()}`);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("ERRO CRÍTICO:", error);
        return res.status(500).json({ error: error.message });
    }
}