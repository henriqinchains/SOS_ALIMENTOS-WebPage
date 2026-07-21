let indiceAtual = 0;
const slides = document.querySelectorAll('.slide');
let intervaloTemporizador; // Variável para guardar o cronômetro

function mostrarSlide(indice) {
    slides.forEach((slide) => slide.classList.remove('ativo'));

    if (indice >= slides.length) indiceAtual = 0;
    if (indice < 0) indiceAtual = slides.length - 1;

    slides[indiceAtual].classList.add('ativo');
}

function mudarSlide(direcao) {
    mostrarSlide(indiceAtual += direcao);
    resetarIntervalo(); // Reseta o tempo ao clicar
}

function iniciarIntervalo() {
    intervaloTemporizador = setInterval(() => {
        mudarSlide(1);
    }, 4000);
}

function resetarIntervalo() {
    clearInterval(intervaloTemporizador); // Para o cronômetro atual
    iniciarIntervalo(); // Inicia um novo do zero
}

// Inicia o carrossel ao carregar a página
iniciarIntervalo();

// 1. Criamos os dados falsos simulando a resposta do MongoDB
const produtosMock = [
    {
        _id: "1",
        nome: "Bola Choc.tiquinho Ao Leite 350g",
        imagemUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?q=80&w=250&auto=format&fit=crop",
        precoAntigo: 41.90,
        precoAtual: 19.90,
        descontoPorcentagem: 53
    },
    {
        _id: "2",
        nome: "Camarão Rosa Limpo Congelado 400g",
        imagemUrl: "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?q=80&w=250&auto=format&fit=crop",
        precoAntigo: 65.90,
        precoAtual: 49.90,
        descontoPorcentagem: 24
    },
    {
        _id: "3",
        nome: "Farinha de Trigo Especial para Massas 1kg",
        imagemUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=250&auto=format&fit=crop",
        precoAntigo: 8.50,
        precoAtual: 6.99,
        descontoPorcentagem: 17
    }
];

// 2. Modificamos a função para ler o array em vez de fazer a requisição fetch
function carregarProdutosTeste() {
    // Quando o backend estiver pronto, você volta o fetch para cá.
    // Por enquanto, passamos o Mock direto para a renderização:
    renderizarCards(produtosMock);
}

// Exemplo de função para buscar do seu banco
async function carregarProdutos() {
    try {
        // Substitua pela rota real da sua API
        const resposta = await fetch('');
        const produtos = await resposta.json();
        renderizarCards(produtos);
    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);
    }
}

function renderizarCards(produtos) {
    const container = document.querySelector('.itens-vertical');
    container.innerHTML = ''; // Limpa o container antes de renderizar

    produtos.forEach(produto => {
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
                    <img src="${produto.imagemUrl}" alt="${produto.nome}">
                </div>

                <h3 class="produto-titulo">${produto.nome}</h3>

                <div class="info-preco">
                    <div class="preco-antigo-linha">
                        <span class="preco-riscado">R$ ${produto.precoAntigo.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="preco-atual-linha">
                        <span class="preco-destaque">R$ ${produto.precoAtual.toFixed(2).replace('.', ',')}</span>
                        <span>/un</span>
                        <span class="badge-desconto">-${produto.descontoPorcentagem}%</span>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
}

document.addEventListener('DOMContentLoaded', carregarProdutosTeste);