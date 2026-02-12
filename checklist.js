// ==========================================
// MÓDULO FIREBASE E SINCRONIZAÇÃO
// ==========================================
async function salvarComFirebase(checklistData) {
    try {
        const modulo = await import('./firebase_app.js');
        if (modulo && modulo.salvarNoFirebase) {
            await modulo.salvarNoFirebase(checklistData);
            console.log("Salvo no Firebase!");
        }
    } catch (e) {
        console.error("Erro ao carregar Firebase:", e);
        throw e; // Propaga o erro para o checklist.js tratar
    }
}

async function sincronizarChecklists() {
    const btn = document.getElementById('btnSync');
    const txtOriginal = btn.textContent;
    btn.textContent = '⏳ Conectando...';
    btn.disabled = true;

    try {
        const modulo = await import('./firebase_app.js');
        if (modulo && modulo.buscarChecklistsNuvem) {
            btn.textContent = '⏳ Baixando...';
            const dadosNuvem = await modulo.buscarChecklistsNuvem();
            
            if (dadosNuvem.length > 0) {
                let local = JSON.parse(localStorage.getItem('checklists') || '[]');
                const idsLocais = new Set(local.map(c => c.id));
                
                let novos = 0;
                dadosNuvem.forEach(item => {
                    if (!idsLocais.has(item.id)) {
                        local.push(item);
                        novos++;
                    }
                });

                localStorage.setItem('checklists', JSON.stringify(local));
                carregarHistorico();
                alert(`✅ Sincronização concluída! ${novos} novos checklists baixados.`);
            } else {
                alert("📭 Nenhum checklist encontrado na nuvem para esta oficina (ou erro de configuração).");
            }
        }
    } catch (e) {
        console.error("Erro sync:", e);
        alert("❌ Erro ao sincronizar.\n\nDetalhe: " + (e.message || e) + "\n\nVerifique:\n1. Conexão com a Internet\n2. Token no arquivo config.js");
    } finally {
        btn.textContent = txtOriginal;
        btn.disabled = false;
    }
}

// ==========================================
// ORÇAMENTO - PEÇAS & SERVIÇOS
// ==========================================
let itensOrcamento = [];

function adicionarItemManual() {
  const descricaoInput = document.getElementById("descricaoItem");
  const valorInput = document.getElementById("valorItem");
  const tipo = document.querySelector('input[name="tipoItem"]:checked').value;

  const descricao = (descricaoInput.value || "").trim();
  const valorBruto = (valorInput.value || "").toString().trim();
  const valor = valorBruto === "" ? 0 : parseFloat(valorBruto);

  if (!descricao) {
    alert("Informe a descrição do item.");
    descricaoInput.focus();
    return;
  }

  if (isNaN(valor) || valor < 0) {
    alert("Informe um valor válido (0 ou maior).");
    valorInput.focus();
    return;
  }

  const item = {
    id: Date.now(),
    descricao,
    valor,
    tipo,
  };

  itensOrcamento.push(item);
  renderizarTabela();

  descricaoInput.value = "";
  valorInput.value = "";
  descricaoInput.focus();
}

function removerItem(id) {
    itensOrcamento = itensOrcamento.filter(i => i.id !== id);
    renderizarTabela();
}

function editarItem(id) {
    const item = itensOrcamento.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('descricaoItem').value = item.descricao;
    document.getElementById('valorItem').value = item.valor;
    document.querySelector(`input[name="tipoItem"][value="${item.tipo}"]`).checked = true;
    
    removerItem(id);
    alert('Item carregado para edição. Altere e clique ➕ Adicionar!');
}

