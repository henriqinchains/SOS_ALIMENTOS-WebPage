const render = "https://sos-alimentos-webpage-servidor.onrender.com";

let listaDeProdutos = [];
let dadosPlanilhaMemoria = []; 

// ==========================================
// 1. GERENCIAMENTO DE PRODUTOS (VITRINE)
// ==========================================

async function carregarProdutos() {
    try {
        const resposta = await fetch(`${render}/api/produtos`);
        listaDeProdutos = await resposta.json();
        renderizarTabela(); 
    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        alert('Erro ao carregar a lista de produtos do servidor.');
    }
}

// Desenha a tabela principal da Vitrine
function renderizarTabela() {
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = '';

    listaDeProdutos.forEach(produto => {
        
        // Define o quadradinho da foto com Lazy Loading para otimização
        const urlFoto = produto.img ? produto.img : '';
        const imgHtml = urlFoto 
            ? `<img src="${urlFoto}" loading="lazy" alt="Foto">` 
            : `<span>📷</span>`;

        const linha = `
            <tr>
                <td>
                    <div class="thumb-tabela" onclick="abrirModalImagem('${produto._id}')" title="Alterar Foto">
                        ${imgHtml}
                    </div>
                </td>
                <td>${produto.nomeProduto}</td>
                <td>${produto.unidade}</td>
                <td>R$ ${produto.valorProduto.toFixed(2).replace('.', ',')}</td>
                <td>
                    <span class="status-badge" style="padding: 4px 8px; border-radius: 12px; font-size: 12px; background: ${produto.emPromocao ? '#fff3cd' : '#f8f9fa'}; color: ${produto.emPromocao ? '#856404' : '#6c757d'}; border: 1px solid ${produto.emPromocao ? '#ffeeba' : '#dee2e6'};">
                        ${produto.emPromocao ? 'Sim' : 'Não'}
                    </span>
                </td>
                <td>
                    <span class="status-badge" style="padding: 4px 8px; border-radius: 12px; font-size: 12px; background: ${produto.ativo ? '#d1e7dd' : '#f8d7da'}; color: ${produto.ativo ? '#0f5132' : '#842029'};">
                        ${produto.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="prepararEdicao('${produto._id}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deletarProduto('${produto._id}')">Excluir</button>
                </td>
            </tr>
        `;
        corpo.insertAdjacentHTML('beforeend', linha);
    });
}

