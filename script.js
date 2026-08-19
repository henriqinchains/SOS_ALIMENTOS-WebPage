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