const render = "https://sos-alimentos-webpage-servidor.onrender.com";

let listaDeProdutos = [];
let listaDeDepartamentos = [];   // sempre na ordem definida pelo admin
let selecionados = new Set();    // _id dos produtos marcados para mover em lote
let dadosPlanilhaMemoria = [];

// Evita que nomes com aspas ou < > quebrem o HTML da tela
function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// minúsculas e sem acento: "feijao" encontra "Feijão"
function normalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function compararNomes(a, b) {
    return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

// ==========================================
// 0. SISTEMA DE LOGIN SPA
// ==========================================
async function fazerLogin(event) {
    event.preventDefault();
    const usuario = document.getElementById('loginUsuario').value;
    const senha = document.getElementById('loginSenha').value;
    const erroDiv = document.getElementById('loginErro');

    erroDiv.classList.add('hidden'); // Esconde erro antigo

    try {
        const resposta = await fetch(`${render}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha }),
            credentials: 'include' // ISSO AQUI É VITAL! Avisa pra salvar o Cookie.
        });

        if (resposta.ok) {
            // A MÁGICA: Esconde o login, mostra o painel e carrega os produtos!
            document.getElementById('tela-login').classList.add('hidden');
            document.getElementById('tela-painel').classList.remove('hidden');
            carregarProdutos();
        } else {
            erroDiv.classList.remove('hidden'); // Mostra a faixa vermelha de erro
        }
    } catch (erro) {
        alert("Falha ao comunicar com o servidor.");
    }
}

// ==========================================
// 1. GERENCIAMENTO DE PRODUTOS (VITRINE)
// ==========================================

async function carregarProdutos() {
    try {
        const [respProdutos, respDeptos] = await Promise.all([
            fetch(`${render}/api/produtos`),
            fetch(`${render}/api/departamentos`)
        ]);
        listaDeProdutos = await respProdutos.json();
        listaDeDepartamentos = respDeptos.ok ? await respDeptos.json() : [];
        selecionados.clear();
        atualizarSelectsDeDepartamento();
        atualizarOpcoesDeUnidade();
        renderizarTabela();
        renderizarDepartamentos();
    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        alert('Erro ao carregar a lista de produtos do servidor.');
    }
}

function nomeDoDepartamento(id) {
    const depto = listaDeDepartamentos.find(d => d._id === id);
    return depto ? depto.nome : '';
}

// Preenche os 3 selects que listam departamentos (filtro, formulário e mover em lote)
function atualizarSelectsDeDepartamento() {
    const opcoes = listaDeDepartamentos.map(d => `<option value="${d._id}">${esc(d.nome)}</option>`).join('');

    const filtro = document.getElementById('filtroDepartamento');
    const valorFiltro = filtro.value;
    filtro.innerHTML = `<option value="">Todos os departamentos</option>
                        <option value="__sem">Sem departamento</option>${opcoes}`;
    filtro.value = [...filtro.options].some(o => o.value === valorFiltro) ? valorFiltro : '';

    const form = document.getElementById('departamentoProduto');
    const valorForm = form.value;
    form.innerHTML = `<option value="">Sem departamento</option>${opcoes}`;
    form.value = [...form.options].some(o => o.value === valorForm) ? valorForm : '';

    const lote = document.getElementById('destinoLote');
    const valorLote = lote.value;
    lote.innerHTML = `<option value="">Sem departamento</option>${opcoes}`;
    lote.value = [...lote.options].some(o => o.value === valorLote) ? valorLote : '';
}

// Monta a lista de unidades a partir dos produtos que existem de verdade (UN, KG, CX...)
function atualizarOpcoesDeUnidade() {
    const select = document.getElementById('filtroUnidade');
    const valorAtual = select.value;
    const unidades = [...new Set(listaDeProdutos.map(p => String(p.unidade || '').trim().toUpperCase()).filter(Boolean))]
        .sort(compararNomes);

    select.innerHTML = '<option value="">Todas as unidades</option>' +
        unidades.map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join('');
    select.value = unidades.includes(valorAtual) ? valorAtual : '';
}

// Aplica nome + unidade + departamento e devolve em ordem alfabética
function produtosFiltrados() {
    const termo = normalizar(document.getElementById('filtroNome').value);
    const unidade = document.getElementById('filtroUnidade').value;
    const depto = document.getElementById('filtroDepartamento').value;

    return listaDeProdutos
        .filter(p => {
            if (termo && !normalizar(p.nomeProduto).includes(termo)) return false;
            if (unidade && String(p.unidade || '').trim().toUpperCase() !== unidade) return false;
            if (depto === '__sem' && p.departamentoId) return false;
            if (depto && depto !== '__sem' && p.departamentoId !== depto) return false;
            return true;
        })
        .sort((a, b) => compararNomes(a.nomeProduto, b.nomeProduto));
}

function aplicarFiltros() {
    selecionados.clear(); // evita mover sem querer itens que sumiram da tela
    renderizarTabela();
}

function limparFiltros() {
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroUnidade').value = '';
    document.getElementById('filtroDepartamento').value = '';
    aplicarFiltros();
}

// Desenha a tabela principal da Vitrine
function renderizarTabela() {
    const corpo = document.getElementById('corpoTabela');
    const lista = produtosFiltrados();
    corpo.innerHTML = '';

    document.getElementById('contadorProdutos').textContent =
        `Mostrando ${lista.length} de ${listaDeProdutos.length} produtos (ordem alfabética)`;

    if (lista.length === 0) {
        corpo.innerHTML = `<tr><td colspan="9" class="td-vazio" style="text-align:center; color:#6c757d; padding:30px;">Nenhum produto encontrado com esses filtros.</td></tr>`;
    }

    const opcoesDepto = listaDeDepartamentos.map(d => `<option value="${d._id}">${esc(d.nome)}</option>`).join('');

    lista.forEach(produto => {

        // Define o quadradinho da foto com Lazy Loading para otimização
        const urlFoto = produto.img ? produto.img : '';
        const imgHtml = urlFoto
            ? `<img src="${esc(urlFoto)}" loading="lazy" alt="Foto">`
            : `<span>📷</span>`;

        const linha = `
            <tr>
                <td class="col-sel">
                    <input type="checkbox" ${selecionados.has(produto._id) ? 'checked' : ''}
                           onchange="alternarSelecao('${produto._id}', this.checked)">
                </td>
                <td>
                    <div class="thumb-tabela" onclick="abrirModalImagem('${produto._id}')" title="Alterar Foto">
                        ${imgHtml}
                    </div>
                </td>
                <td>${esc(produto.nomeProduto)}</td>
                <td>${esc(produto.unidade)}</td>
                <td>R$ ${produto.valorProduto.toFixed(2).replace('.', ',')}</td>
                <td>
                    <select class="input-tabela" onchange="alterarDepartamentoProduto('${produto._id}', this.value)">
                        <option value="">Sem departamento</option>
                        ${opcoesDepto}
                    </select>
                </td>
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

        // Seleciona o departamento atual do produto na linha que acabou de entrar
        const select = corpo.lastElementChild.querySelector('select');
        select.value = produto.departamentoId || '';
    });

    atualizarBarraSelecao(lista);
}

// ---------- Seleção em lote ----------
function alternarSelecao(id, marcado) {
    if (marcado) selecionados.add(id); else selecionados.delete(id);
    atualizarBarraSelecao();
}

function alternarTodos(marcado) {
    selecionados.clear();
    if (marcado) produtosFiltrados().forEach(p => selecionados.add(p._id));
    renderizarTabela();
}

function limparSelecao() {
    selecionados.clear();
    renderizarTabela();
}

function atualizarBarraSelecao(listaVisivel) {
    const lista = listaVisivel || produtosFiltrados();
    const qtd = selecionados.size;
    document.getElementById('barraSelecao').classList.toggle('hidden', qtd === 0);
    document.getElementById('textoSelecionados').textContent = `${qtd} ${qtd === 1 ? 'selecionado' : 'selecionados'}`;

    const marcarTodos = document.getElementById('marcarTodos');
    marcarTodos.checked = lista.length > 0 && lista.every(p => selecionados.has(p._id));
    marcarTodos.indeterminate = qtd > 0 && !marcarTodos.checked;
}

async function moverSelecionados() {
    if (selecionados.size === 0) return;
    const departamentoId = document.getElementById('destinoLote').value || null;
    const nomeDestino = departamentoId ? nomeDoDepartamento(departamentoId) : 'Sem departamento';

    if (!confirm(`Mover ${selecionados.size} produto(s) para "${nomeDestino}"?`)) return;

    try {
        const resposta = await fetch(`${render}/api/produtos/departamento-lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids: [...selecionados], departamentoId })
        });

        if (resposta.ok) {
            listaDeProdutos.forEach(p => {
                if (selecionados.has(p._id)) p.departamentoId = departamentoId;
            });
            selecionados.clear();
            renderizarTabela();
            renderizarDepartamentos();
        } else {
            const erro = await resposta.json();
            alert(`Erro: ${erro.erro || erro.error}`);
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

// Troca o departamento de UM produto direto pela tabela
async function alterarDepartamentoProduto(id, departamentoId) {
    const produto = listaDeProdutos.find(p => p._id === id);
    if (!produto) return;
    const anterior = produto.departamentoId || null;

    try {
        const resposta = await fetch(`${render}/api/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ departamentoId: departamentoId || null })
        });
        if (!resposta.ok) throw new Error('Falha');
        produto.departamentoId = departamentoId || null;
        renderizarDepartamentos();
    } catch (erro) {
        produto.departamentoId = anterior;
        alert('Não foi possível alterar o departamento. Verifique seu login.');
        renderizarTabela();
    }
}

