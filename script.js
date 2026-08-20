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

    // Marca o link correspondente como ativo no menu
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.toggle('ativo', link.getAttribute('href') === hash);
    });
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
const dots = document.querySelectorAll('.dot');
let carrosselAutoplay;

function mostrarSlide(index) {
    // Esconde todos os slides
    slides.forEach(slide => slide.classList.remove('ativo'));
    
    // Se passar do último, volta pro primeiro
    if (index >= slides.length) { slideIndex = 0; }
    // Se voltar antes do primeiro, vai pro último
    if (index < 0) { slideIndex = slides.length - 1; }
    
    // Mostra o slide correto
    slides[slideIndex].classList.add('ativo');
    dots.forEach(dot => dot.classList.remove('ativo'));
    if (dots[slideIndex]) dots[slideIndex].classList.add('ativo');
}

function mudarSlide(step) {
    slideIndex += step;
    mostrarSlide(slideIndex);
}

function irParaSlide(index) {
    slideIndex = index;
    mostrarSlide(slideIndex);
}

function iniciarAutoplay() {
    carrosselAutoplay = setInterval(() => mudarSlide(1), 5000);
}

iniciarAutoplay();

// Pausa a troca automática enquanto o usuário está com o mouse em cima
const carrossel = document.getElementById('banner-carrossel');
if (carrossel) {
    carrossel.addEventListener('mouseenter', () => clearInterval(carrosselAutoplay));
    carrossel.addEventListener('mouseleave', iniciarAutoplay);
}


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

async function esperarServidorAcordar(tentativas = 5, intervaloMs = 4000) {
    for (let i = 0; i < tentativas; i++) {
        try {
            const resposta = await fetch(`${API_URL}/health`);
            if (resposta.ok) return true;
        } catch (erro) {
            // servidor ainda dormindo, tenta de novo depois do intervalo
        }
        await new Promise(resolve => setTimeout(resolve, intervaloMs));
    }
    return false;
}

function mostrarEsqueletoCarregando(container, quantidade) {
    if (!container) return;
    container.innerHTML = Array.from({ length: quantidade })
        .map(() => '<div class="skeleton-card"></div>')
        .join('');
}

function mostrarEstadoErro() {
    const mensagemErro = `
        <p class="msg-estado">
            Não foi possível carregar os produtos.<br>
            <button class="btn-tentar-novamente" onclick="carregarProdutos()">Tentar novamente</button>
        </p>
    `;
    const gridProdutos = document.getElementById('grid-produtos');
    const gridPromocoes = document.getElementById('grid-promocoes');
    if (gridProdutos) gridProdutos.innerHTML = mensagemErro;
    if (gridPromocoes) gridPromocoes.innerHTML = mensagemErro;
}

async function carregarProdutos() {
    const gridProdutos = document.getElementById('grid-produtos');
    const gridPromocoes = document.getElementById('grid-promocoes');

    mostrarEsqueletoCarregando(gridProdutos, 4);
    mostrarEsqueletoCarregando(gridPromocoes, 3);

    const tentarBuscar = async () => {
        const resposta = await fetch(`${API_URL}/api/produtos`);
        if (!resposta.ok) throw new Error('Falha ao buscar produtos.');
        return resposta.json();
    };

    try {
        let dadosBrutos = [];
        try {
            // Primeira tentativa direta 
            dadosBrutos = await tentarBuscar();
        } catch (primeiroErro) {
            // Se falhar, tenta acordar o servidor e busca de novo
            await esperarServidorAcordar();
            dadosBrutos = await tentarBuscar();
        }

        // ==========================================
        // O SEGREDO ESTÁ AQUI: FILTRO DE ESTOQUE
        // ==========================================
        // Ele varre a lista que chegou do banco e salva APENAS os ativos (true)
        todosProdutos = dadosBrutos.filter(produto => produto.ativo === true);

        // Agora desenha os produtos ativos na tela
        renderizarProdutos(todosProdutos, gridProdutos, false);

        // Filtra os ativos para ver quais estão em promoção
        const emPromocao = todosProdutos.filter(produto => produto.emPromocao);
        renderizarProdutos(emPromocao, gridPromocoes, true);

    } catch (erro) {
        console.error('Erro ao carregar produtos:', erro);
        mostrarEstadoErro();
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

    const anoAtual = document.getElementById('ano-atual');
    if (anoAtual) anoAtual.textContent = new Date().getFullYear();
});
