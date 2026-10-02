document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTOS PRINCIPAIS DO PAINEL
       ===================================================== */

    const board = document.getElementById("ppBoard");
    const pool = document.querySelector("[data-pool]");

    if (!board || !pool) return;

    const MAX_MEMBERS = 4;

    const searchInput = document.getElementById("ppSearch");

    const cards = Array.from(
        pool.querySelectorAll(".pp-card")
    );


    /* =====================================================
       FAIXAS DO PAINEL
       ===================================================== */

    const lanes = {};

    board.querySelectorAll(".pp-lane").forEach((lane) => {

        lanes[lane.dataset.lane] = {

            el: lane,

            track: lane.querySelector(".pp-track"),

            count: lane.querySelector(".pp-lane-count"),

            empty: lane.querySelector(".pp-lane-empty"),

            hideEmpty: lane.hasAttribute("data-hide-empty"),

        };

    });


    /* =====================================================
       UTILITÁRIOS
       ===================================================== */

    function normalize(text) {

        return (text || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    function parseISODate(value) {

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            value || ""
        );

        if (!match) return null;

        return new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );

    }


    function clampProgress(value) {

        const number = parseFloat(
            String(value).replace(",", ".")
        );

        if (Number.isNaN(number)) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(0, Math.round(number))
        );

    }


    function initials(name) {

        const parts = (name || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!parts.length) {
            return "?";
        }

        const first = parts[0][0];

        const last =
            parts.length > 1
                ? parts[parts.length - 1][0]
                : "";

        return (first + last).toUpperCase();

    }


    /* =====================================================
       CLASSIFICAÇÃO DO STATUS
       ===================================================== */

    function toneFromStatus(card) {

        const label =
            card.querySelector(".pp-status")?.textContent || "";

        const text = normalize(
            `${card.dataset.status || ""} ${label}`
        );


        if (
            /conclu|finaliz|entreg|complet|done/.test(text)
        ) {
            return "done";
        }


        if (
            /andamento|progress|execu|ativo|desenvolv/.test(text)
        ) {
            return "progress";
        }


        if (
            /paus|paralis|suspens|cancel|arquiv/.test(text)
        ) {
            return "hold";
        }


        return "pending";

    }


    /* =====================================================
       INFORMAÇÃO DO PRAZO
       ===================================================== */

    function deadlineInfo(prazo, today) {

        const days = Math.round(
            (prazo - today) / 86400000
        );


        if (days < 0) {

            const abs = Math.abs(days);

            return {

                urgency: "late",

                text:
                    `Atrasado há ${abs} ` +
                    `${abs === 1 ? "dia" : "dias"}`,

            };

        }


        if (days === 0) {

            return {
                urgency: "soon",
                text: "Vence hoje",
            };

        }


        if (days === 1) {

            return {
                urgency: "soon",
                text: "Vence amanhã",
            };

        }


        if (days <= 7) {

            return {
                urgency: "soon",
                text: `Vence em ${days} dias`,
            };

        }


        return {
            urgency: "",
            text: "",
        };

    }


    /* =====================================================
       PREPARAÇÃO DOS PARTICIPANTES DO CARD
       ===================================================== */

    function buildTeam(card) {

        const team =
            card.querySelector(".pp-team");

        if (!team) {
            return;
        }


        const members = Array.from(
            team.querySelectorAll(".pp-member")
        );


        members.forEach((member, index) => {

            const name =
                member.dataset.name || "";

            member.textContent =
                initials(name);

            member.title =
                name;

            member.setAttribute(
                "aria-label",
                name
            );


            /*
            Apenas os primeiros 4 aparecem
            diretamente no card.
            */

            if (index >= MAX_MEMBERS) {
                member.hidden = true;
            }

        });


        /*
        Se houver mais de 4 participantes,
        cria o indicador +N.
        */

        if (members.length > MAX_MEMBERS) {

            /*
            Evita criar o +N duas vezes caso
            buildTeam seja chamado novamente.
            */

            const existingMore =
                team.querySelector(".pp-member--more");

            if (existingMore) {
                existingMore.remove();
            }


            const extra =
                members.slice(MAX_MEMBERS);


            const more =
                document.createElement("li");


            more.className =
                "pp-member pp-member--more";


            more.textContent =
                `+${extra.length}`;


            more.title =
                extra
                    .map((member) =>
                        member.dataset.name
                    )
                    .join(", ");


            more.setAttribute(
                "aria-label",
                `Mais ${extra.length}: ${more.title}`
            );


            team.appendChild(more);

        }


        team.classList.toggle(
            "is-empty",
            members.length === 0
        );

    }


    /* =====================================================
       PREPARAÇÃO DO CARD
       ===================================================== */

    function prepareCard(card) {

        const tone =
            toneFromStatus(card);

        let laneKey =
            tone;


        /* ---------------------------------------------
           PRAZO
           --------------------------------------------- */

        const prazo =
            parseISODate(
                card.dataset.prazo
            );


        const deadlineEl =
            card.querySelector(
                ".pp-deadline"
            );


        const isOpen =
            tone !== "done" &&
            tone !== "hold";


        if (prazo && isOpen) {

            const info =
                deadlineInfo(
                    prazo,
                    today
                );


            if (info.urgency) {

                card.dataset.urgency =
                    info.urgency;

            }


            if (deadlineEl) {

                deadlineEl.textContent =
                    info.text;

            }


            /*
            Projeto vencido e não concluído
            vai para Atrasados.
            */

            if (
                info.urgency === "late"
            ) {

                laneKey = "late";

            }

        }


        card.dataset.lane =
            lanes[laneKey]
                ? laneKey
                : "pending";


        /* ---------------------------------------------
           PROGRESSO
           --------------------------------------------- */

        const progress =
            clampProgress(
                card.dataset.progresso
            );


        const fill =
            card.querySelector(
                ".pp-progress-fill"
            );


        const label =
            card.querySelector(
                ".pp-progress-label"
            );


        const track =
            card.querySelector(
                ".pp-progress-track"
            );


        if (label) {

            label.textContent =
                `${progress}%`;

        }


        if (track) {

            track.setAttribute(
                "aria-valuenow",
                String(progress)
            );

        }


        if (fill) {

            requestAnimationFrame(() => {

                fill.style.width =
                    `${progress}%`;

            });

        }


        /* ---------------------------------------------
           TEXTO PARA BUSCA
           --------------------------------------------- */

        const nome =
            card.querySelector(
                ".pp-card-title"
            )?.textContent || "";


        const desc =
            card.querySelector(
                ".pp-card-desc"
            )?.textContent || "";


        card.dataset.search =
            normalize(
                `${nome} ${desc}`
            );


        /* ---------------------------------------------
           PARTICIPANTES
           --------------------------------------------- */

        buildTeam(card);

    }


    /* =====================================================
       DATA ATUAL
       ===================================================== */

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    /* =====================================================
       PREPARA TODOS OS CARDS
       ===================================================== */

    cards.forEach(
        prepareCard
    );


    /* =====================================================
       DISTRIBUI OS CARDS NAS FAIXAS
       ===================================================== */

    cards
        .slice()
        .sort((a, b) =>
            (
                a.dataset.prazo ||
                "9999-99-99"
            ).localeCompare(
                b.dataset.prazo ||
                "9999-99-99"
            )
        )
        .forEach((card) => {

            const lane =
                lanes[
                    card.dataset.lane
                ];


            if (lane) {

                lane.track.appendChild(
                    card
                );

            }

        });


    /* =====================================================
       CONTADORES + BUSCA
       ===================================================== */

    function updateLanes() {

        const termo =
            normalize(
                searchInput
                    ? searchInput.value
                    : ""
            );


        const totals = {};

        const visibles = {};


        cards.forEach((card) => {

            const key =
                card.dataset.lane;


            const combina =
                !termo ||
                card.dataset.search.includes(
                    termo
                );


            totals[key] =
                (totals[key] || 0) + 1;


            card.hidden =
                !combina;


            if (combina) {

                visibles[key] =
                    (visibles[key] || 0) + 1;

            }

        });


        Object.entries(
            lanes
        ).forEach(
            ([key, lane]) => {

                const total =
                    totals[key] || 0;


                const visible =
                    visibles[key] || 0;


                lane.count.textContent =
                    String(visible);


                if (lane.empty) {

                    lane.empty.hidden =
                        visible !== 0;


                    lane.empty.textContent =
                        total && !visible
                            ? "Nenhum resultado para a busca."
                            : "Nenhum projeto nesta situação.";

                }


                /*
                A faixa de pausados só aparece
                quando possui projetos.
                */

                lane.el.hidden =
                    lane.hideEmpty &&
                    total === 0;

            }
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            updateLanes
        );

    }


    updateLanes();


    /* =====================================================
       MODAL DE PARTICIPANTES
       ===================================================== */

    const membersModal =
        document.getElementById(
            "ppMembersModal"
        );


    const modalTitle =
        document.getElementById(
            "ppModalTitle"
        );


    const modalMembers =
        document.getElementById(
            "ppModalMembers"
        );


    const modalClose =
        document.getElementById(
            "ppModalClose"
        );


    const modalAddButton =
        document.getElementById(
            "ppModalAddButton"
        );


    const showMembersButtons =
        document.querySelectorAll(
            ".pp-show-members-btn"
        );


    /* =====================================================
       ABRIR MODAL
       ===================================================== */

    function openMembersModal(card) {

        if (
            !membersModal ||
            !card
        ) {
            return;
        }


        /* ---------------------------------------------
           NOME DO PROJETO
           --------------------------------------------- */

        const projectName =
            card.dataset.projectName ||
            card.querySelector(
                ".pp-card-title"
            )?.textContent.trim() ||
            "Projeto";


        if (modalTitle) {

            modalTitle.textContent =
                projectName;

        }


        /* ---------------------------------------------
           LIMPA PARTICIPANTES ANTERIORES
           --------------------------------------------- */

        if (modalMembers) {

            modalMembers.innerHTML =
                "";

        }


        /* ---------------------------------------------
           PEGA PARTICIPANTES DO CARD
           --------------------------------------------- */

        const team =
            card.querySelector(
                ".pp-team"
            );


        /*
        Aqui pegamos somente .pp-member.
        O +N também possui essa classe,
        então precisamos ignorá-lo.
        */

        const members = team
            ? Array.from(
                team.querySelectorAll(
                    ".pp-member:not(.pp-member--more)"
                )
            )
            : [];


        /* ---------------------------------------------
           SEM PARTICIPANTES
           --------------------------------------------- */

        if (!members.length) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "pp-modal__empty";


            empty.textContent =
                "Este projeto ainda não possui participantes.";


            modalMembers.appendChild(
                empty
            );

        }


        /* ---------------------------------------------
           PARTICIPANTES
           --------------------------------------------- */

        else {

            members.forEach(
                (member) => {

                    const name =
                        member.dataset.name ||
                        "Usuário";


                    /*
                    Container
                    */

                    const item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "pp-modal__member";


                    /*
                    Avatar
                    */

                    const avatar =
                        document.createElement(
                            "div"
                        );


                    avatar.className =
                        "pp-modal__avatar";


                    avatar.textContent =
                        initials(name);


                    /*
                    Informações
                    */

                    const information =
                        document.createElement(
                            "div"
                        );


                    information.className =
                        "pp-modal__member-info";


                    const nameElement =
                        document.createElement(
                            "strong"
                        );


                    nameElement.textContent =
                        name;


                    const roleElement =
                        document.createElement(
                            "span"
                        );


                    roleElement.textContent =
                        "Participante";


                    information.appendChild(
                        nameElement
                    );


                    information.appendChild(
                        roleElement
                    );


                    /*
                    Monta participante
                    */

                    item.appendChild(
                        avatar
                    );


                    item.appendChild(
                        information
                    );


                    modalMembers.appendChild(
                        item
                    );

                }
            );

        }


        /* ---------------------------------------------
           PROJETO DO BOTÃO ADICIONAR
           --------------------------------------------- */

        const projectId =
            card.dataset.id;


        if (modalAddButton) {

            modalAddButton.dataset.projectId =
                projectId;

        }


        /* ---------------------------------------------
           MOSTRA MODAL
           --------------------------------------------- */

        membersModal.hidden =
            false;


        membersModal.setAttribute(
            "aria-hidden",
            "false"
        );


        /*
        Bloqueia scroll da página
        */

        document.body.classList.add(
            "pp-modal-open"
        );


        /*
        Coloca foco no botão fechar
        */

        if (modalClose) {

            modalClose.focus();

        }

    }


    /* =====================================================
       FECHAR MODAL
       ===================================================== */

    function closeMembersModal() {

        if (!membersModal) {
            return;
        }


        membersModal.hidden =
            true;


        membersModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "pp-modal-open"
        );

    }


    /* =====================================================
       BOTÕES "MOSTRAR PARTICIPANTES"
       ===================================================== */

    showMembersButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const card =
                        button.closest(
                            ".pp-card"
                        );


                    if (!card) {
                        return;
                    }


                    /*
                    Guarda o nome do projeto
                    no card.
                    */

                    card.dataset.projectName =
                        button.dataset.projectName ||
                        "Projeto";


                    openMembersModal(
                        card
                    );

                }
            );

        }
    );


    /* =====================================================
       BOTÃO X
       ===================================================== */

    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeMembersModal
        );

    }


    /* =====================================================
       CLICAR NO FUNDO/OVERLAY
       ===================================================== */

    if (membersModal) {

        const overlay =
            membersModal.querySelector(
                "[data-modal-close]"
            );


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeMembersModal
            );

        }

    }


    /* =====================================================
       TECLA ESC
       ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                membersModal &&
                !membersModal.hidden
            ) {

                closeMembersModal();

            }

        }
    );

});