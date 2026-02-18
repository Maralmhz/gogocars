// sync_manager.js - SINCRONIZAÇÃO INTELIGENTE [GOGOCARS]
import { buscarChecklistsMes, buscarChecklistsMesAtual } from './firebase_app.js';

class SyncManager {
    constructor() {
        this.syncEmAndamento = false;
        this.ultimaSync = null;
    }
    async sincronizarInteligente(forcarCompleto = false) {
        if (this.syncEmAndamento) return { sucesso: false, mensagem: 'Sync em andamento' };
        try {
            this.syncEmAndamento = true;
            console.log('🔄 Sync inteligente [GogoCars]...');
            const cache = window.cacheManager;
            const ultimaSync = await cache.getUltimaSincronizacao();
            let checklistsNuvem = !ultimaSync || forcarCompleto ? await buscarChecklistsMesAtual() : await this.buscarNovosOuModificados(ultimaSync);
            const resultado = await this.sincronizarComCache(checklistsNuvem);
            await cache.setUltimaSincronizacao();
            return { sucesso: true, ...resultado };
        } finally {
            this.syncEmAndamento = false;
        }
    }
    async buscarNovosOuModificados(timestamp) {
        const checklistsMesAtual = await buscarChecklistsMesAtual();
        return checklistsMesAtual.filter(c => new Date(c.atualizado_em || c.data_criacao) > new Date(timestamp));
    }
    async sincronizarComCache(checklistsNuvem) {
        const cache = window.cacheManager;
        let novos = 0, atualizados = 0;
        for (const c of checklistsNuvem) {
            const local = await cache.buscarChecklist(c.id);
            if (!local) { await cache.salvarChecklist(c, true); novos++; }
            else if (new Date(c.atualizado_em) > new Date(local.atualizado_em)) { await cache.salvarChecklist(c, true); atualizados++; }
        }
        return { novos, atualizados, total: checklistsNuvem.length };
    }
}
const syncManager = new SyncManager();
if (typeof window !== 'undefined') {
    window.syncManager = syncManager;
    window.syncDebug = { sincronizar: (f) => syncManager.sincronizarInteligente(f) };
}
console.log('✅ Sync Manager carregado [GogoCars]!');
export { SyncManager, syncManager };
