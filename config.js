// ============================================
// CONFIG.JS - GOGOCAR'S COM FIREBASE
// ============================================

window.OFICINA_CONFIG = {
    // === IDENTIFICAÇÃO ===
    oficina_id: "gogocars",  // Identificador único da oficina
    
    // === INFORMAÇÕES DA OFICINA ===
    nome: "GOGOCAR'S",
    subtitulo: "CHECKLIST DE ENTRADA E INSPEÇÃO",
    
    // === CONTATOS ===
    telefone: "(31) 99331-0800",
    whatsapp: "(31) 99331-0800",
    telefone2: "(00) 0000-0000",
    
    // === ENDEREÇO ===
    endereco: "R. D, 101 - inconfidentes, Contagem - MG, 32.260-630",
    cnpj: "13.458.714/0001-90",
    
    // === CORES ===
    corPrimaria: "#0d2748"
};

// ============================================
// CONFIGURAÇÃO FIREBASE (PRINCIPAL)
// ============================================
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCpCfotfXYNpQu5o0fFbBvwOnQgU9PuYqU",
    authDomain: "checklist-oficina-72c9e.firebaseapp.com",
    databaseURL: "https://checklist-oficina-72c9e-default-rtdb.firebaseio.com",
    projectId: "checklist-oficina-72c9e",
    storageBucket: "checklist-oficina-72c9e.firebasestorage.app",
    messagingSenderId: "305423384809",
    appId: "1:305423384809:web:b152970a419848a0147078"
};

// ============================================
// CONFIGURAÇÃO GIST (LEGADO - DESATIVADO)
// ============================================
// Token revogado - não usar mais
window.CLOUD_CONFIG = {
    TOKEN: '',  // Token revogado por segurança
    GIST_ID: '75e76a26d9b0c36f602ec356f525680a',
    FILENAME: 'backup_gogocars.json'
};
