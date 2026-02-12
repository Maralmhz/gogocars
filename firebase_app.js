// firebase_app.js
// Adaptador para usar GitHub Gist como "backend", já que o checklist.js espera essa interface.

export async function buscarChecklistsNuvem() {
    try {
        const config = window.CLOUD_CONFIG;
        if (!config || !config.GIST_ID || !config.TOKEN) {
            console.warn("Configuração de nuvem (Gist) não encontrada.");
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
            console.error("Erro ao buscar Gist:", response.statusText);
            return [];
        }

        const data = await response.json();
        const filename = config.FILENAME || 'checklist_backup.json';
        
        if (data.files && data.files[filename]) {
            const content = data.files[filename].content;
            return JSON.parse(content || '[]');
        }
        
        return [];
    } catch (error) {
        console.error("Erro na busca nuvem:", error);
        throw error; // Repassa o erro para o checklist.js tratar
    }
}

export async function salvarNoFirebase(checklist) {
    // Nota: O nome da função é mantido para compatibilidade com o checklist.js existente,
    // mas a implementação salva no GitHub Gist.
    try {
        const config = window.CLOUD_CONFIG;
        if (!config || !config.GIST_ID || !config.TOKEN) {
            console.warn("Configuração de nuvem (Gist) não encontrada. Salvamento ignorado.");
            return;
        }

        // 1. Buscar dados atuais para não sobrescrever
        const dadosAtuais = await buscarChecklistsNuvem();
        
        // 2. Atualizar ou Adicionar o novo checklist
        const index = dadosAtuais.findIndex(c => c.id === checklist.id);
        if (index >= 0) {
            dadosAtuais[index] = checklist; // Atualiza
        } else {
            dadosAtuais.push(checklist); // Adiciona
        }

        // 3. Salvar de volta no Gist
        const filename = config.FILENAME || 'checklist_backup.json';
        const url = `https://api.github.com/gists/${config.GIST_ID}`;
        
        const body = {
            files: {
                [filename]: {
                    content: JSON.stringify(dadosAtuais, null, 2)
                }
            }
        };

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${config.TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Erro ao salvar no Gist: ${response.statusText}`);
        }
        
        console.log("Salvo no Gist com sucesso!");

    } catch (error) {
        console.error("Erro ao salvar nuvem:", error);
        throw error;
    }
}
