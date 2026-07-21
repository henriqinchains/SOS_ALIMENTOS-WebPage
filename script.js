let indiceAtual = 0;
const slides = document.querySelectorAll('.slide');

function mostrarSlide(indice) {
    slides.forEach((slide) => slide.classList.remove('ativo'));

    if (indice >= slides.length) indiceAtual = 0;
    if (indice < 0) indiceAtual = slides.length - 1;

    slides[indiceAtual].classList.add('ativo');
}

function mudarSlide(direcao) {
    mostrarSlide(indiceAtual += direcao);
}

//4s intervalo
setInterval(() => {
    mudarSlide(1);
}, 4000);