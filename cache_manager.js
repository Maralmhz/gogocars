// cache_manager.js - SISTEMA DE CACHE AVANÇADO COM INDEXEDDB
// Suporta 50MB+ de dados (vs 5-10MB do localStorage)
// Inclui compressão automática de fotos

class CacheManager {
    constructor(dbName = 'ChecklistCache', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    // ============================================
    // INICIALIZAÇÃO DO INDEXEDDB
    // ============================================
    
    async init() {
        if (this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB inicializado com sucesso!');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para checklists
                if (!db.objectStoreNames.contains('checklists')) {
                    const checklistStore = db.createObjectStore('checklists', { keyPath: 'id' });
                    checklistStore.createIndex('data_criacao', 'data_criacao', { unique: false });
                    checklistStore.createIndex('placa', 'placa', { unique: false });
                    checklistStore.createIndex('atualizado_em', 'atualizado_em', { unique: false });
                }
                
                // Store para fotos (separado para otimização)
                if (!db.objectStoreNames.contains('fotos')) {
                    const fotoStore = db.createObjectStore('fotos', { keyPath: 'id' });
                    fotoStore.createIndex('checklist_id', 'checklist_id', { unique: false });
                }
                
                // Store para metadados
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
                
                console.log('📊 IndexedDB estrutura criada!');
            };
        });
    }

    // ============================================
    // COMPRESSÃO DE FOTOS
    // ============================================
    
    async comprimirFoto(base64, qualidade = 0.7, maxWidth = 1200) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Redimensionar se necessário
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Comprimir
                    const comprimida = canvas.toDataURL('image/jpeg', qualidade);
                    
                    const tamanhoOriginal = base64.length;
                    const tamanhoComprimido = comprimida.length;
                    const reducao = ((1 - tamanhoComprimido / tamanhoOriginal) * 100).toFixed(1);
                    
                    console.log(`🗜️ Foto comprimida: ${reducao}% menor (${(tamanhoOriginal/1024).toFixed(0)}KB → ${(tamanhoComprimido/1024).toFixed(0)}KB)`);
                    
                    resolve(comprimida);
                };
                
                img.onerror = reject;
                img.src = base64;
                
            } catch (error) {
                console.error('❌ Erro ao comprimir foto:', error);
                resolve(base64); // Retorna original em caso de erro
            }
        });
    }
    
    async comprimirFotos(fotos, qualidade = 0.7) {
        if (!fotos || fotos.length === 0) return [];
        
        console.log(`⏳ Comprimindo ${fotos.length} foto(s)...`);
        
        const comprimidas = await Promise.all(
            fotos.map(foto => this.comprimirFoto(foto, qualidade))
        );
        
        return comprimidas;
    }

    // ============================================
    // OPERAÇÕES COM CHECKLISTS
    // ============================================
    
    async salvarChecklist(checklist, comprimirFotos = true) {
        await this.init();
        
        return new Promise(async (resolve, reject) => {
            try {
                // Comprimir fotos se existirem
                if (comprimirFotos && checklist.fotos && checklist.fotos.length > 0) {
                    checklist.fotos = await this.comprimirFotos(checklist.fotos);
                }
                
                // Adicionar timestamp de cache
                checklist.cached_at = new Date().toISOString();
                
                const transaction = this.db.transaction(['checklists'], 'readwrite');
                const store = transaction.objectStore('checklists');
                const request = store.put(checklist);
                
                request.onsuccess = () => {
                    console.log(`✅ Checklist ${checklist.id} salvo no cache`);
                    resolve(checklist);
                };
                
                request.onerror = () => reject(request.error);
                
            } catch (error) {
                console.error('❌ Erro ao salvar no cache:', error);
                reject(error);
            }
        });
    }
    
    async buscarChecklist(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists'], 'readonly');
            const store = transaction.objectStore('checklists');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
    
    async listarChecklists(limite = 100) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists'], 'readonly');
            const store = transaction.objectStore('checklists');
            const index = store.index('data_criacao');
            const request = index.openCursor(null, 'prev'); // Ordenar por data DESC
            
            const checklists = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && checklists.length < limite) {
                    checklists.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(checklists);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    async buscarPorPlaca(placa) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists'], 'readonly');
            const store = transaction.objectStore('checklists');
            const index = store.index('placa');
            const request = index.getAll(placa);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
    
    async deletarChecklist(id) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists'], 'readwrite');
            const store = transaction.objectStore('checklists');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log(`🗑️ Checklist ${id} removido do cache`);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================
    // SINCRONIZAÇÃO INTELIGENTE
    // ============================================
    
    async getUltimaSincronizacao() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get('ultima_sincronizacao');
            
            request.onsuccess = () => {
                const data = request.result?.value || null;
                resolve(data);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async setUltimaSincronizacao(timestamp = new Date().toISOString()) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            const request = store.put({ key: 'ultima_sincronizacao', value: timestamp });
            
            request.onsuccess = () => {
                console.log(`⏰ Última sincronização: ${timestamp}`);
                resolve(timestamp);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async buscarChecklistsModificadosApos(timestamp) {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists'], 'readonly');
            const store = transaction.objectStore('checklists');
            const index = store.index('atualizado_em');
            const range = IDBKeyRange.lowerBound(timestamp, true);
            const request = index.getAll(range);
            
            request.onsuccess = () => {
                const modificados = request.result || [];
                console.log(`🔄 ${modificados.length} checklist(s) modificado(s) desde ${timestamp}`);
                resolve(modificados);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================
    // ESTATÍSTICAS E UTILITÁRIOS
    // ============================================
    
    async contarChecklists() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists'], 'readonly');
            const store = transaction.objectStore('checklists');
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async obterTamanhoCache() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return { usado: 'N/A', disponivel: 'N/A' };
        }
        
        const estimate = await navigator.storage.estimate();
        const usadoMB = (estimate.usage / 1024 / 1024).toFixed(2);
        const disponivelMB = (estimate.quota / 1024 / 1024).toFixed(2);
        
        return {
            usado: `${usadoMB} MB`,
            disponivel: `${disponivelMB} MB`,
            percentual: ((estimate.usage / estimate.quota) * 100).toFixed(1) + '%'
        };
    }
    
    async limparCache() {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['checklists', 'fotos', 'metadata'], 'readwrite');
            
            transaction.objectStore('checklists').clear();
            transaction.objectStore('fotos').clear();
            transaction.objectStore('metadata').clear();
            
            transaction.oncomplete = () => {
                console.log('🧹 Cache limpo com sucesso!');
                resolve(true);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }
    
    async exibirEstatisticas() {
        const total = await this.contarChecklists();
        const tamanho = await this.obterTamanhoCache();
        const ultimaSync = await this.getUltimaSincronizacao();
        
        console.log('📊 === ESTATÍSTICAS DO CACHE ===');
        console.log(`📄 Total de checklists: ${total}`);
        console.log(`💾 Espaço usado: ${tamanho.usado} de ${tamanho.disponivel} (${tamanho.percentual})`);
        console.log(`⏰ Última sincronização: ${ultimaSync || 'Nunca'}`);
        console.log('===================================');
        
        return { total, tamanho, ultimaSync };
    }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================

const cacheManager = new CacheManager();

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CacheManager, cacheManager };
}

// Disponibilizar globalmente no navegador
if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;  // ✅ EXPORTA A CLASSE
    window.cacheManager = cacheManager;  // ✅ EXPORTA A INSTÂNCIA
    
    // Comandos de debug
    window.cacheDebug = {
        estatisticas: () => cacheManager.exibirEstatisticas(),
        listar: (limite) => cacheManager.listarChecklists(limite),
        buscar: (id) => cacheManager.buscarChecklist(id),
        limpar: () => cacheManager.limparCache(),
        tamanho: () => cacheManager.obterTamanhoCache(),
        ultimaSync: () => cacheManager.getUltimaSincronizacao()
    };
    
    console.log('🔧 === CACHE MANAGER DISPONÍVEL ===');
    console.log('cacheDebug.estatisticas()  - Ver estatísticas');
    console.log('cacheDebug.listar(10)      - Listar checklists');
    console.log('cacheDebug.tamanho()       - Ver uso de espaço');
    console.log('cacheDebug.limpar()        - Limpar cache');
    console.log('=====================================');
}

console.log('✅ Cache Manager carregado com sucesso!');
