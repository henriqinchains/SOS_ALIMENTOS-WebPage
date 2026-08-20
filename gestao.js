const render = "https://sos-alimentos-webpage-servidor.onrender.com";
let listaDeProdutos = [];
let dadosPlanilhaMemoria = []; // Guarda o JSON do CSV temporariamente

// =========== 1. GERENCIAMENTO DE PRODUTOS (CRUD) ===========

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

function renderizarTabela() {
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = '';

    listaDeProdutos.forEach(produto => {
        const linha = `
            <tr>
                <td>${produto.nomeProduto}</td>
                <td>${produto.unidade}</td>
                <td>R$ ${produto.valorProduto.toFixed(2).replace('.', ',')}</td>
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

async function salvarProduto(event) {
    event.preventDefault();

    const id = document.getElementById('produtoId').value;
    
    // Monta o objeto (se for manual, assume como ativo por padrão)
    const dadosFormulario = {
        nomeProduto: document.getElementById('nomeProduto').value,
        unidade: document.getElementById('unidade').value,
        valorProduto: parseFloat(document.getElementById('valorProduto').value),
        ativo: true 
    };

    try {
        let resposta;
        if (id) {
            // Edição (PUT)
            resposta = await fetch(`${render}/api/produtos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            });
        } else {
            // Novo Produto (POST)
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
            carregarProdutos(); // Recarrega a tabela
        } else {
            const erro = await resposta.json();
            alert(`Erro: ${erro.erro || erro.error}`);
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

function prepararEdicao(id) {
    const produto = listaDeProdutos.find(p => p._id === id);
    if (!produto) return;

    // Abre o form e preenche
    document.getElementById('formManual').classList.remove('hidden');
    document.getElementById('produtoId').value = produto._id;
    document.getElementById('nomeProduto').value = produto.nomeProduto;
    document.getElementById('unidade').value = produto.unidade;
    document.getElementById('valorProduto').value = produto.valorProduto;
    document.getElementById('tituloFormulario').innerText = 'Editando Produto da Vitrine';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja apagar este produto?')) return;

    try {
        const resposta = await fetch(`${render}/api/produtos/${id}`, { method: 'DELETE' });
        if (resposta.ok) carregarProdutos();
    } catch (erro) {
        alert('Erro ao tentar excluir o produto.');
    }
}


// =========== 2. FLUXO DE IMPORTAÇÃO DE PLANILHA CSV ===========

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
            dadosPlanilhaMemoria = await resposta.json();
            renderizarTabelaPreview();
            document.getElementById('areaPreview').classList.remove('hidden');
        } else {
            alert("Erro ao processar a planilha no servidor.");
        }
    } catch (erro) {
        alert("Falha de comunicação com o servidor.");
    }
}

// A Mágica da Tabela Editável
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
                <td>${p.ativo ? 'Sim' : 'Não'}</td>
            </tr>
        `);
    });
}

function atualizarItemPreview(index, campo, valor) {
    if (campo === 'valorProduto') {
        dadosPlanilhaMemoria[index][campo] = parseFloat(valor) || 0;
        dadosPlanilhaMemoria[index]['valoremPromocao'] = parseFloat(valor) || 0; 
    } else {
        dadosPlanilhaMemoria[index][campo] = valor;
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
            
            // Limpa a tela de importação
            document.getElementById('areaPreview').classList.add('hidden');
            document.getElementById('arquivoCsv').value = '';
            dadosPlanilhaMemoria = [];
            
            // Volta para a aba vitrine automaticamente e recarrega os dados
            mudarAba('vitrine');
            carregarProdutos();
        }
    } catch (erro) {
        alert("Erro ao confirmar a sincronização.");
    }
}


// =========== 3. CONTROLE DE INTERFACE (ABAS E FORMS) ===========

// A CHAVE NA IGNIÇÃO: Busca os produtos assim que a página abre
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
    document.getElementById('tituloFormulario').innerText = 'Cadastrar Novo Produto';
}

function fecharFormulario() {
    document.getElementById('formManual').classList.add('hidden');
}
