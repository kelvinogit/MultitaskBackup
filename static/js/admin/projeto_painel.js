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


    /* =====================================================
       EXCLUIR INTEGRANTE
       ===================================================== */

    const botoesExcluirIntegrante =
        document.querySelectorAll(
            '.delete-integrante-button'
        );


    botoesExcluirIntegrante.forEach((botao) => {

        botao.addEventListener(
            'click',
            async (event) => {

                /*
                 * Impede que o clique do botão
                 * propague para o modal/painel.
                 */

                event.stopPropagation();


                /*
                 * Pega a URL que o Django colocou
                 * no atributo data-delete-url.
                 */

                const url =
                    botao.dataset.deleteUrl;


                if (!url) {

                    console.error(
                        'URL de exclusão não encontrada.'
                    );

                    return;
                }


                /*
                 * Confirmação antes de excluir.
                 */

                const confirmar =
                    confirm(
                        'Tem certeza que deseja excluir este integrante do projeto?'
                    );


                if (!confirmar) {
                    return;
                }


                try {

                    /*
                     * Envia uma requisição POST para o Django.
                     */

                    const resposta =
                        await fetch(url, {

                            method: 'POST',

                            headers: {

                                'X-CSRFToken':
                                    getCookie('csrftoken'),

                                'X-Requested-With':
                                    'XMLHttpRequest'
                            }
                        });


                    /*
                     * Verifica se o servidor respondeu
                     * com algum erro HTTP.
                     */

                    if (!resposta.ok) {

                        throw new Error(
                            `Erro HTTP: ${resposta.status}`
                        );
                    }


                    /*
                     * Converte a resposta do Django
                     * para JSON.
                     */

                    const dados =
                        await resposta.json();


                    /*
                     * Nossa view retorna:
                     *
                     * {'ok': True}
                     *
                     * Portanto, verificamos dados.ok.
                     */

                    if (dados.ok) {

                        /*
                         * Encontra o participante inteiro
                         * onde o botão está inserido.
                         */

                        const participante =
                            botao.closest(
                                '.participante'
                            );


                        /*
                         * Remove o participante da tela
                         * sem precisar recarregar a página.
                         */

                        if (participante) {
                            participante.remove();
                        }


                        /*
                         * Atualiza a mensagem de
                         * "nenhum participante".
                         */

                        const modal =
                            botao.closest(
                                '.modal-participantes'
                            );


                        if (modal) {

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


                                if (
                                    participantes.length === 0 &&
                                    vazio
                                ) {

                                    vazio.hidden = false;
                                }
                            }
                        }


                    } else {

                        alert(
                            'Não foi possível excluir o integrante.'
                        );
                    }


                } catch (erro) {

                    console.error(
                        'Erro ao excluir integrante:',
                        erro
                    );


                    alert(
                        'Ocorreu um erro ao tentar excluir o integrante.'
                    );
                }
            }
        );
    });

});


/* =====================================================
   CSRF TOKEN
   ===================================================== */

function getCookie(nome) {

    let cookieValue = null;


    if (
        document.cookie &&
        document.cookie !== ''
    ) {

        const cookies =
            document.cookie.split(';');


        for (let cookie of cookies) {

            cookie = cookie.trim();


            if (
                cookie.startsWith(
                    nome + '='
                )
            ) {

                cookieValue =
                    decodeURIComponent(
                        cookie.substring(
                            nome.length + 1
                        )
                    );

                break;
            }
        }
    }


    return cookieValue;
}