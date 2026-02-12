document.addEventListener('DOMContentLoaded', function () {
    // garante que config.js já foi carregado via <script src="config.js"> no HTML
    if (!window.OFICINA_CONFIG) {
        console.warn('OFICINA_CONFIG não encontrado. Usando textos padrão do HTML.');
        return;
    }

    const cfg = window.OFICINA_CONFIG;

    // Elementos principais
    const elTituloPagina   = document.getElementById('titulo-pagina');
    const elLogo           = document.getElementById('logo-oficina');
    const elNomeOficina    = document.getElementById('nome-oficina');
    const elSubtitulo      = document.getElementById('subtitulo-oficina');
    const elTelefone       = document.getElementById('telefone-oficina');
    const elEndereco       = document.getElementById('endereco-oficina');
    const elCnpj = document.getElementById('cnpj-oficina');


    if (elTituloPagina && cfg.nome)     elTituloPagina.textContent = `Checklist de Entrada – ${cfg.nome}`;
    if (elLogo && cfg.logo)             elLogo.src = cfg.logo;
    if (elNomeOficina && cfg.nome)      elNomeOficina.textContent = cfg.nome;
    if (elSubtitulo && cfg.subtitulo)   elSubtitulo.textContent = cfg.subtitulo;
    if (elTelefone && cfg.telefone)     elTelefone.textContent = cfg.telefone;
    if (elEndereco && cfg.endereco)     elEndereco.textContent = cfg.endereco;
    if (elCnpj && cfg.cnpj) elCnpj.textContent = `CNPJ ${cfg.cnpj}`;  

    // Cor principal (usa sua var existente)
    if (cfg.corPrimaria) {
        document.documentElement.style.setProperty('--color-primary', cfg.corPrimaria);
    }

});
