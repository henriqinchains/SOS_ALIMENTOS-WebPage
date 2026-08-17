//ACORDA
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// ============================================================
// CARROSSEL DE BANNERS
// (mantido como estava — não é prioridade no momento)
// ============================================================
let indiceAtual = 0;
let slides = []; // Vai começar vazio e ser preenchido dinamicamente
let intervaloTemporizador;

const bannersMock = [
    { img: "banner1.jpg", titulo: "Banner 1" },
    { img: "banner2.jpg", titulo: "Banner 2" },
    { img: "banner3.jpg", titulo: "Banner 3" }
];

function carregarBanners() {
    // const resposta = await fetch('http://localhost:3000/api/banners');
    // const banners = await resposta.json();

    renderizarBanners(bannersMock);
}

function renderizarBanners(listaBanners) {
    const containerSlides = document.querySelector('.slides');
    containerSlides.innerHTML = ''; // Limpa qualquer banner estático do HTML

    listaBanners.forEach((banner, index) => {
        // O primeiro banner (index 0) já ganha a classe 'ativo'
        const classeAtivo = index === 0 ? 'ativo' : '';

        const slideHTML = `
            <div class="slide ${classeAtivo}">
                <img src="${banner.img}" alt="${banner.titulo}">
            </div>
        `;
        containerSlides.insertAdjacentHTML('beforeend', slideHTML);
    });

    // Atualiza a lista de slides agora que eles existem no DOM
    slides = document.querySelectorAll('.slide');

    // Inicia o loop do carrossel
    iniciarIntervalo();
}

function mostrarSlide(indice) {
    slides.forEach((slide) => slide.classList.remove('ativo'));

    if (indice >= slides.length) indiceAtual = 0;
    if (indice < 0) indiceAtual = slides.length - 1;

    slides[indiceAtual].classList.add('ativo');
}

function mudarSlide(direcao) {
    indiceAtual += direcao;
    mostrarSlide(indiceAtual);
    resetarIntervalo();
}

function iniciarIntervalo() {
    intervaloTemporizador = setInterval(() => {
        mudarSlide(1);
    }, 4000);
}

function resetarIntervalo() {
    clearInterval(intervaloTemporizador);
    iniciarIntervalo();
}

// ============================================================
// PRODUTOS POR CATEGORIA
// ============================================================

// Ordem preferida de exibição das categorias. "Ofertas" sempre primeiro.
// Qualquer categoria vinda do backend que não estiver nesta lista
// aparece no final, em ordem alfabética.
const ORDEM_CATEGORIAS = ["Ofertas", "Frutas", "Verduras e Legumes", "Laticínios", "Mercearia"];

// 1. Dados falsos simulando a resposta do MongoDB, agora com "categoria"
const produtosMock = [
    {
        _id: "1",
        nomeProduto: "Bola Choc.tiquinho Ao Leite",
        unidade: "350g",
        categoria: "Ofertas",
        img: "https://images.unsplash.com/photo-1548907040-4baa42d10919?q=80&w=250&auto=format&fit=crop",
        valorProduto: 41.90,
        valoremPromocao: 19.90,
        descontoPorcentagem: 53
    },
    {
        _id: "2",
        nomeProduto: "Camarão Rosa Limpo Congelado",
        unidade: "400g",
        categoria: "Ofertas",
        img: "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?q=80&w=250&auto=format&fit=crop",
        valorProduto: 65.90,
        valoremPromocao: 49.90,
        descontoPorcentagem: 24
    },
    {
        _id: "3",
        nomeProduto: "Farinha de Trigo Especial para Massas",
        unidade: "1kg",
        categoria: "Mercearia",
        img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=250&auto=format&fit=crop",
        valorProduto: 8.50,
        valoremPromocao: 6.99,
        descontoPorcentagem: 17
    },
    {
        _id: "4",
        nomeProduto: "Maçã Gala",
        unidade: "kg",
        categoria: "Frutas",
        img: "https://images.unsplash.com/photo-1560806887-c5a2a4c02e4d?q=80&w=250&auto=format&fit=crop",
        valorProduto: 7.99,
        valoremPromocao: null,
        descontoPorcentagem: 0
    },
    {
        _id: "5",
        nomeProduto: "Banana Prata",
        unidade: "kg",
        categoria: "Frutas",
        img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=250&auto=format&fit=crop",
        valorProduto: 5.49,
        valoremPromocao: null,
        descontoPorcentagem: 0
    },
    {
        _id: "6",
        nomeProduto: "Tomate Italiano",
        unidade: "kg",
        categoria: "Verduras e Legumes",
        img: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?q=80&w=250&auto=format&fit=crop",
        valorProduto: 6.99,
        valoremPromocao: null,
        descontoPorcentagem: 0
    },
    {
        _id: "7",
        nomeProduto: "Alface Crespa",
        unidade: "un",
        categoria: "Verduras e Legumes",
        img: "https://images.unsplash.com/photo-1622206151226-18ca2c9d680b?q=80&w=250&auto=format&fit=crop",
        valorProduto: 3.49,
        valoremPromocao: null,
        descontoPorcentagem: 0
    },
    {
        _id: "8",
        nomeProduto: "Leite Integral",
        unidade: "1L",
        categoria: "Laticínios",
        img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=250&auto=format&fit=crop",
        valorProduto: 5.99,
        valoremPromocao: null,
        descontoPorcentagem: 0
    }
];

