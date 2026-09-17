/* ==========================================================
   Painel de Projetos — arrastar para o lado (mouse e touch)
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const scrollArea = document.getElementById('painel-scroll');
    const setaEsquerda = document.getElementById('seta-esquerda');
    const setaDireita = document.getElementById('seta-direita');

    if (!scrollArea) {
        return;
    }

    let arrastando = false;
    let posicaoInicialX = 0;
    let scrollInicial = 0;
    let moveu = false;

    const LARGURA_PASSO = 300; // px percorridos ao clicar nas setas

    /* ---------- Arrastar com o mouse ---------- */

    scrollArea.addEventListener('mousedown', function (evento) {
        arrastando = true;
        moveu = false;
        posicaoInicialX = evento.pageX;
        scrollInicial = scrollArea.scrollLeft;
        scrollArea.classList.add('arrastando');
    });

    window.addEventListener('mouseup', function () {
        arrastando = false;
        scrollArea.classList.remove('arrastando');
    });

    window.addEventListener('mouseleave', function () {
        arrastando = false;
        scrollArea.classList.remove('arrastando');
    });

    scrollArea.addEventListener('mousemove', function (evento) {
        if (!arrastando) {
            return;
        }
        evento.preventDefault();

        const distancia = evento.pageX - posicaoInicialX;

        if (Math.abs(distancia) > 5) {
            moveu = true;
        }

        scrollArea.scrollLeft = scrollInicial - distancia;
    });

    // Evita que um clique no card dispare navegação/links após arrastar
    scrollArea.addEventListener('click', function (evento) {
        if (moveu) {
            evento.preventDefault();
            evento.stopPropagation();
        }
    }, true);

    /* ---------- Arrastar com toque (mobile/tablet) ----------
       O navegador já trata o swipe nativamente via -webkit-overflow-scrolling,
       então aqui só garantimos compatibilidade sem travar a rolagem nativa. */

    scrollArea.addEventListener('touchstart', function (evento) {
        posicaoInicialX = evento.touches[0].pageX;
        scrollInicial = scrollArea.scrollLeft;
    }, { passive: true });

    /* ---------- Setas de navegação ---------- */

    if (setaEsquerda) {
        setaEsquerda.addEventListener('click', function () {
            scrollArea.scrollBy({ left: -LARGURA_PASSO, behavior: 'smooth' });
        });
    }

    if (setaDireita) {
        setaDireita.addEventListener('click', function () {
            scrollArea.scrollBy({ left: LARGURA_PASSO, behavior: 'smooth' });
        });
    }
});