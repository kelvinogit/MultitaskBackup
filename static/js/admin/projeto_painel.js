
document.addEventListener('DOMContentLoaded', () => {

    /* =====================================================
       PAINEL HORIZONTAL
       ===================================================== */

    const scroll = document.getElementById('painel-scroll');

    const setaEsquerda = document.getElementById('seta-esquerda');
    const setaDireita = document.getElementById('seta-direita');

    const LARGURA_PASSO = 300;


    /* =====================================================
       ARRASTAR COM MOUSE
       ===================================================== */

    let pressionado = false;
    let inicioX = 0;
    let scrollInicial = 0;
    let moveu = false;


    if (scroll) {

        scroll.addEventListener('mousedown', (event) => {

            pressionado = true;

            moveu = false;

            inicioX = event.pageX - scroll.offsetLeft;

            scrollInicial = scroll.scrollLeft;

            scroll.classList.add('arrastando');

        });


        scroll.addEventListener('mouseleave', () => {

            pressionado = false;

            scroll.classList.remove('arrastando');

        });


        scroll.addEventListener('mouseup', () => {

            pressionado = false;

            scroll.classList.remove('arrastando');

        });


        scroll.addEventListener('mousemove', (event) => {

            if (!pressionado) {
                return;
            }

            event.preventDefault();

            const x = event.pageX - scroll.offsetLeft;

            const distancia = (x - inicioX) * 1.5;

            if (Math.abs(distancia) > 5) {
                moveu = true;
            }

            scroll.scrollLeft = scrollInicial - distancia;

        });


        /* =================================================
           TOUCH
           ================================================= */

        let toqueInicial = 0;
        let scrollTouchInicial = 0;


        scroll.addEventListener(
            'touchstart',
            (event) => {

                toqueInicial = event.touches[0].pageX;

                scrollTouchInicial = scroll.scrollLeft;

            },
            { passive: true }
        );


        scroll.addEventListener(
            'touchmove',
            (event) => {

                const toqueAtual = event.touches[0].pageX;

                const distancia = toqueInicial - toqueAtual;

                scroll.scrollLeft =
                    scrollTouchInicial + distancia;

            },
            { passive: true }
        );

    }


    /* =====================================================
       SETA ESQUERDA
       ===================================================== */

    if (setaEsquerda && scroll) {

        setaEsquerda.addEventListener('click', () => {

            scroll.scrollBy({
                left: -LARGURA_PASSO,
                behavior: 'smooth'
            });

        });

    }


    /* =====================================================
       SETA DIREITA
       ===================================================== */

    if (setaDireita && scroll) {

        setaDireita.addEventListener('click', () => {

            scroll.scrollBy({
                left: LARGURA_PASSO,
                behavior: 'smooth'
            });

        });

    }


    /* =====================================================
       MODAL DE PARTICIPANTES
       ===================================================== */

    const botoesParticipantes =
        document.querySelectorAll(
            '.card-projeto__participantes-btn'
        );


    const modaisParticipantes =
        document.querySelectorAll(
            '.modal-participantes'
        );


    /* =====================================================
       ABRIR MODAL
       ===================================================== */

    function abrirModal(modal) {

        if (!modal) {
            return;
        }


        /*
         * Procura os participantes que já foram renderizados
         * pelo Django para este projeto.
         */

        const lista =
            modal.querySelector(
                '.modal-participantes__lista'
            );


        if (lista) {

            const participantes =
                lista.querySelectorAll(
                    '.participante'
                );


            const vazio =
                lista.querySelector(
                    '.participantes-vazio'
                );


            /*
             * Se nenhum integrante desse projeto foi encontrado,
             * mostra a mensagem de projeto sem participantes.
             */

            if (participantes.length === 0) {

                if (vazio) {
                    vazio.hidden = false;
                }

            } else {

                if (vazio) {
                    vazio.hidden = true;
                }

            }

        }


        modal.classList.add('aberto');

        modal.setAttribute(
            'aria-hidden',
            'false'
        );


        /*
         * Impede a página de rolar enquanto o modal está aberto.
         */

        document.body.style.overflow = 'hidden';

    }


    /* =====================================================
       FECHAR MODAL
       ===================================================== */

    function fecharModal(modal) {

        if (!modal) {
            return;
        }


        modal.classList.remove('aberto');

        modal.setAttribute(
            'aria-hidden',
            'true'
        );


        /*
         * Só libera o scroll se não existir outro modal aberto.
         */

        const outroModalAberto =
            document.querySelector(
                '.modal-participantes.aberto'
            );


        if (!outroModalAberto) {

            document.body.style.overflow = '';

        }

    }


    /* =====================================================
       BOTÕES "MOSTRAR PARTICIPANTES"
       ===================================================== */

    botoesParticipantes.forEach((botao) => {

        botao.addEventListener('click', (event) => {

            /*
             * Evita que o clique seja interpretado
             * pelo sistema de arraste do painel.
             */

            event.stopPropagation();


            const idModal =
                botao.dataset.modal;


            const modal =
                document.getElementById(idModal);


            abrirModal(modal);

        });

    });


    /* =====================================================
       CONFIGURAÇÃO DE CADA MODAL
       ===================================================== */

    modaisParticipantes.forEach((modal) => {


        /* -------------------------------------------------
           BOTÃO X
           ------------------------------------------------- */

        const botaoFechar =
            modal.querySelector(
                '.modal-participantes__fechar'
            );


        if (botaoFechar) {

            botaoFechar.addEventListener(
                'click',
                (event) => {

                    event.stopPropagation();

                    fecharModal(modal);

                }
            );

        }


        /* -------------------------------------------------
           CLICAR NO FUNDO
           ------------------------------------------------- */

        const overlay =
            modal.querySelector(
                '.modal-participantes__overlay'
            );


        if (overlay) {

            overlay.addEventListener(
                'click',
                () => {

                    fecharModal(modal);

                }
            );

        }

    });


    /* =====================================================
       ESC FECHA O MODAL
       ===================================================== */

    document.addEventListener(
        'keydown',
        (event) => {

            if (event.key !== 'Escape') {
                return;
            }


            const modalAberto =
                document.querySelector(
                    '.modal-participantes.aberto'
                );


            if (modalAberto) {

                fecharModal(modalAberto);

            }

        }
    );


    /* =====================================================
       EVITA QUE O CLIQUE DENTRO DO MODAL PROPAGUE
       ===================================================== */

    modaisParticipantes.forEach((modal) => {

        const conteudo =
            modal.querySelector(
                '.modal-participantes__conteudo'
            );


        if (conteudo) {

            conteudo.addEventListener(
                'click',
                (event) => {

                    event.stopPropagation();

                }
            );

        }

    });

});
