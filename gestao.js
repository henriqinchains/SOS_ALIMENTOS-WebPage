const API_URL = 'http://localhost:3000/api/registros';
let listaDeProdutos = [];
let dadosPlanilhaMemoria = []; // Guarda o JSON do CSV temporariamente

// =========== 1. GERENCIAMENTO DE PRODUTOS (CRUD) ===========

async function carregarProdutos() {
    try {
        const resposta = await fetch(API_URL);
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
                    <span class="status-badge ${produto.ativo ? 'status-on' : 'status-off'}">
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
    event.preventDefault(); // Impede a página de recarregar

    const id = document.getElementById('produtoId').value;
    
    // Monta o objeto com os dados do formulário
    const dadosFormulario = {
        nomeProduto: document.getElementById('nomeProduto').value,
        unidade: document.getElementById('unidade').value,
        valorProduto: parseFloat(document.getElementById('valorProduto').value),
        ativo: document.getElementById('ativo').checked
    };

    try {
        let resposta;
        if (id) {
            // Se tem ID, é Edição (PUT)
            resposta = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            });
        } else {
            // Se não tem ID, é Criação (POST manual)
            resposta = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosFormulario)
            });
        }

        if (resposta.ok) {
            alert('Produto salvo com sucesso!');
            limparFormulario();
            carregarProdutos(); // Recarrega a tabela
        } else {
            const erro = await resposta.json();
            alert(`Erro: ${erro.error}`);
        }
    } catch (erro) {
        console.error(erro);
        alert('Falha na comunicação com o servidor.');
    }
}

function prepararEdicao(id) {
    // Acha o produto na lista que já está carregada na memória
    const produto = listaDeProdutos.find(p => p._id === id);
    if (!produto) return;

    // Preenche o formulário
    document.getElementById('produtoId').value = produto._id;
    document.getElementById('nomeProduto').value = produto.nomeProduto;
    document.getElementById('unidade').value = produto.unidade;
    document.getElementById('valorProduto').value = produto.valorProduto;
    document.getElementById('ativo').checked = produto.ativo;

    document.getElementById('tituloFormulario').innerText = 'Editando Produto';
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a tela pra cima
}

async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja apagar este produto? Essa ação não pode ser desfeita.')) return;

    try {
        const resposta = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (resposta.ok) {
            carregarProdutos(); // Atualiza a tabela tirando o item
        }
    } catch (erro) {
        alert('Erro ao tentar excluir o produto.');
    }
}

function limparFormulario() {
    document.getElementById('formProduto').reset();
    document.getElementById('produtoId').value = '';
    document.getElementById('tituloFormulario').innerText = 'Cadastrar Novo Produto';
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
        // Envia para a nossa rota de Preview
        const resposta = await fetch(`${API_URL}/preview-csv`, {
            method: 'POST',
            body: formData
        });

        if (resposta.ok) {
            dadosPlanilhaMemoria = await resposta.json();
            
            // Preenche a tabela de visualização
            const corpoPreview = document.getElementById('corpoPreview');
            corpoPreview.innerHTML = '';
            
            dadosPlanilhaMemoria.forEach(p => {
                corpoPreview.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>${p.nomeProduto}</td>
                        <td>${p.unidade}</td>
                        <td>R$ ${p.valorProduto.toFixed(2)}</td>
                        <td>${p.ativo ? 'Sim' : 'Não'}</td>
                    </tr>
                `);
            });

            // Mostra o bloco de revisão na tela
            document.getElementById('areaPreview').classList.remove('hidden');
        } else {
            alert("Erro ao ler a planilha no servidor.");
        }
    } catch (erro) {
        alert("Falha na comunicação ao enviar planilha.");
    }
}

async function confirmarImportacao() {
    if (dadosPlanilhaMemoria.length === 0) return;

    try {
        // Envia o JSON finalizado para o Bulk Insert (salvamento em massa)
        const resposta = await fetch(`${API_URL}/importar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPlanilhaMemoria)
        });

        if (resposta.ok) {
            const resultado = await resposta.json();
            alert(`Sucesso! ${resultado.inseridos} criados, ${resultado.atualizados} atualizados.`);
            
            // Limpa a tela
            document.getElementById('areaPreview').classList.add('hidden');
            document.getElementById('arquivoCsv').value = '';
            dadosPlanilhaMemoria = [];
            
            // Recarrega a tabela principal com os dados novos do banco
            carregarProdutos();
        }
    } catch (erro) {
        alert("Erro ao confirmar a importação.");
    }
}

// Inicialização: carrega os produtos assim que a página abrir
document.addEventListener('DOMContentLoaded', carregarProdutos);