// Salva ou atualiza um produto manualmente
async function salvarProduto(event) {
    event.preventDefault();

    const id = document.getElementById('produtoId').value;
    
    const dadosFormulario = {
        nomeProduto: document.getElementById('nomeProduto').value,
        unidade: document.getElementById('unidade').value,
        valorProduto: parseFloat(document.getElementById('valorProduto').value),
        ativo: document.getElementById('ativoManual').value === 'true',
        emPromocao: document.getElementById('emPromocaoManual').value === 'true',
        valoremPromocao: parseFloat(document.getElementById('valoremPromocao').value) || parseFloat(document.getElementById('valorProduto').value)
    };

    try {
        let resposta;
        if (id) {
            resposta = await fetch(`${render}/api/produtos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            });
        } else {
            dadosFormulario.produto_id = Math.floor(Math.random() * 1000000);
            resposta = await fetch(`${render}/api/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            });
        }

        if (resposta.ok) {
            alert('Produto salvo com sucesso!');
            fecharFormulario();
            carregarProdutos(); 
        } else {
            const erro = await resposta.json();
            alert(`Erro: ${erro.erro || erro.error}`);
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

// Prepara o formulário para edição manual
function prepararEdicao(id) {
    const produto = listaDeProdutos.find(p => p._id === id);
    if (!produto) return;

    document.getElementById('formManual').classList.remove('hidden');
    document.getElementById('produtoId').value = produto._id;
    document.getElementById('nomeProduto').value = produto.nomeProduto;
    document.getElementById('unidade').value = produto.unidade;
    document.getElementById('valorProduto').value = produto.valorProduto;
    document.getElementById('ativoManual').value = produto.ativo ? 'true' : 'false';
    document.getElementById('emPromocaoManual').value = produto.emPromocao ? 'true' : 'false';
    document.getElementById('valoremPromocao').value = produto.valoremPromocao;
    
    document.getElementById('tituloFormulario').innerText = 'Editando Produto da Vitrine';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // NOTA: Limpamos o código da foto que dava erro aqui!
}

// Deleta um produto da vitrine
async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja apagar este produto?')) return;

    try {
        const resposta = await fetch(`${render}/api/produtos/${id}`, { method: 'DELETE' });
        if (resposta.ok) carregarProdutos();
    } catch (erro) {
        alert('Erro ao tentar excluir o produto.');
    }
}


// ==========================================
// 2. FLUXO DE IMPORTAÇÃO DE PLANILHA CSV
// ==========================================

async function preVisualizarCSV() {
    const inputArquivo = document.getElementById('arquivoCsv');
    if (!inputArquivo.files[0]) {
        alert("Por favor, selecione um arquivo CSV primeiro.");
        return;
    }

    const formData = new FormData();
    formData.append('arquivoPlanilha', inputArquivo.files[0]);

    try {
        const resposta = await fetch(`${render}/api/produtos/preview-csv`, {
            method: 'POST',
            body: formData
        });

        if (resposta.ok) {
            const dadosBrutos = await resposta.json();
            
            dadosPlanilhaMemoria = dadosBrutos.map(p => {
                p.emPromocao = false;
                p.valoremPromocao = p.valorProduto; 
                return p;
            });

            renderizarTabelaPreview();
            document.getElementById('areaPreview').classList.remove('hidden');
        } else {
            alert("Erro ao processar a planilha no servidor.");
        }
    } catch (erro) {
        alert("Falha de comunicação com o servidor.");
    }
}

function renderizarTabelaPreview() {
    const corpoPreview = document.getElementById('corpoPreview');
    corpoPreview.innerHTML = '';
    
    dadosPlanilhaMemoria.forEach((p, index) => {
        corpoPreview.insertAdjacentHTML('beforeend', `
            <tr>
                <td><span style="background:#e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; color:#333;">${p.produto_id}</span></td>
                <td>
                    <input type="text" value="${p.nomeProduto}" 
                           onchange="atualizarItemPreview(${index}, 'nomeProduto', this.value)"
                           class="input-tabela">
                </td>
                <td>
                    <input type="text" value="${p.unidade}" 
                           onchange="atualizarItemPreview(${index}, 'unidade', this.value)"
                           class="input-tabela input-curto">
                </td>
                <td>
                    <input type="number" step="0.01" value="${p.valorProduto}" 
                           onchange="atualizarItemPreview(${index}, 'valorProduto', this.value)"
                           class="input-tabela input-curto">
                </td>
                <td>
                    <select onchange="atualizarItemPreview(${index}, 'ativo', this.value)" class="input-tabela">
                        <option value="true" ${p.ativo ? 'selected' : ''}>Sim</option>
                        <option value="false" ${!p.ativo ? 'selected' : ''}>Não</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="removerItemPreview(${index})">X</button>
                </td>
            </tr>
        `);
    });
}

function atualizarItemPreview(index, campo, valor) {
    if (campo === 'valorProduto') {
        dadosPlanilhaMemoria[index][campo] = parseFloat(valor) || 0;
        dadosPlanilhaMemoria[index]['valoremPromocao'] = parseFloat(valor) || 0; 
    } else if (campo === 'ativo') {
        dadosPlanilhaMemoria[index][campo] = (valor === 'true');
    } else {
        dadosPlanilhaMemoria[index][campo] = valor;
    }
}

function removerItemPreview(index) {
    if (confirm("Remover este item da importação? Ele não será enviado para a vitrine.")) {
        dadosPlanilhaMemoria.splice(index, 1);
        renderizarTabelaPreview();
    }
}

async function confirmarImportacao() {
    if (dadosPlanilhaMemoria.length === 0) return;

    try {
        const resposta = await fetch(`${render}/api/produtos/importar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPlanilhaMemoria)
        });

        if (resposta.ok) {
            const resultado = await resposta.json();
            alert(`Sincronização Concluída! ${resultado.inseridos} novos produtos e ${resultado.atualizados} atualizados.`);
            
            document.getElementById('areaPreview').classList.add('hidden');
            document.getElementById('arquivoCsv').value = '';
            dadosPlanilhaMemoria = [];
            
            mudarAba('vitrine');
            carregarProdutos();
        } else {
            const erroBackend = await resposta.json();
            alert(`O Servidor recusou a importação. Motivo: ${erroBackend.error || 'Erro desconhecido'}`);
        }
    } catch (erro) {
        alert("Erro grave de conexão ao tentar enviar os dados.");
    }
}

// ==========================================
// 3. CONTROLE DE INTERFACE (ABAS E FORMS)
// ==========================================

document.addEventListener('DOMContentLoaded', carregarProdutos);

function mudarAba(abaId) {
    document.querySelectorAll('.aba-conteudo').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('ativo'));
    
    document.getElementById(`aba-${abaId}`).classList.remove('hidden');
    event.currentTarget.classList.add('ativo');
}

function prepararNovoProduto() {
    document.getElementById('formManual').classList.remove('hidden');
    document.getElementById('formProduto').reset();
    document.getElementById('produtoId').value = '';
    document.getElementById('ativoManual').value = 'true';
    document.getElementById('tituloFormulario').innerText = 'Cadastrar Novo Produto';
    // NOTA: Limpamos o código da foto que dava erro aqui também!
}

function fecharFormulario() {
    document.getElementById('formManual').classList.add('hidden');
}

// ==========================================
// 4. MINI CRUD DE IMAGEM (MODAL NA TABELA)
// ==========================================

function abrirModalImagem(idProduto) {
    const produto = listaDeProdutos.find(p => p._id === idProduto);
    if (!produto) return;

    document.getElementById('modalProdutoId').value = produto._id;
    document.getElementById('inputUrlImagem').value = produto.img || '';
    
    atualizarPreviewModal();
    document.getElementById('modalImagem').classList.remove('hidden');
}

function fecharModalImagem() {
    document.getElementById('modalImagem').classList.add('hidden');
}

function atualizarPreviewModal() {
    const url = document.getElementById('inputUrlImagem').value;
    const imgEl = document.getElementById('modalPreviewImg');
    const textoEl = document.getElementById('modalPreviewTexto');
    
    if (url) {
        imgEl.src = url;
        imgEl.style.display = 'block';
        textoEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        textoEl.style.display = 'block';
    }
}

async function confirmarImagem() {
    const id = document.getElementById('modalProdutoId').value;
    const novaUrl = document.getElementById('inputUrlImagem').value;
    
    // Acha o produto na memória
    const produtoIndex = listaDeProdutos.findIndex(p => p._id === id);
    if (produtoIndex === -1) return;

    const produtoOriginal = listaDeProdutos[produtoIndex];

    // O SEGREDO ESTÁ AQUI: Removemos o _id do pacote para o MongoDB não bloquear a edição!
    const { _id, ...dadosParaSalvar } = produtoOriginal;
    dadosParaSalvar.img = novaUrl;
    
    try {
        const resposta = await fetch(`${render}/api/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosParaSalvar)
        });

        if (resposta.ok) {
            // Atualiza a memória e redesenha (Otimizado, não puxa tudo do banco de novo)
            listaDeProdutos[produtoIndex].img = novaUrl;
            fecharModalImagem();
            renderizarTabela(); 
        } else {
            alert('Erro ao salvar a imagem no banco de dados.');
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

function removerImagem() {
    document.getElementById('inputUrlImagem').value = '';
    confirmarImagem(); 
}