// ==========================================
// 1.1 DEPARTAMENTOS (CRIAR, RENOMEAR, ORDENAR, EXCLUIR)
// ==========================================

function renderizarDepartamentos() {
    const lista = document.getElementById('listaDepartamentos');
    if (!lista) return;

    lista.innerHTML = '';
    if (listaDeDepartamentos.length === 0) {
        lista.innerHTML = '<li class="depto-vazio">Nenhum departamento criado ainda.</li>';
    }

    listaDeDepartamentos.forEach((depto, indice) => {
        const qtd = listaDeProdutos.filter(p => p.departamentoId === depto._id).length;
        lista.insertAdjacentHTML('beforeend', `
            <li class="depto-item">
                <span class="depto-posicao">${indice + 1}º</span>
                <div class="depto-info">
                    <strong>${esc(depto.nome)}</strong>
                    <small>${qtd} ${qtd === 1 ? 'item' : 'itens'}</small>
                </div>
                <div class="depto-acoes">
                    <button class="btn btn-sm btn-outline" title="Subir" ${indice === 0 ? 'disabled' : ''}
                            onclick="moverDepartamento(${indice}, -1)">▲</button>
                    <button class="btn btn-sm btn-outline" title="Descer" ${indice === listaDeDepartamentos.length - 1 ? 'disabled' : ''}
                            onclick="moverDepartamento(${indice}, 1)">▼</button>
                    <button class="btn btn-sm btn-outline" onclick="renomearDepartamento('${depto._id}')">Renomear</button>
                    <button class="btn btn-sm btn-danger" onclick="excluirDepartamento('${depto._id}')">Excluir</button>
                </div>
            </li>
        `);
    });

    const semDepto = listaDeProdutos.filter(p => !p.departamentoId).length;
    document.getElementById('avisoSemDepartamento').textContent = semDepto
        ? `${semDepto} ${semDepto === 1 ? 'item está' : 'itens estão'} sem departamento e ${semDepto === 1 ? 'aparece' : 'aparecem'} no fim da tela inicial, em "Outros produtos".`
        : '';
}