// 2. Passa o mock direto pra renderização. Quando o backend estiver
//    pronto, troca essa função pelo fetch de carregarProdutos() abaixo.
function carregarProdutosTeste() {
    renderizarSecoes(produtosMock);
}

// Função para buscar produtos reais do seu banco
async function carregarProdutos() {
    try {
        // Substitua pela rota real da sua API, ex: `${API_URL}/api/produtos`
        const resposta = await fetch('');
        const produtos = await resposta.json();
        renderizarSecoes(produtos);
    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);
    }
}

// Agrupa a lista de produtos num objeto { categoria: [produtos] }
function agruparPorCategoria(produtos) {
    const grupos = {};

    produtos.forEach(produto => {
        const categoria = produto.categoria || "Outros";
        if (!grupos[categoria]) grupos[categoria] = [];
        grupos[categoria].push(produto);
    });

    return grupos;
}

// Ordena os nomes das categorias segundo ORDEM_CATEGORIAS,
// jogando categorias desconhecidas pro final (ordem alfabética entre si)
function ordenarCategorias(nomesCategorias) {
    return nomesCategorias.sort((a, b) => {
        const posA = ORDEM_CATEGORIAS.indexOf(a);
        const posB = ORDEM_CATEGORIAS.indexOf(b);

        if (posA === -1 && posB === -1) return a.localeCompare(b);
        if (posA === -1) return 1;
        if (posB === -1) return -1;
        return posA - posB;
    });
}

// Monta uma seção (título + carrossel horizontal) por categoria
// e injeta tudo dentro de #secoes-produtos
function renderizarSecoes(produtos) {
    const container = document.getElementById('secoes-produtos');
    container.innerHTML = '';

    const grupos = agruparPorCategoria(produtos);
    const categorias = ordenarCategorias(Object.keys(grupos));

    if (categorias.length === 0) {
        container.innerHTML = '<p class="sem-produtos">Nenhum produto encontrado no momento.</p>';
        return;
    }

    categorias.forEach((categoria, index) => {
        const idSecao = `secao-${index}`;

        const secaoHTML = `
            <div class="secao-produtos">
                <div class="barra-superior">
                    <p>${categoria}</p>
                    <button class="text-sm p-1 text-gray-400 hover:text-blue-500 transition-all duration-200 flex items-center"
                        title="Compartilhar corredor" aria-label="Compartilhar corredor">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="24" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            class="lucide lucide-share2 lucide-share-2 h-4 w-4" aria-hidden="true">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line>
                            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line>
                        </svg>
                    </button>
                    <button class="botao-ant" onclick="rolarSecao('${idSecao}', -1)">&#10094;</button>
                    <button class="botao-prox" onclick="rolarSecao('${idSecao}', 1)">&#10095;</button>
                </div>
                <div class="itens-horizontal" id="${idSecao}"></div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', secaoHTML);
        renderizarCards(grupos[categoria], idSecao);
    });
}

// Rola o carrossel horizontal de uma seção específica
function rolarSecao(idSecao, direcao) {
    const container = document.getElementById(idSecao);
    if (!container) return;

    const larguraCard = 260 + 16; // largura do .produto-card + gap (definidos no CSS)
    container.scrollBy({ left: direcao * larguraCard * 2, behavior: 'smooth' });
}

// Renderiza os cards de produto dentro do container de uma seção específica
function renderizarCards(produtos, idContainer) {
    const container = document.getElementById(idContainer);
    if (!container) return;

    produtos.forEach(produto => {
        const temPromocao = produto.valoremPromocao != null && produto.valoremPromocao < produto.valorProduto;

        const blocoPreco = temPromocao ? `
                    <div class="preco-antigo-linha">
                        <span class="preco-riscado">R$ ${produto.valorProduto.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="preco-atual-linha">
                        <span class="preco-destaque">R$ ${produto.valoremPromocao.toFixed(2).replace('.', ',')}</span>
                        <span class="unidade">/${produto.unidade}</span>
                        <span class="badge-desconto">-${produto.descontoPorcentagem}%</span>
                    </div>
        ` : `
                    <div class="preco-atual-linha">
                        <span class="preco-destaque">R$${produto.valorProduto.toFixed(2).replace('.', ',')}</span>
                        <span class="unidade">/${produto.unidade}</span>
                    </div>
        `;

        const cardHTML = `
            <div class="produto-card">
                <div class="card-top">
                    <div class="icones-acao">
                        <!-- Ícone de Coração -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                        <!-- Ícone de Compartilhar -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                        <!-- Ícone de Sino -->
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                    </div>
                </div>

                <div class="produto-imagem">
                    <img src="${produto.img}" alt="${produto.nomeProduto}">
                </div>

                <h3 class="produto-titulo">${produto.nomeProduto}</h3>

                <div class="info-preco">
                    ${blocoPreco}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosTeste();
});
