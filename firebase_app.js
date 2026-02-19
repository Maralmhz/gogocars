// firebase_app.js - PADRÃO SaaS MULTI OFICINA ✅ V2.2 - BLINDAGEM PLACA

const getFirebaseConfig = () => {
    if (window.FIREBASE_CONFIG) return window.FIREBASE_CONFIG;

    return {
        apiKey: window.FIREBASE_API_KEY,
        authDomain: "checklist-oficina-72c9e.firebaseapp.com",
        projectId: "checklist-oficina-72c9e",
        storageBucket: "checklist-oficina-72c9e.appspot.com",
        messagingSenderId: window.FIREBASE_SENDER_ID,
        appId: window.FIREBASE_APP_ID
    };
};

let firebaseApp = null;
let firestoreDB = null;

async function initFirebase() {
    if (firebaseApp) return { app: firebaseApp, db: firestoreDB };

    const { initializeApp } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
    );
    const { getFirestore } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    const config = getFirebaseConfig();

    if (!window.OFICINA_CONFIG?.oficina_id) {
        throw new Error("OFICINA_CONFIG.oficina_id não definido");
    }

    firebaseApp = initializeApp(config);
    firestoreDB = getFirestore(firebaseApp);

    console.log("🔥 Firebase inicializado:", window.OFICINA_CONFIG.oficina_id);

    return { app: firebaseApp, db: firestoreDB };
}

function getOficinaId() {
    return window.OFICINA_CONFIG.oficina_id;
}

function gerarCaminhoData(dataISO) {
    const data = new Date(dataISO);
    const ano = String(data.getFullYear());
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    return { ano, mes };
}

function caminhoChecklist(checklistId, dataCriacao) {
    const oficinaId = getOficinaId();
    const { ano, mes } = gerarCaminhoData(dataCriacao);

    return {
        colecao: `oficinas/${oficinaId}/checklists/${ano}/${mes}`,
        docId: String(checklistId)
    };
}

export async function salvarChecklist(checklist) {
    try {
        console.log("📦 Checklist recebido:", checklist);

        const { db } = await initFirebase();
        const { doc, setDoc, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
        );

        const { colecao, docId } = caminhoChecklist(
            checklist.id,
            checklist.data_criacao
        );

        const dados = {
            ...checklist,
            oficina_id: getOficinaId(),
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        };

        await setDoc(doc(db, colecao, docId), dados, { merge: true });
        console.log(`✅ Checklist salvo: ${colecao}/${docId}`);

        if (checklist.placa) {
            await atualizarIndiceVeiculo(checklist);
        } else {
            console.warn("⚠️ Checklist salvo sem placa.");
        }

    } catch (error) {
        console.error("❌ Erro salvar checklist:", error);
        throw error;
    }
}

async function atualizarIndiceVeiculo(checklist) {
    try {
        const { db } = await initFirebase();
        const { doc, setDoc, arrayUnion, serverTimestamp } = await import(
            "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
        );

        const oficinaId = getOficinaId();

        if (!checklist.placa || typeof checklist.placa !== "string") {
            console.warn("⚠️ Placa inválida ou ausente. Índice não será criado.");
            return;
        }

        const placa = checklist.placa
            .replace(/[^A-Z0-9]/gi, "")
            .toUpperCase()
            .trim();

        if (!placa) {
            console.warn("⚠️ Placa vazia após normalização. Abortando índice.");
            return;
        }

        const refVeiculo = doc(db, "oficinas", oficinaId, "veiculos", placa);

        await setDoc(refVeiculo, {
            placa,
            ultima_visita: checklist.data_criacao,
            historico_ids: arrayUnion(checklist.id),
            updated_at: serverTimestamp()
        }, { merge: true });

        console.log(`🚗 ✅ VEÍCULO SALVO: ${placa}`);

    } catch (error) {
        console.error("❌ VEÍCULO FALHOU:", error);
    }
}

export async function buscarChecklistsMes(ano, mes, limite = 20) {
    const { db } = await initFirebase();
    const { collection, getDocs, query, orderBy, limit } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );

    const oficinaId = getOficinaId();
    const mesFormatado = String(mes).padStart(2, "0");

    const ref = collection(db, `oficinas/${oficinaId}/checklists/${ano}/${mesFormatado}`);
    const q = query(ref, orderBy("data_criacao", "desc"), limit(limite));

    const snapshot = await getDocs(q);
    const checklists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    console.log(`☁️ ${checklists.length} checklists ${ano}/${mesFormatado}`);
    return checklists;
}

// ================================
// 🔧 COMPATIBILIDADE CHECKLIST.JS
// ================================
export async function salvarNoFirebase(checklist) {
    console.log("🔥 salvandoNoFirebase → salvarChecklist");
    return salvarChecklist(checklist);
}

export async function buscarChecklistsNuvem() {
    const agora = new Date();
    return buscarChecklistsMes(
        agora.getFullYear(),
        agora.getMonth() + 1,
        100
    );
}