function renderizarTabela() {
  const tbodyPecas = document.getElementById("tabelaPecas");
  const tbodyServicos = document.getElementById("tabelaServicos");

  const elTotalPecas = document.getElementById("totalPecas");
  const elTotalServicos = document.getElementById("totalServicos");
  const elTotalGeral = document.getElementById("totalGeralFinal");

  if (tbodyPecas) tbodyPecas.innerHTML = "";
  if (tbodyServicos) tbodyServicos.innerHTML = "";

  let somaPecas = 0;
  let somaServicos = 0;

  itensOrcamento.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="border: 1px solid #ddd; padding: 6px;">${item.descricao}</td>
      <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">R$ ${Number(item.valor || 0).toFixed(2)}</td>
      <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">
        <button class="btn-small btn-warning" onclick="editarItem(${item.id})" title="Editar">✏️</button>
        <button class="btn-small btn-danger" onclick="removerItem(${item.id})" title="Apagar">🗑️</button>
      </td>
    `;

    if (item.tipo === "servico") {
      somaServicos += Number(item.valor || 0);
      if (tbodyServicos) tbodyServicos.appendChild(tr);
    } else {
      somaPecas += Number(item.valor || 0);
      if (tbodyPecas) tbodyPecas.appendChild(tr);
    }
  });

  const somaTotal = somaPecas + somaServicos;

  if (elTotalPecas) elTotalPecas.textContent = `R$ ${somaPecas.toFixed(2)}`;
  if (elTotalServicos) elTotalServicos.textContent = `R$ ${somaServicos.toFixed(2)}`;
  if (elTotalGeral) elTotalGeral.textContent = `R$ ${somaTotal.toFixed(2)}`;
  
  const rTotalGeral = document.getElementById("rTotalGeral");
  if (rTotalGeral) rTotalGeral.textContent = `R$ ${somaTotal.toFixed(2)}`;
}

// ==========================================
// FUNÇÕES PRINCIPAIS E NAVEGAÇÃO
// ==========================================

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.tab-button').forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) btn.classList.add('active');
    });

    if (tabId === 'historico') carregarHistorico();
    if (tabId === 'relatorios') atualizarRelatorios();
    if (tabId === 'orcamento') atualizarResumoVeiculo();
}

async function salvarChecklist() {
    const placa = document.getElementById('placa').value;
    if (!placa) {
        alert("Por favor, preencha pelo menos a PLACA para salvar.");
        return;
    }

    const formData = {};
    const elements = document.getElementById('checklistForm').elements;

    for (let i = 0; i < elements.length; i++) {
        const item = elements[i];
        if (item.name) {
            if (item.type === 'checkbox') {
                if (item.checked) {
                    if (!formData[item.name]) formData[item.name] = [];
                    formData[item.name].push(item.value);
                }
            } else if (item.type !== 'button') {
                formData[item.name] = item.value;
            }
        }
    }

    const checklist = {
        id: Date.now(),
        data_criacao: new Date().toISOString(),
        ...formData
    };
    
    // Salva peças e serviços
    checklist.itensOrcamento = itensOrcamento || [];
    checklist.complexidade = document.getElementById('complexidade')?.value || '';
    
    // 1. SALVAR LOCALMENTE (SEMPRE)
    let checklists = JSON.parse(localStorage.getItem('checklists') || '[]');
    checklists.push(checklist);
    localStorage.setItem('checklists', JSON.stringify(checklists));

    // Feedback Visual
    const btnSalvar = document.querySelector('button[onclick="salvarChecklist()"]');
    const txtOriginal = btnSalvar ? btnSalvar.textContent : "Salvar";
    if(btnSalvar) {
        btnSalvar.textContent = "☁️ Salvando Nuvem...";
        btnSalvar.disabled = true;
    }
    
    // 2. TENTAR SALVAR NA NUVEM
    let msgExtra = "";
    try {
        await salvarComFirebase(checklist);
        msgExtra = " e na Nuvem!";
    } catch (e) {
        console.warn("Falha nuvem:", e);
        msgExtra = ".\n\n⚠️ AVISO: Salvo APENAS LOCALMENTE.\nErro ao salvar na nuvem: " + (e.message || "Erro desconhecido");
    } finally {
        if(btnSalvar) {
            btnSalvar.textContent = txtOriginal;
            btnSalvar.disabled = false;
        }
    }

    // Limpeza e reset
    itensOrcamento = [];
    renderizarTabela();

    alert("✅ Checklist salvo com sucesso no Histórico" + msgExtra);
    document.getElementById('checklistForm').reset();
    atualizarResumoVeiculo();
    switchTab('historico');
}

function carregarHistorico() {
    const listaDiv = document.getElementById('checklistsList');
    const emptyMsg = document.getElementById('emptyMessage');
    const checklists = JSON.parse(localStorage.getItem('checklists') || '[]');

    listaDiv.innerHTML = '';

    if (checklists.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    } else {
        emptyMsg.style.display = 'none';
    }

    checklists.slice().reverse().forEach(item => {
        const dataFormatada = new Date(item.data_criacao).toLocaleDateString('pt-BR');
        const horaFormatada = new Date(item.data_criacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        const card = document.createElement('div');
        card.className = 'checklist-item';
        card.innerHTML = `
            <div class="checklist-info">
                <h4>${(item.placa || '').toUpperCase()} - ${item.modelo || 'Modelo não inf.'}</h4>
                <p>📅 ${dataFormatada} às ${horaFormatada} | 👤 ${item.nome_cliente || 'Cliente não inf.'}</p>
            </div>
            <div class="checklist-actions">
                <button class="btn-small btn-secondary" onclick="carregarChecklist(${item.id})">✏️ Editar</button>
                <button class="btn-small btn-danger" onclick="excluirChecklist(${item.id})">🗑️</button>
            </div>
        `;
        listaDiv.appendChild(card);
    });
}

function carregarChecklist(id) {
    const checklists = JSON.parse(localStorage.getItem('checklists') || '[]');
    const item = checklists.find(c => c.id === id);

    if (!item) return;

    switchTab('novo-checklist');

    if (item.nome_cliente && !item.nomecliente) item.nomecliente = item.nome_cliente;

    const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val || ''; }
    
    setVal('nomecliente', item.nomecliente);
    setVal('cpfcnpj', item.cpf_cnpj || item.cpfcnpj);
    setVal('celularcliente', item.telefone || item.contato || item.celularcliente);
    setVal('placa', item.placa);
    setVal('modelo', item.modelo);

    for (const key in item) {
        const el = document.getElementsByName(key)[0];
        if (el && el.type !== 'checkbox' && el.type !== 'file' && el.type !== 'radio') {
            el.value = item[key];
        }
    }

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    if (item.equipamentos) item.equipamentos.forEach(val => marcarCheckbox('equipamentos', val));
    if (item.caracteristicas) item.caracteristicas.forEach(val => marcarCheckbox('caracteristicas', val));
    if (item.cambio) item.cambio.forEach(val => marcarCheckbox('cambio', val));
    if (item.tracao) item.tracao.forEach(val => marcarCheckbox('tracao', val));
    
    itensOrcamento = item.itensOrcamento || [];
    if(document.getElementById('complexidade')) document.getElementById('complexidade').value = item.complexidade || '';
    renderizarTabela();
    
    atualizarResumoVeiculo();
}

function marcarCheckbox(name, value) {
    const els = document.getElementsByName(name);
    els.forEach(el => { if (el.value === value) el.checked = true; });
}

function excluirChecklist(id) {
    if (confirm("Tem certeza que deseja excluir este checklist?")) {
        let checklists = JSON.parse(localStorage.getItem('checklists') || '[]');
        checklists = checklists.filter(c => c.id !== id);
        localStorage.setItem('checklists', JSON.stringify(checklists));
        carregarHistorico();
    }
}

function filtrarChecklists() {
    const termo = document.getElementById('searchInput').value.toLowerCase();
    const checklists = JSON.parse(localStorage.getItem('checklists') || '[]');
    const listaDiv = document.getElementById('checklistsList');
    const emptyMsg = document.getElementById('emptyMessage');

    listaDiv.innerHTML = '';

    const filtrados = checklists.filter(item => {
        const texto = ((item.placa || '') + ' ' + (item.modelo || '') + ' ' + (item.nome_cliente || '')).toLowerCase();
        return texto.includes(termo);
    });

    if (!filtrados.length) {
        emptyMsg.style.display = 'block';
        return;
    } else {
        emptyMsg.style.display = 'none';
    }

    filtrados.slice().reverse().forEach(item => {
        const dataFormatada = new Date(item.data_criacao).toLocaleDateString('pt-BR');
        const horaFormatada = new Date(item.data_criacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

        const card = document.createElement('div');
        card.className = 'checklist-item';
        card.innerHTML = `
            <div class="checklist-info">
                <h4>${(item.placa || '').toUpperCase()} - ${item.modelo || 'Modelo não inf.'}</h4>
                <p>📅 ${dataFormatada} às ${horaFormatada} | 👤 ${item.nome_cliente || 'Cliente não inf.'}</p>
            </div>
            <div class="checklist-actions">
                <button class="btn-small btn-secondary" onclick="carregarChecklist(${item.id})">✏️ Editar</button>
                <button class="btn-small btn-danger" onclick="excluirChecklist(${item.id})">🗑️</button>
            </div>
        `;
        listaDiv.appendChild(card);
    });
}

function ordenarChecklists() {
    const checklists = JSON.parse(localStorage.getItem('checklists') || '[]');
    checklists.sort((a, b) => {
        const placaA = (a.placa || '').toUpperCase();
        const placaB = (b.placa || '').toUpperCase();
        if (placaA < placaB) return -1;
        if (placaA > placaB) return 1;
        return 0;
    });
    localStorage.setItem('checklists', JSON.stringify(checklists));
    carregarHistorico();
}

function limparFormulario() {
    if (confirm("Limpar todos os campos do formulário?")) {
        document.getElementById('checklistForm').reset();
        atualizarResumoVeiculo();
    }
}

function exportarDados() {
    const db = JSON.parse(localStorage.getItem('checklists') || '[]');
    if (!db.length) {
        alert("Não há dados para exportar.");
        return;
    }
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'checklists.json';
    a.click();
    URL.revokeObjectURL(url);
}

function limparTodosDados() {
    if (confirm("Deseja apagar TODO o histórico?")) {
        localStorage.removeItem('checklists');
        carregarHistorico();
        alert("Histórico limpo.");
    }
}

function atualizarRelatorios() {
    const db = JSON.parse(localStorage.getItem('checklists') || '[]');
    document.getElementById('totalChecklists').textContent = db.length;

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const doMes = db.filter(item => {
        if (!item.data_criacao) return false;
        const dataItem = new Date(item.data_criacao);
        return dataItem.getMonth() === mesAtual && dataItem.getFullYear() === anoAtual;
    });
    document.getElementById('checklistsMes').textContent = doMes.length;

    const marcas = {};
    db.forEach(item => {
        const modeloTexto = item.modelo || 'Não Informado';
        const m = modeloTexto.split(' ')[0].toUpperCase();
        marcas[m] = (marcas[m] || 0) + 1;
    });

    const sortedMarcas = Object.entries(marcas).sort((a,b) => b[1] - a[1]).slice(0, 5);
    let htmlGrafico = '';
    sortedMarcas.forEach(([marca, qtd]) => {
        const pct = (qtd / db.length) * 100;
        htmlGrafico += `
            <div style="margin-bottom: 10px;">
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
                    <strong>${marca}</strong>
                    <span>${qtd}</span>
                </div>
                <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:var(--color-primary); width:${pct}%; height:100%;"></div>
                </div>
            </div>
        `;
    });

    if (!sortedMarcas.length) {
        htmlGrafico = '<p style="text-align:center; color:#999; font-size:12px;">Sem dados suficientes.</p>';
    }

    document.getElementById('graficoMarcas').innerHTML = htmlGrafico;
}

function atualizarResumoVeiculo() {
    const vPlaca = document.getElementById('placa')?.value || '-';
    const vModelo = document.getElementById('modelo')?.value || '-';
    const vChassi = document.getElementById('chassi')?.value || '-';
    const vKm = document.getElementById('km_entrada')?.value || '-';
    const vData = document.getElementById('data')?.value || '-';
    const vHora = document.getElementById('hora')?.value || '-';
    const vComb = document.getElementById('combustivel')?.value || '-';
    const vComplex = document.getElementById('complexidade')?.value || '-';

    const setContent = (id, val) => { if(document.getElementById(id)) document.getElementById(id).textContent = val; }

    setContent('resumoPlaca', vPlaca);
    setContent('resumoModelo', vModelo);
    setContent('resumoKmEntrada', vKm);
    setContent('resumoData', vData);

    setContent('resumoPlaca2', vPlaca);
    setContent('resumoModelo2', vModelo);
    setContent('resumoChassi2', vChassi);
    setContent('resumoKmEntrada2', vKm);
    setContent('resumoComplexidade', vComplex);

    setContent('resumoPlaca3', vPlaca);
    setContent('resumoModelo3', vModelo);
    setContent('resumoChassi3', vChassi);
    setContent('resumoKmFotos', vKm);
}

// ==========================================
// FOTOS - CÂMERA OTIMIZADA
// ==========================================
let streamCamera = null;
let fotosVeiculo = JSON.parse(localStorage.getItem('fotosVeiculo') || '[]');

function iniciarCamera() {
  const video = document.getElementById('cameraPreview');
  const btnTirar = document.getElementById('btnTirarFoto');
  const container = document.querySelector('.camera-container');

  container.style.display = 'block';
  btnTirar.style.display = 'inline-block';
  btnTirar.disabled = true;

  if (navigator.geolocation) {
    try { navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 800 }); } catch(e) {}
  }

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  }).then((stream) => {
    streamCamera = stream;
    video.srcObject = stream;

    const habilitar = () => {
      if (video.videoWidth && video.videoHeight) btnTirar.disabled = false;
    };

    video.onloadedmetadata = () => {
      habilitar();
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    video.oncanplay = () => habilitar();
    setTimeout(habilitar, 600); // fallback
  }).catch(err => {
    container.style.display = 'none';
    btnTirar.style.display = 'none';
    alert('Erro câmera: ' + err.message + '\nUse "Galeria"');
  });
}

function tirarFoto(tentativa = 0) {
  const video = document.getElementById('cameraPreview');

  if (!video.videoWidth || !video.videoHeight) {
    if (tentativa < 10) {
      setTimeout(() => tirarFoto(tentativa + 1), 120);
      return;
    }
    alert('A câmera ainda está carregando. Aguarde 1 segundo e tente novamente.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  adicionarMarcaDagua(canvas, () => {
    const foto = {
      id: Date.now(),
      dataURL: canvas.toDataURL('image/jpeg', 0.82),
      data: new Date().toLocaleString('pt-BR'),
      legenda: ''
    };

    fotosVeiculo.unshift(foto);
    if (fotosVeiculo.length > 15) fotosVeiculo = fotosVeiculo.slice(0, 15);
    localStorage.setItem('fotosVeiculo', JSON.stringify(fotosVeiculo));
    renderizarGaleria();
    pararCamera();
  });
}

function obterTextoMarcaDagua(timeoutMs = 1500) {
  const dataHora = new Date().toLocaleString('pt-BR');

  if (!navigator.geolocation) return Promise.resolve(dataHora);

  return new Promise((resolve) => {
    let finalizado = false;
    const finalizar = (texto) => {
      if (finalizado) return;
      finalizado = true;
      resolve(texto);
    };

    const timer = setTimeout(() => finalizar(dataHora), timeoutMs);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          finalizar(`${dataHora} | ${lat}, ${lng}`);
        },
        () => {
          clearTimeout(timer);
          finalizar(dataHora);
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
      );
    } catch (e) {
      clearTimeout(timer);
      finalizar(dataHora);
    }
  });
}

function adicionarMarcaDagua(canvas, callback) {
  const ctx = canvas.getContext('2d');
  obterTextoMarcaDagua(1500).then((texto) => {
    desenharTexto(ctx, canvas.width, canvas.height, texto);
    callback();
  });
}

function desenharTexto(ctx, w, h, texto) {
  const base = Math.min(w, h);
  const fontSize = Math.max(14, Math.min(22, Math.round(base * 0.018)));

  const padX = Math.round(fontSize * 0.8);
  const padY = Math.round(fontSize * 0.55);

  ctx.save();
  ctx.font = `600 ${fontSize}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  const x = 20;
  const y = h - 20;

  const textWidth = ctx.measureText(texto).width;
  const boxW = textWidth + padX * 2;
  const boxH = fontSize + padY * 2;

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x - padX, y - fontSize - padY, boxW, boxH);

  ctx.fillStyle = '#fff';
  ctx.fillText(texto, x, y);
  ctx.restore();
}