async function criarDepartamento(event) {
    event.preventDefault();
    const input = document.getElementById('novoDepartamentoNome');
    const nome = input.value.trim();
    if (!nome) return;

    try {
        const resposta = await fetch(`${render}/api/departamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nome })
        });
        const dados = await resposta.json();

        if (resposta.ok) {
            listaDeDepartamentos.push(dados);
            input.value = '';
            atualizarSelectsDeDepartamento();
            renderizarDepartamentos();
            renderizarTabela();
        } else {
            alert(`Erro: ${dados.erro || dados.error}`);
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

async function renomearDepartamento(id) {
    const depto = listaDeDepartamentos.find(d => d._id === id);
    if (!depto) return;
    const novoNome = prompt('Novo nome do departamento:', depto.nome);
    if (novoNome === null || !novoNome.trim() || novoNome.trim() === depto.nome) return;

    try {
        const resposta = await fetch(`${render}/api/departamentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nome: novoNome.trim() })
        });
        const dados = await resposta.json();

        if (resposta.ok) {
            depto.nome = dados.nome;
            atualizarSelectsDeDepartamento();
            renderizarDepartamentos();
            renderizarTabela();
        } else {
            alert(`Erro: ${dados.erro || dados.error}`);
        }
    } catch (erro) {
        alert('Falha na comunicação com o servidor.');
    }
}

