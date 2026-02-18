// firebase_app.js
// Integração REAL com Firebase Firestore
// Este arquivo substitui a versão antiga que usava Gist

// ============================================
// CONFIGURAÇÃO FIREBASE
// ============================================

// Estas informações devem vir do config.js ou variáveis de ambiente
const getFirebaseConfig = () => {
    // Tenta pegar do window.FIREBASE_CONFIG (se configurado)
    if (window.FIREBASE_CONFIG) {
        return window.FIREBASE_CONFIG;
    }
    
    // Ou usa valores padrão (ideal: carregar de .env)
    return {
        apiKey: window.FIREBASE_API_KEY || "CONFIGURE_NO_CONFIG_JS",
        authDomain: "checklist-oficina-72c9e.firebaseapp.com",
        projectId: "checklist-oficina-72c9e",
        storageBucket: "checklist-oficina-72c9e.appspot.com",
        messagingSenderId: window.FIREBASE_SENDER_ID || "CONFIGURE_NO_CONFIG_JS",
        appId: window.FIREBASE_APP_ID || "CONFIGURE_NO_CONFIG_JS"
    };
};

const COLLECTION_NAME = 'checklists';

// ============================================
// INICIALIZAÇÃO DO FIREBASE
// ============================================

let firebaseApp = null;
let firestoreDB = null;

async function initFirebase() {
    if (firebaseApp) return { app: firebaseApp, db: firestoreDB };
    
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const config = getFirebaseConfig();
        
        if (config.apiKey === "CONFIGURE_NO_CONFIG_JS") {
            throw new Error('Firebase não configurado! Configure window.FIREBASE_CONFIG no config.js');
        }
        
        firebaseApp = initializeApp(config);
        firestoreDB = getFirestore(firebaseApp);
        
        console.log('✅ Firebase inicializado com sucesso!');
        return { app: firebaseApp, db: firestoreDB };
        
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
        throw error;
    }
}

// ============================================
// FUNÇÕES DE ACESSO AO FIRESTORE
// ============================================

/**
 * Busca todos os checklists da nuvem (Firestore)
 * @returns {Promise<Array>} Array de checklists
 */
export async function buscarChecklistsNuvem() {
    try {
        console.log('⏳ Buscando checklists do Firebase...');
        
        const { db } = await initFirebase();
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Busca apenas checklists da oficina atual
        const oficina_id = window.OFICINA_CONFIG?.oficina_id || 'gogocars';
        const checklistsRef = collection(db, COLLECTION_NAME);
        const q = query(checklistsRef, orderBy('data_criacao', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const checklists = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Filtra apenas checklists desta oficina
            if (data.oficina_id === oficina_id) {
                checklists.push({
                    firebaseId: doc.id,
                    ...data
                });
            }
        });
        
        console.log(`✅ ${checklists.length} checklists encontrados no Firebase`);
        return checklists;
        
    } catch (error) {
        console.error('❌ Erro ao buscar checklists do Firebase:', error);
        
        // Se falhar, tenta buscar do Gist como fallback
        if (window.CLOUD_CONFIG && window.CLOUD_CONFIG.TOKEN) {
            console.warn('⚠️ Tentando buscar do Gist como fallback...');
            return buscarDoGistFallback();
        }
        
        throw error;
    }
}

/**
 * Salva ou atualiza um checklist no Firebase
 * @param {Object} checklist - Objeto do checklist
 */
export async function salvarNoFirebase(checklist) {
    try {
        console.log(`⏳ Salvando checklist ${checklist.id} no Firebase...`);
        
        const { db } = await initFirebase();
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Adiciona metadados e oficina_id
        const oficina_id = window.OFICINA_CONFIG?.oficina_id || 'gogocars';
        const checklistComMeta = {
            ...checklist,
            oficina_id: oficina_id,
            atualizado_em: new Date().toISOString(),
            sincronizado_firebase: true
        };
        
        // Usa o ID do checklist como ID do documento
        const docRef = doc(db, COLLECTION_NAME, String(checklist.id));
        await setDoc(docRef, checklistComMeta, { merge: true });
        
        console.log(`✅ Checklist ${checklist.id} salvo no Firebase com sucesso!`);
        
    } catch (error) {
        console.error(`❌ Erro ao salvar checklist ${checklist.id} no Firebase:`, error);
        throw error;
    }
}