function pararCamera() {
    if (streamCamera) {
        streamCamera.getTracks().forEach(track => track.stop());
        streamCamera = null;
    }
    document.querySelector('.camera-container').style.display = 'none';
    document.getElementById('btnTirarFoto').style.display = 'none';
}

function adicionarFotos(event) {
    const files = Array.from(event.target.files);
    const processarArquivo = (index) => {
        if (index >= files.length) return;
        
        const file = files[index];
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                adicionarMarcaDagua(canvas, () => {
                   fotosVeiculo.unshift({
                        id: Date.now() + Math.random(),
                        dataURL: canvas.toDataURL('image/jpeg', 0.82),
                        data: new Date().toLocaleString('pt-BR'),
                        legenda: ''
                    });
                    if (fotosVeiculo.length > 15) fotosVeiculo = fotosVeiculo.slice(0, 15);
                    localStorage.setItem('fotosVeiculo', JSON.stringify(fotosVeiculo));
                    renderizarGaleria();
                    processarArquivo(index + 1);
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
    processarArquivo(0);
    event.target.value = '';
}

function renderizarGaleria() {
    const galeria = document.getElementById('galeriaFotos');
    if (!galeria) return;
    galeria.innerHTML = '';
    
    if (fotosVeiculo.length === 0) {
        galeria.innerHTML = '<p style="text-align:center;color:#999;padding:40px">📭 Nenhuma foto</p>';
        return;
    }
    
    fotosVeiculo.slice(0, 15).forEach((foto, index) => {
        const div = document.createElement('div');
        div.className = 'foto-item';
        div.innerHTML = `
            <img src="${foto.dataURL}" alt="Foto ${index + 1}" loading="lazy">
            <input type="text" class="foto-legenda" value="${foto.legenda || ''}" placeholder="Escreva uma legenda..." onchange="salvarLegenda(${foto.id}, this.value)">
            <div class="foto-overlay"><span style="color:white;font-size:10px">${foto.data}</span></div>
            <div class="foto-actions">
                <button class="btn-foto btn-warning foto-zoom" data-url="${foto.dataURL}">🔍</button>
                <button class="btn-foto btn-danger foto-delete" data-id="${foto.id}">🗑️</button>
            </div>
        `;
        galeria.appendChild(div);
    });
    
    galeria.querySelectorAll('.foto-zoom').forEach(btn => {
        btn.addEventListener('click', () => abrirFotoGrande(btn.dataset.url));
    });
    galeria.querySelectorAll('.foto-delete').forEach(btn => {
        btn.addEventListener('click', () => removerFoto(parseInt(btn.dataset.id)));
    });
}

function salvarLegenda(id, texto) {
    const foto = fotosVeiculo.find(f => f.id === id);
    if (foto) {
        foto.legenda = texto;
        localStorage.setItem('fotosVeiculo', JSON.stringify(fotosVeiculo));
    }
}

function removerFoto(id) {
    fotosVeiculo = fotosVeiculo.filter(f => f.id !== id);
    localStorage.setItem('fotosVeiculo', JSON.stringify(fotosVeiculo));
    renderizarGaleria();
}

function limparFotos() {
    if (confirm('🗑️ Limpar TODAS as fotos?')) {
        fotosVeiculo = [];
        localStorage.removeItem('fotosVeiculo');
        renderizarGaleria();
    }
}

function abrirFotoGrande(dataURL) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100vw; height:100vh; 
        background:rgba(0,0,0,0.95); z-index:9999; display:flex; 
        align-items:center; justify-content:center; padding:20px;
    `;
    modal.innerHTML = `
        <img src="${dataURL}" style="max-width:95%; max-height:95%; border-radius:8px; box-shadow:0 0 50px rgba(255,255,255,0.3);">
        <button onclick="this.parentElement.remove()" style="
            position:absolute; top:20px; right:20px; background:#e41616; 
            color:white; border:none; border-radius:50%; width:50px; 
            height:50px; font-size:20px; cursor:pointer;
        ">✕</button>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function gerarPDFFotos() {
    if (!fotosVeiculo || fotosVeiculo.length === 0) {
        alert('📭 Sem fotos para gerar PDF');
        return;
    }

    const placa  = document.getElementById('placa')?.value  || 'SEM_PLACA';
    const modelo = document.getElementById('modelo')?.value || 'SEM_MODELO';
    const chassi = document.getElementById('chassi')?.value || 'SEM_CHASSI';

    const MAXFOTOS = 16;
    const fotosUsar = fotosVeiculo.slice(0, MAXFOTOS);

    let html = '';

    for (let i = 0; i < fotosUsar.length; i += 4) {
        const isLastGroup = i + 4 >= fotosUsar.length;
        html += `
            <div style="width: 100%; min-height: 100vh; box-sizing: border-box; padding: 20px; font-family: Arial, sans-serif; ${isLastGroup ? '' : 'page-break-after: always;'}">
                <div style="background: #f5f5f5; border: 2px solid #e41616; border-radius: 6px; padding: 10px 15px; margin-bottom: 15px; font-size: 11px; line-height: 1.5;">
                    <div style="font-weight: bold; color: #e41616; font-size: 12px; margin-bottom: 5px;">- INSPEÇÃO DE FOTOS</div>
                    <div><strong>Placa:</strong> ${placa}</div>
                    <div><strong>Modelo:</strong> ${modelo}</div>
                    <div><strong>Chassi:</strong> ${chassi}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        `;

        for (let j = 0; j < 4 && (i + j) < fotosUsar.length; j++) {
            const foto = fotosUsar[i + j];
            const num = i + j + 1;
            html += `
                <div style="text-align: center;">
                    <img src="${foto.dataURL}" style="width: 100%; max-width: 260px; max-height: 260px; height: auto; border-radius: 6px; border: 1px solid #e41616;">
                    <div style="font-size: 9px; margin-top: 5px; color: #555;">
                        Foto ${num} - ${foto.legenda || foto.data}
                    </div>
                </div>
            `;
        }
        html += `</div></div>`;
    }

    html2pdf().set({
        filename: `Fotos-${placa}.pdf`,
        margin: 0,
        image: { type: 'jpeg', quality: 0.9 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { format: 'a4', orientation: 'portrait', unit: 'pt' }
    }).from(html).save();
}

// ==========================================
// RESUMO E IMPRESSÃO
// ==========================================
function gerarNumeroOS() {
    const placa = (document.getElementById('placa')?.value || 'OS').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let dataRaw = document.getElementById('data')?.value;
    let dataObj = dataRaw ? new Date(dataRaw + 'T00:00:00') : new Date();
    
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = String(dataObj.getFullYear()).slice(-2);
    
    return `${placa}-${dia}-${mes}-${ano}`;
}

function atualizarBarraOS() {
    const os = gerarNumeroOS();
    const el = document.getElementById('barraFixaOS');
    if (el) el.textContent = os;
}

function atualizarResumoOS() {
    // Cabeçalho
    const logoSrc = document.getElementById('logo-oficina')?.src;
    if (logoSrc) document.getElementById('logoResumo').src = logoSrc;
    
    document.getElementById('nomeOficinaResumo').textContent = document.getElementById('nome-oficina')?.textContent || 'OFICINA';
    document.getElementById('enderecoOficinaResumo').textContent = document.getElementById('endereco-oficina')?.textContent || '';
    document.getElementById('telefoneOficinaResumo').textContent = document.getElementById('telefone-oficina')?.textContent || '';
    document.getElementById('cnpjOficinaResumo').textContent = document.getElementById('cnpj-oficina')?.textContent || '';
    document.getElementById('osNumero').textContent = gerarNumeroOS();

    // Dados Cliente/Veículo
    document.getElementById('rNomeCliente').textContent = document.getElementById('nome_cliente')?.value || '-';
    document.getElementById('rCpfCnpj').textContent = document.getElementById('cpf_cnpj')?.value || '-';
    document.getElementById('rCelular').textContent = document.getElementById('celular_cliente')?.value || '-';
    document.getElementById('rModelo').textContent = document.getElementById('modelo')?.value || '-';
    document.getElementById('rPlaca').textContent = (document.getElementById('placa')?.value || '-').toUpperCase();
    document.getElementById('rChassi').textContent = document.getElementById('chassi')?.value || '-';
    document.getElementById('rKmEntrada').textContent = (document.getElementById('km_entrada')?.value || '') + ' km';
    
    let combSelect = document.getElementById('combustivel');
    let combTexto = combSelect && combSelect.selectedIndex >= 0 ? combSelect.options[combSelect.selectedIndex].text : '-';
    document.getElementById('rCombustivel').textContent = combTexto;

    let dataVal = document.getElementById('data')?.value;
    let horaVal = document.getElementById('hora')?.value;
    let dataFmt = dataVal ? dataVal.split('-').reverse().join('/') : '--/--/----';
    document.getElementById('rEntradaDataHora').textContent = `${dataFmt} às ${horaVal || '--:--'}`;
    
    document.getElementById('rServicos').textContent = document.getElementById('servicos')?.value || '-';
    document.getElementById('rObsInspecao').textContent = document.getElementById('obsInspecao')?.value || '-';

    // Checklist
    const areaBadges = document.getElementById('rChecklistBadges');
    areaBadges.innerHTML = ''; 
    const checkboxesMarcados = document.querySelectorAll('#checklistForm input[type="checkbox"]:checked');

    if (checkboxesMarcados.length === 0) {
        areaBadges.innerHTML = '<span style="color:#999; font-size:11px;">Nenhum item inspecionado/marcado.</span>';
    } else {
        checkboxesMarcados.forEach(cb => {
            let textoLabel = cb.value;
            let labelTag = document.querySelector(`label[for="${cb.id}"]`);
            if (labelTag) textoLabel = labelTag.textContent;
            
            let span = document.createElement('span');
            const palavrasRuim = ['TRINCADO', 'AMASSADO', 'RISCADO', 'QUEBRADO', 'DANIFICADO', 'FALTANDO', 'RUIM'];
            const ehRuim = palavrasRuim.some(p => textoLabel.toUpperCase().includes(p));

            span.className = ehRuim ? 'os-badge no' : 'os-badge ok';
            span.innerHTML = ehRuim ? `⚠️ ${textoLabel}` : `✅ ${textoLabel}`;
            areaBadges.appendChild(span);
        });
    }

    // Tabelas Orçamento
    const containerTabelas = document.getElementById('containerTabelasOrcamento');
    containerTabelas.innerHTML = '';
    
    const pecasTodas = itensOrcamento.filter(i => i.tipo !== 'servico');
    const servicosTodos = itensOrcamento.filter(i => i.tipo === 'servico');
    
    const divGrid = document.createElement('div');
    divGrid.className = 'os-grid-2 mt-10';
    divGrid.style.gap = '18px';
    
    const geraTabela = (titulo, itens, cor) => `
        <div class="os-table-header" style="border-bottom: 2px solid ${cor}">${titulo}</div>
        <table class="os-table" style="border: 2px solid ${cor}; border-radius: 6px; width:100%; border-collapse:collapse;">
            <thead><tr><th style="text-align:left;border-bottom:2px solid ${cor};padding:6px;font-size:11px;">DESCRIÇÃO</th><th style="text-align:right;border-bottom:2px solid ${cor};padding:6px;font-size:11px;width:90px;">VALOR</th></tr></thead>
            <tbody>${itens.length ? itens.map(p => `<tr><td style="padding:4px 6px;border-bottom:1px solid #eee;font-size:10px;">${p.descricao}</td><td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;font-size:10px;">R$ ${p.valor.toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="2" style="text-align:center;color:#999;padding:10px">-</td></tr>'}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:8px;padding:8px 10px;border:1px solid ${cor};border-radius:6px;">
            <strong style="color:${cor};">TOTAL ${titulo}</strong>
            <span style="font-weight:700;color:${cor};">R$ ${itens.reduce((a,b)=>a+b.valor,0).toFixed(2)}</span>
        </div>
    `;

    const divPecas = document.createElement('div');
    divPecas.innerHTML = geraTabela('PEÇAS', pecasTodas, '#0056b3');
    const divServicos = document.createElement('div');
    divServicos.innerHTML = geraTabela('SERVIÇOS', servicosTodos, '#e41616');

    divGrid.appendChild(divPecas);
    divGrid.appendChild(divServicos);
    containerTabelas.appendChild(divGrid);

    // Rodapé
    const textoRodape = `Checklist gerado por ${document.getElementById('nome-oficina')?.textContent || 'Oficina'} CNPJ ${document.getElementById('cnpj-oficina')?.textContent || ''} - ${new Date().toLocaleString('pt-BR')}`;
    const rod1 = document.getElementById('rodape-texto-1');
    const rod2 = document.getElementById('rodape-texto-2');
    if (rod1) rod1.textContent = textoRodape;
    if (rod2) rod2.textContent = textoRodape;
    
    // Header Pág 2
    const headerPag2 = document.getElementById('header-pag2');
    if(headerPag2) headerPag2.innerHTML = document.getElementById('template-cabecalho').innerHTML;
}

function gerarPDFResumo() {
  atualizarResumoOS();
  document.querySelectorAll('.no-pdf').forEach(el => el.style.display = 'none');
  const elemento = document.getElementById('resumoContainer');

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `OS-${(document.getElementById('placa')?.value || '').toUpperCase()}_CHECKLIST.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  html2pdf().set(opt).from(elemento).save()
    .then(() => { document.querySelectorAll('.no-pdf').forEach(el => el.style.display = ''); })
    .catch(() => { document.querySelectorAll('.no-pdf').forEach(el => el.style.display = ''); });
}

function gerarPDF() {
    const elemento = document.querySelector('.container');
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPadding = document.body.style.padding;
    const originalContainerMargin = elemento.style.margin;
    const originalContainerBoxShadow = elemento.style.boxShadow;

    window.scrollTo(0, 0);
    document.body.style.overflow = 'visible';
    document.body.style.padding = '0';
    elemento.style.margin = '0 auto';
    elemento.style.boxShadow = 'none';

    const botoes = document.querySelectorAll('button, .tabs, .header-badge, .action-buttons');
    botoes.forEach(btn => btn.style.display = 'none');
    
    const rodape = document.querySelector('.os-footer');
    rodape.style.display = 'block !important';

    const opt = {
        margin: [10, 15, 10, 15],
        filename: 'Checklist-' + document.getElementById('placa').value + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: true, letterRendering: true, allowTaint: true, width: 794, height: 1123 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(elemento).save().then(() => {
        botoes.forEach(btn => btn.style.display = '');
        document.querySelector('.tabs').style.display = 'flex';
        document.querySelector('.header-badge').style.display = 'block';
        document.querySelectorAll('.action-buttons').forEach(ab => ab.style.display = 'flex');
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.padding = originalBodyPadding;
        elemento.style.margin = originalContainerMargin;
        elemento.style.boxShadow = originalContainerBoxShadow;
    }).catch(err => {
        console.error(err);
        alert("Erro ao gerar PDF.");
        botoes.forEach(btn => btn.style.display = '');
        document.body.style.overflow = originalBodyOverflow;
    });
}

function showStep(stepNumber) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step' + stepNumber).classList.add('active');
    document.querySelectorAll('.step-indicator').forEach(el => {
        el.classList.remove('active');
        if (el.dataset.step == stepNumber) el.classList.add('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep(step) {
    if (step === 2) {
        const placa = document.getElementById('placa').value;
        if (!placa) {
            alert('⚠️ Por favor, digite a PLACA antes de continuar.');
            document.getElementById('placa').focus();
            return;
        }
    }
    showStep(step);
}

function prevStep(step) { showStep(step); }

document.addEventListener('DOMContentLoaded', () => {
  renderizarGaleria();
  atualizarBarraOS();

  const descricaoItem = document.getElementById("descricaoItem");
  const valorItem = document.getElementById("valorItem");

  if (descricaoItem) {
    descricaoItem.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      if (valorItem) valorItem.focus();
    });
  }

  if (valorItem) {
    valorItem.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      adicionarItemManual();
      setTimeout(() => descricaoItem && descricaoItem.focus(), 0);
    });
  }
  
  const camposMonitorados = ['placa', 'modelo', 'chassi', 'km_entrada', 'data', 'hora', 'combustivel', 'complexidade'];
  camposMonitorados.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.addEventListener('input', atualizarResumoVeiculo);
  });
  
  document.getElementById('placa')?.addEventListener('input', atualizarBarraOS);
  document.getElementById('data')?.addEventListener('input', atualizarBarraOS);
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('data:application/javascript;base64,CmNvbnN0IENBQ0hFX05BTUUgPSAnY2hlY2tsaXN0LXYzLWNhY2hlJzsKY29uc3QgVVJMU19UT19DQUNIRSA9IFsKICAnLycsCiAgJy9pbmRleC5odG1sJwpdOwoKc2VsZi5hZGRFdmVudExpc3RlbmVyKCdpbnN0YWxsJywgKGV2ZW50KSA9PiB7CiAgY29uc3QgY2FjaGVPcGVuID0gY2FjaGVzLm9wZW4oQ0FDSEVfTkFNRSkudGhlbigY2xpZW50KSA9PiB7CiAgICByZXR1cm4gY2xpZW50LmFkZEFsbChVUkxzX1RPX0NBQ0hFKTsKICB9KTsKICBldmVudC53YWl0VW50aWwoKGNhY2hlT3Blbik7Cn0pOwoKc2VsZi5hZGRFdmVudExpc3RlbmVyKCdmZXRjaCcsIChldmVudCkgPT4gewogIGV2ZW50LnJlc3BvbmRXaXRoKAogICAgY2FjaGVzLm1hdGNoKGV2ZW50LnJlcXVlc3QpLnRoZW4oKHJlc3BvbnNlKSA9PiB7CiAgICAgIGlmIChyZXNwb25zZSkgewogICAgICAgIHJldHVybiByZXNwb25zZTsKICAgICAgfQogICAgICByZXR1cm4gZmV0Y2goZXZlbnQucmVxdWVzdCk7CiAgICB9KQogICk7Cn0pOwo=');
}