async function excluirDepartamento(id) {
    const depto = listaDeDepartamentos.find(d => d._id === id);
    if (!depto) return;
    const qtd = listaDeProdutos.filter(p => p.departamentoId === id).length;

    const aviso = qtd
        ? `Excluir o departamento "${depto.nome}"? Os ${qtd} itens dele NÃO serão apagados, só ficarão sem departamento.`
        : `Excluir o departamento "${depto.nome}"?`;
    if (!confirm(aviso)) return;

    try {
        const resposta = await fetch(`${render}/api/departamentos/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!resposta.ok) throw new Error('Falha');

        listaDeProdutos.forEach(p => { if (p.departamentoId === id) p.departamentoId = null; });
        listaDeDepartamentos = listaDeDepartamentos.filter(d => d._id !== id);
        atualizarSelectsDeDepartamento();
        renderizarDepartamentos();
        renderizarTabela();
    } catch (erro) {
        alert('Não foi possível excluir o departamento. Verifique seu login.');
    }
}

// Sobe/desce um departamento e salva a nova ordem no servidor
async function moverDepartamento(indice, direcao) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= listaDeDepartamentos.length) return;

    const copia = [...listaDeDepartamentos];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    listaDeDepartamentos = copia;
    renderizarDepartamentos();
    atualizarSelectsDeDepartamento();

    try {
        const resposta = await fetch(`${render}/api/departamentos/ordem`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids: listaDeDepartamentos.map(d => d._id) })
        });
        if (!resposta.ok) throw new Error('Falha');
    } catch (erro) {
        alert('Não foi possível salvar a nova ordem. Recarregando...');
        carregarProdutos();
    }
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
        valoremPromocao: parseFloat(document.getElementById('valoremPromocao').value) || parseFloat(document.getElementById('valorProduto').value),
        departamentoId: document.getElementById('departamentoProduto').value || null
    };

    try {
        let resposta;
        if (id) {
            resposta = await fetch(`${render}/api/produtos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(dadosFormulario)
            });
        } else {
            dadosFormulario.produto_id = Math.floor(Math.random() * 1000000);
            resposta = await fetch(`${render}/api/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
    document.getElementById('departamentoProduto').value = produto.departamentoId || '';

    document.getElementById('tituloFormulario').innerText = 'Editando Produto da Vitrine';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // NOTA: Limpamos o código da foto que dava erro aqui!
}

// Deleta um produto da vitrine
async function deletarProduto(id) {
    if (!confirm('Tem certeza que deseja apagar este produto?')) return;

    try {
        const resposta = await fetch(`${render}/api/produtos/${id}`,
            {
                method: 'DELETE',
                credentials: 'include'
            });
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
            credentials: 'include',
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
                    <select onchange="atualizarItemPreview(${index}, 'emPromocao', this.value)" class="input-tabela">
                        <option value="false" ${!p.emPromocao ? 'selected' : ''}>Não</option>
                        <option value="true" ${p.emPromocao ? 'selected' : ''}>Sim</option>
                    </select>
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
    } else if (campo === 'ativo' || campo === 'emPromocao') {
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
            credentials: 'include',
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

// document.addEventListener('DOMContentLoaded', carregarProdutos);

function mudarAba(abaId) {
    document.querySelectorAll('.aba-conteudo').forEach(aba => aba.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('ativo'));

    document.getElementById(`aba-${abaId}`).classList.remove('hidden');
    const botao = document.querySelector(`.tab-btn[data-aba="${abaId}"]`);
    if (botao) botao.classList.add('ativo');

    if (abaId === 'departamentos') renderizarDepartamentos();
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
// 4. MINI CRUD DE IMAGEM (COM UPLOAD E RECORTE)
// ==========================================

let cropper = null; // Cérebro do recorte

function abrirModalImagem(idProduto) {
    const produto = listaDeProdutos.find(p => p._id === idProduto);
    if (!produto) return;

    document.getElementById('modalProdutoId').value = produto._id;
    document.getElementById('inputUrlImagem').value = produto.img || '';

    atualizarPreviewModal();
    document.getElementById('modalImagem').classList.remove('hidden');
}

// Fechar e limpar todo o modal
function fecharModalImagem() {
    document.getElementById('modalImagem').classList.add('hidden');

    // Restaura o visual padrão da coluna direita
    document.getElementById('areaCorte').style.display = 'none';
    document.getElementById('textoAreaCorte').style.display = 'flex';
    document.getElementById('inputUploadImagem').value = '';

    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Restaura os botões originais caso tenham mudado
    document.getElementById('botoesModalImagem').innerHTML = `
        <button class="btn btn-danger" type="button" onclick="removerImagem()">🗑️ Remover Imagem</button>
        <div>
            <button class="btn btn-outline" type="button" onclick="fecharModalImagem()">Cancelar</button>
            <button class="btn btn-success" type="button" onclick="confirmarImagem()">Salvar</button>
        </div>`;
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

// Inicia a ferramenta de recorte quando o usuário escolhe um arquivo
function iniciarCorte(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const urlTemporaria = URL.createObjectURL(arquivo);
    const imgElement = document.getElementById('imagemParaCortar');
    imgElement.src = urlTemporaria;

    // Mostra o palco de corte e esconde a mensagem placeholder do lado direito
    document.getElementById('areaCorte').style.display = 'block';
    document.getElementById('textoAreaCorte').style.display = 'none';

    // Limpa o campo de URL da esquerda para evitar que o usuário tente salvar as duas coisas ao mesmo tempo
    document.getElementById('inputUrlImagem').value = '';
    atualizarPreviewModal();

    if (cropper) cropper.destroy();

    cropper = new Cropper(imgElement, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.9,
    });
}

// Salva a imagem (seja via URL ou Upload cortado)
async function confirmarImagem() {
    const id = document.getElementById('modalProdutoId').value;
    const novaUrl = document.getElementById('inputUrlImagem').value;

    const produtoIndex = listaDeProdutos.findIndex(p => p._id === id);
    if (produtoIndex === -1) return;
    const produtoOriginal = listaDeProdutos[produtoIndex];

    // ===============================================
    // CENÁRIO 1: UPLOAD DE ARQUIVO CORTADO
    // ===============================================
    if (cropper) {
        cropper.getCroppedCanvas({ width: 600, height: 600 }).toBlob(async (blobImagemCortada) => {
            const formData = new FormData();
            formData.append('imagemFile', blobImagemCortada, 'produto.jpg');

            try {
                document.getElementById('botoesModalImagem').innerHTML = 'Enviando foto, aguarde... ⏳';

                const resposta = await fetch(`${render}/api/produtos/${id}/imagem`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });

                if (resposta.ok) {
                    const produtoAtualizado = await resposta.json();
                    listaDeProdutos[produtoIndex].img = produtoAtualizado.img;
                    fecharModalImagem();
                    renderizarTabela();
                } else {
                    alert("Erro ao salvar no Cloudinary. Verifique seu login.");
                    fecharModalImagem();
                }
            } catch (erro) {
                alert("Falha de conexão com o servidor no Upload.");
                fecharModalImagem();
            }
        }, 'image/jpeg', 0.85); // Corta, converte pra jpg e comprime 15%
        return;
    }

    // ===============================================
    // CENÁRIO 2: SALVAR VIA LINK DA INTERNET (URL)
    // ===============================================
    const { _id, __v, ...dadosParaSalvar } = produtoOriginal;
    dadosParaSalvar.img = novaUrl;

    try {
        const resposta = await fetch(`${render}/api/produtos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(dadosParaSalvar)
        });

        if (resposta.ok) {
            listaDeProdutos[produtoIndex].img = novaUrl;
            fecharModalImagem();
            renderizarTabela();
        } else {
            alert("Erro ao salvar a URL da imagem! Verifique seu login.");
        }
    } catch (erro) {
        console.log(`Erro: ${erro.message}`);
    }
}

function removerImagem() {
    document.getElementById('inputUrlImagem').value = '';
    confirmarImagem();
}
