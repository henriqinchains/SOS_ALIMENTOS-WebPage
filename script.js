// ==========================
// 1. ROTEAMENTO DO SPA
// ==========================
function router() {
    // Pega a hashtag da URL atual (ex: "#produtos"). Se não tiver, usa "#ofertas" como padrão.
    let hash = window.location.hash || '#ofertas';
    
    // Remove o "#" para pegar só o ID da seção (ex: "produtos")
    let pageId = hash.replace('#', '');
    
    // Esconde todas as páginas removendo a classe 'active'
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Tenta encontrar a seção correspondente e mostra ela
    const pageToShow = document.getElementById(pageId);
    if (pageToShow) {
        pageToShow.classList.add('active');
    }
}

// Escuta a mudança no link (quando o usuário clica no menu)
window.addEventListener('hashchange', router);

// Roda o router assim que a página carregar
window.addEventListener('load', router);


// ==========================
// 2. LÓGICA DO CARROSSEL
// ==========================
let slideIndex = 0;
const slides = document.querySelectorAll('.slide');

function mostrarSlide(index) {
    // Esconde todos os slides
    slides.forEach(slide => slide.classList.remove('ativo'));
    
    // Se passar do último, volta pro primeiro
    if (index >= slides.length) { slideIndex = 0; }
    // Se voltar antes do primeiro, vai pro último
    if (index < 0) { slideIndex = slides.length - 1; }
    
    // Mostra o slide correto
    slides[slideIndex].classList.add('ativo');
}

function mudarSlide(step) {
    slideIndex += step;
    mostrarSlide(slideIndex);
}

// Opcional: Fazer o carrossel passar sozinho a cada 5 segundos
setInterval(() => {
    mudarSlide(1);
}, 5000);


// ==========================
// 3. PRODUTOS (API + BUSCA)
// ==========================
const API_URL = 'https://sos-alimentos-webpage-servidor.onrender.com';

let todosProdutos = [];

// Formata número para moeda brasileira (R$)
function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Cria o elemento HTML de um card de produto
function criarCardProduto(produto) {
    const card = document.createElement('div');
    card.className = 'produto-card';

    const precoHtml = produto.emPromocao
        ? `<p class="preco-antigo">${formatarPreco(produto.valorProduto)}</p>
           <p class="preco preco-promo">${formatarPreco(produto.valoremPromocao)}</p>`
        : `<p class="preco">${formatarPreco(produto.valorProduto)}</p>`;

    card.innerHTML = `
        ${produto.emPromocao ? '<span class="selo-promocao">Promoção</span>' : ''}
        <div class="img-placeholder">
            ${produto.img ? `<img src="${produto.img}" alt="${produto.nomeProduto}">` : 'Foto'}
        </div>
        <h3>${produto.nomeProduto}</h3>
        <p class="unidade">${produto.unidade}</p>
        ${precoHtml}
    `;

    return card;
}

// Renderiza uma lista de produtos dentro de um container
function renderizarProdutos(lista, container, apenasPromocao) {
    if (!container) return;

    container.innerHTML = '';

    if (!lista || lista.length === 0) {
        const mensagem = apenasPromocao ? 'Nenhuma promoção encontrada.' : 'Nenhum produto encontrado.';
        container.innerHTML = `<p class="msg-estado">${mensagem}</p>`;
        return;
    }

    lista.forEach(produto => {
        container.appendChild(criarCardProduto(produto));
    });
}

// Busca os produtos na API e renderiza nas duas abas (Produtos e Promoções)
async function carregarProdutos() {
    const gridProdutos = document.getElementById('grid-produtos');
    const gridPromocoes = document.getElementById('grid-promocoes');

    try {
        const resposta = await fetch(`${API_URL}/api/produtos`);
        if (!resposta.ok) throw new Error('Falha ao buscar produtos.');

        todosProdutos = await resposta.json();

        renderizarProdutos(todosProdutos, gridProdutos, false);

        const emPromocao = todosProdutos.filter(produto => produto.emPromocao);
        renderizarProdutos(emPromocao, gridPromocoes, true);

    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        if (gridProdutos) gridProdutos.innerHTML = '<p class="msg-estado">Não foi possível carregar os produtos. Tente novamente mais tarde.</p>';
        if (gridPromocoes) gridPromocoes.innerHTML = '<p class="msg-estado">Não foi possível carregar as promoções. Tente novamente mais tarde.</p>';
    }
}

// Filtra os produtos já carregados pelo termo digitado
function filtrarProdutos(termo, apenasPromocao) {
    const base = apenasPromocao ? todosProdutos.filter(produto => produto.emPromocao) : todosProdutos;
    const termoBusca = termo.trim().toLowerCase();

    if (!termoBusca) return base;

    return base.filter(produto => produto.nomeProduto.toLowerCase().includes(termoBusca));
}

// Liga o input + botão de busca de uma seção ao grid de resultados correspondente
function configurarBusca(inputId, containerId, apenasPromocao) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);

    if (!input || !container) return;

    const executarBusca = () => {
        const resultado = filtrarProdutos(input.value, apenasPromocao);
        renderizarProdutos(resultado, container, apenasPromocao);
    };

    input.addEventListener('input', executarBusca);
    input.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') executarBusca();
    });

    const containerPesquisa = input.closest('.pesquisa-container');
    const botaoBuscar = containerPesquisa ? containerPesquisa.querySelector('.btn-pesquisar') : null;
    if (botaoBuscar) botaoBuscar.addEventListener('click', executarBusca);
}

// Carrega os produtos assim que a página abre e conecta as duas barras de pesquisa
window.addEventListener('load', () => {
    carregarProdutos().then(() => {
        configurarBusca('search-input-produtos', 'grid-produtos', false);
        configurarBusca('search-input-ofertas', 'grid-promocoes', true);
    });
});