/**
 * Busca um checklist específico pelo ID
 * @param {string|number} id - ID do checklist
 * @returns {Promise<Object|null>}
 */
export async function buscarChecklistPorId(id) {
    try {
        const { db } = await initFirebase();
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(db, COLLECTION_NAME, String(id));
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                firebaseId: docSnap.id,
                ...docSnap.data()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error(`❌ Erro ao buscar checklist ${id}:`, error);
        throw error;
    }
}

/**
 * Deleta um checklist do Firebase
 * @param {string|number} id - ID do checklist
 */
export async function deletarChecklist(id) {
    try {
        const { db } = await initFirebase();
        const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const docRef = doc(db, COLLECTION_NAME, String(id));
        await deleteDoc(docRef);
        
        console.log(`✅ Checklist ${id} deletado do Firebase`);
        
    } catch (error) {
        console.error(`❌ Erro ao deletar checklist ${id}:`, error);
        throw error;
    }
}

/**
 * Busca checklists com filtros
 * @param {Object} filtros - {placa, data_inicio, data_fim, oficina}
 * @returns {Promise<Array>}
 */
export async function buscarChecklistsComFiltro(filtros = {}) {
    try {
        const { db } = await initFirebase();
        const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        let q = collection(db, COLLECTION_NAME);
        const constraints = [];
        
        // Filtra pela oficina atual
        const oficina_id = window.OFICINA_CONFIG?.oficina_id || 'gogocars';
        constraints.push(where('oficina_id', '==', oficina_id));
        
        // Adiciona filtros se fornecidos
        if (filtros.placa) {
            constraints.push(where('placa', '==', filtros.placa.toUpperCase()));
        }
        
        if (filtros.data_inicio) {
            constraints.push(where('data_criacao', '>=', filtros.data_inicio));
        }
        
        if (filtros.data_fim) {
            constraints.push(where('data_criacao', '<=', filtros.data_fim));
        }
        
        // Ordenação
        constraints.push(orderBy('data_criacao', 'desc'));
        
        q = query(q, ...constraints);
        const querySnapshot = await getDocs(q);
        
        const checklists = [];
        querySnapshot.forEach((doc) => {
            checklists.push({
                firebaseId: doc.id,
                ...doc.data()
            });
        });
        
        return checklists;
        
    } catch (error) {
        console.error('❌ Erro ao buscar com filtros:', error);
        throw error;
    }
}

// ============================================
// FUNÇÃO DE FALLBACK (GIST)
// ============================================

async function buscarDoGistFallback() {
    try {
        const config = window.CLOUD_CONFIG;
        if (!config || !config.GIST_ID || !config.TOKEN) {
            return [];
        }

        const url = `https://api.github.com/gists/${config.GIST_ID}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${config.TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const filename = config.FILENAME || 'backup_gogocars.json';
        
        if (data.files && data.files[filename]) {
            const content = data.files[filename].content;
            return JSON.parse(content || '[]');
        }
        
        return [];
    } catch (error) {
        console.warn('⚠️ Fallback Gist também falhou:', error);
        return [];
    }
}

// ============================================
// STATUS E DIAGNÓSTICO
// ============================================

export async function verificarConexaoFirebase() {
    try {
        const { db } = await initFirebase();
        const { collection, getDocs, limit, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const q = query(collection(db, COLLECTION_NAME), limit(1));
        await getDocs(q);
        
        return {
            status: 'conectado',
            mensagem: 'Firebase conectado com sucesso!',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            status: 'erro',
            mensagem: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Exporta função de diagnóstico
if (typeof window !== 'undefined') {
    window.verificarFirebase = verificarConexaoFirebase;
    console.log('🔧 Para testar conexão Firebase, execute: verificarFirebase()');
}
