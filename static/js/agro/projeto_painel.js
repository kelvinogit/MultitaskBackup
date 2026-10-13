/* ==========================================================================
   Painel de projetos — tema Engenharia Agronômica
   Arquivo: static/js/agro/projeto_painel.js

   O que este script faz:
   - distribui os cartões (div[data-pool]) nas faixas por situação;
   - ordena cada faixa do prazo mais próximo para o mais distante;
   - escreve o texto do prazo, preenche a barra de progresso e as iniciais
     dos integrantes;
   - busca por projeto, contadores e mensagem de faixa vazia;
   - modal "Mostrar participantes".
   ========================================================================== */

(function () {
    "use strict";

    /* ----------------------------------------------------------------------
       Configuração: como cada valor de `status` do model vira uma faixa.
       Se os seus status tiverem outros nomes, ajuste as expressões abaixo.
       Tudo que não casar com nada cai em "pending" (Planejamento).
       ---------------------------------------------------------------------- */
    var STATUS_RULES = [
        { lane: "done",     test: /conclu|finaliz|entreg|done|complet/ },
        { lane: "hold",     test: /paus|cancel|hold|suspen/ },
        { lane: "progress", test: /andamento|progress|execu|^ativ/ }
    ];

    var MAX_AVATARS = 4;
    var DAY_MS = 86400000;

    function normalize(text) {
        return (text || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function startOfToday() {
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function parseDate(value) {
        var parts = (value || "").split("-");
        if (parts.length !== 3) return null;

        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return isNaN(date.getTime()) ? null : date;
    }

    function plural(n, singular, pluralForm) {
        return n + " " + (n === 1 ? singular : pluralForm);
    }

    function initials(name) {
        var words = name.split(/\s+/).filter(Boolean);
        if (!words.length) return "?";
        if (words.length === 1) return words[0].charAt(0).toUpperCase();
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }

    function tone(name) {
        var sum = 0;
        for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
        return String(sum % 4);
    }

    // Lê o token CSRF do cookie do Django (necessário em POST via fetch)
    function getCookie(name) {
        var match = document.cookie.split("; ").filter(function (c) {
            return c.indexOf(name + "=") === 0;
        })[0];
        return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
    }

    /* ---------------------------------------------------------------------- */

    document.addEventListener("DOMContentLoaded", function () {
        var board = document.getElementById("ppBoard");
        var pool = document.querySelector("[data-pool]");
        if (!board || !pool) return;

        var today = startOfToday();
        var lanes = {};
        board.querySelectorAll(".pp-lane").forEach(function (lane) {
            lanes[lane.dataset.lane] = lane;
        });

        var cards = Array.prototype.slice.call(pool.querySelectorAll(".pp-card"));

        /* ---------- Situação e prazo ---------- */

        function laneFor(card, deadline) {
            var status = normalize(card.dataset.status).replace(/[\s-]+/g, "_");
            var lane = "pending";

            for (var i = 0; i < STATUS_RULES.length; i++) {
                if (STATUS_RULES[i].test.test(status)) {
                    lane = STATUS_RULES[i].lane;
                    break;
                }
            }

            if ((lane === "pending" || lane === "progress") && deadline && deadline < today) {
                lane = "late";
            }
            return lane;
        }

        function writeDeadline(card, deadline, lane) {
            var el = card.querySelector(".pp-deadline");
            if (!el) return;

            el.classList.remove("is-late", "is-today", "is-soon");

            if (lane === "done") {
                el.textContent = "Concluído";
                return;
            }
            if (!deadline) {
                el.textContent = "Sem prazo";
                return;
            }

            var diff = Math.round((deadline - today) / DAY_MS);

            if (diff < 0) {
                el.textContent = "Atrasado há " + plural(-diff, "dia", "dias");
                if (lane !== "hold") el.classList.add("is-late");
            } else if (diff === 0) {
                el.textContent = "Vence hoje";
                el.classList.add("is-today");
            } else if (diff === 1) {
                el.textContent = "Vence amanhã";
                el.classList.add("is-soon");
            } else {
                el.textContent = "Faltam " + plural(diff, "dia", "dias");
                if (diff <= 7) el.classList.add("is-soon");
            }
        }

        /* ---------- Progresso ---------- */

        function setupProgress(card) {
            var value = parseFloat(String(card.dataset.progresso).replace(",", "."));
            if (isNaN(value)) value = 0;
            value = Math.max(0, Math.min(100, value));

            var track = card.querySelector(".pp-progress-track");
            var fill = card.querySelector(".pp-progress-fill");
            var label = card.querySelector(".pp-progress-label");

            if (track) {
                track.setAttribute("aria-valuenow", String(Math.round(value)));
                track.setAttribute("aria-label", "Progresso do projeto");
            }
            if (label) label.textContent = Math.round(value) + "%";

            // A barra "cresce" uma única vez, quando o painel aparece
            if (fill) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        fill.style.width = value + "%";
                    });
                });
            }
        }

        /* ---------- Integrantes (avatares com iniciais) ---------- */

        function setupTeam(card) {
            var team = card.querySelector(".pp-team");
            if (!team) return;

            // Permite rodar de novo depois de remover alguém
            var oldNone = team.querySelector(".pp-member-none");
            if (oldNone) oldNone.remove();

            var members = Array.prototype.slice.call(team.querySelectorAll(".pp-member"));

            // Remove entradas sem nome
            members = members.filter(function (li) {
                var name = (li.dataset.name || "").trim();
                if (!name) {
                    li.remove();
                    return false;
                }
                li.dataset.name = name;
                return true;
            });

            if (!members.length) {
                var none = document.createElement("li");
                none.className = "pp-member-none";
                none.textContent = "Sem participantes";
                team.appendChild(none);
                return;
            }

            members.forEach(function (li, index) {
                var name = li.dataset.name;
                li.textContent = initials(name);
                li.dataset.tone = tone(name);
                li.title = name;
                li.setAttribute("aria-label", name);
                li.hidden = index >= MAX_AVATARS;
            });

            if (members.length > MAX_AVATARS) {
                var more = document.createElement("li");
                more.className = "pp-member pp-member--more";
                more.textContent = "+" + (members.length - MAX_AVATARS);
                more.title = "Mais " + plural(members.length - MAX_AVATARS, "participante", "participantes");
                team.appendChild(more);
            }
        }

        /* ---------- Distribuição nas faixas ---------- */

        var buckets = { late: [], pending: [], progress: [], done: [], hold: [] };

        cards.forEach(function (card) {
            var deadline = parseDate(card.dataset.prazo);
            var lane = laneFor(card, deadline);

            card.dataset.lane = lane;
            card._deadline = deadline;
            card._title = card.querySelector(".pp-card-title");

            writeDeadline(card, deadline, lane);
            setupProgress(card);
            setupTeam(card);

            // Texto usado na busca (título, descrição e integrantes)
            card._search = normalize(card.textContent);

            buckets[lane].push(card);
        });

        Object.keys(buckets).forEach(function (key) {
            var track = lanes[key] && lanes[key].querySelector(".pp-track");
            if (!track) return;

            buckets[key]
                .sort(function (a, b) {
                    if (a._deadline && b._deadline) return a._deadline - b._deadline;
                    if (a._deadline) return -1;
                    if (b._deadline) return 1;
                    return (a._title ? a._title.textContent : "").localeCompare(
                        b._title ? b._title.textContent : "",
                        "pt-BR"
                    );
                })
                .forEach(function (card) {
                    track.appendChild(card);
                });
        });

        /* ---------- Contadores, faixas vazias e busca ---------- */

        var searchInput = document.getElementById("ppSearch");

        function refresh() {
            var query = normalize(searchInput ? searchInput.value : "");

            Object.keys(lanes).forEach(function (key) {
                var lane = lanes[key];
                var laneCards = Array.prototype.slice.call(lane.querySelectorAll(".pp-card"));
                var visible = 0;

                laneCards.forEach(function (card) {
                    var match = !query || card._search.indexOf(query) !== -1;
                    card.hidden = !match;
                    if (match) visible++;
                });

                var count = lane.querySelector(".pp-lane-count");
                var empty = lane.querySelector(".pp-lane-empty");

                if (count) count.textContent = String(visible);

                if (empty) {
                    empty.hidden = visible > 0;
                    empty.textContent = laneCards.length && query
                        ? "Nenhum projeto encontrado nesta situação."
                        : "Nenhum projeto nesta situação.";
                }

                // Faixa opcional (Pausados) só aparece se tiver algum projeto
                if (lane.hasAttribute("data-hide-empty")) {
                    lane.hidden = laneCards.length === 0;
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener("input", refresh);
            searchInput.addEventListener("search", refresh);
        }

        refresh();

        /* ---------- Modal de participantes ---------- */

        var modal = document.getElementById("ppMembersModal");
        if (!modal) return;

        var dialog = modal.querySelector(".pp-modal__content");
        var closeBtn = document.getElementById("ppModalClose");
        var eyebrow = modal.querySelector(".pp-modal__eyebrow");
        var membersBox = document.getElementById("ppModalMembers");
        var lastFocused = null;

        function showModalError(message) {
            var old = membersBox.querySelector(".pp-modal__error");
            if (old) old.remove();
            if (!message) return;

            var p = document.createElement("p");
            p.className = "pp-modal__error";
            p.setAttribute("role", "alert");
            p.textContent = message;
            membersBox.insertBefore(p, membersBox.firstChild);
        }

        function deleteMember(card, item, button) {
            var url = item.dataset.deleteUrl;
            var name = item.dataset.name;

            if (!url) {
                showModalError("Não foi possível identificar este participante.");
                return;
            }

            if (!window.confirm("Remover " + name + " deste projeto?")) return;

            button.disabled = true;
            showModalError("");

            fetch(url, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                    "X-Requested-With": "XMLHttpRequest",
                    "Accept": "application/json"
                }
            })
                .then(function (response) {
                    if (!response.ok) throw new Error("http " + response.status);
                    return response.json();
                })
                .then(function (data) {
                    if (!data || !data.ok) throw new Error("resposta inesperada");

                    // Atualiza o cartão (avatares, "+N", busca) e a lista do modal
                    item.remove();
                    setupTeam(card);
                    card._search = normalize(card.textContent);
                    renderMembers(card);

                    if (closeBtn) closeBtn.focus();
                })
                .catch(function () {
                    button.disabled = false;
                    showModalError("Não foi possível remover o participante. Atualize a página e tente novamente.");
                });
        }

        function renderMembers(card) {
            membersBox.textContent = "";

            var items = card ? card.querySelectorAll(".pp-member[data-name]") : [];

            if (!items.length) {
                var empty = document.createElement("p");
                empty.className = "pp-modal__empty";
                empty.textContent = "Nenhum participante associado a este projeto ainda.";
                membersBox.appendChild(empty);
                return;
            }

            var list = document.createElement("ul");
            list.className = "pp-modal__list";

            Array.prototype.forEach.call(items, function (item) {
                var name = item.dataset.name;

                var li = document.createElement("li");
                li.className = "pp-modal__member";

                var avatar = document.createElement("span");
                avatar.className = "pp-modal__avatar";
                avatar.dataset.tone = tone(name);
                avatar.setAttribute("aria-hidden", "true");
                avatar.textContent = initials(name);

                var label = document.createElement("span");
                label.className = "pp-modal__name";
                label.textContent = name;

                var remove = document.createElement("button");
                remove.type = "button";
                remove.className = "pp-modal__remove";
                remove.title = "Remover do projeto";
                remove.setAttribute("aria-label", "Remover " + name + " do projeto");
                remove.innerHTML =
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>';
                remove.addEventListener("click", function () {
                    deleteMember(card, item, remove);
                });

                li.appendChild(avatar);
                li.appendChild(label);
                li.appendChild(remove);
                list.appendChild(li);
            });

            membersBox.appendChild(list);
        }

        function openModal(button) {
            var id = button.dataset.projectId;
            var name = button.dataset.projectName || "Projeto";
            var card = null;

            cards.forEach(function (c) {
                if (c.dataset.id === id) card = c;
            });

            lastFocused = button;
            if (eyebrow) eyebrow.textContent = name;
            renderMembers(card);

            modal.hidden = false;
            modal.setAttribute("aria-hidden", "false");
            document.documentElement.classList.add("pp-modal-open");

            if (closeBtn) closeBtn.focus();
        }

        function closeModal() {
            modal.hidden = true;
            modal.setAttribute("aria-hidden", "true");
            document.documentElement.classList.remove("pp-modal-open");

            if (lastFocused) lastFocused.focus();
        }

        // Abrir (delegação: funciona mesmo com os cartões movidos de lugar)
        document.addEventListener("click", function (event) {
            var button = event.target.closest(".pp-show-members-btn");
            if (button) {
                openModal(button);
                return;
            }

            if (!modal.hidden && event.target.closest("[data-modal-close]")) {
                closeModal();
            }
        });

        if (closeBtn) closeBtn.addEventListener("click", closeModal);

        // Esc fecha; Tab fica preso dentro do modal
        document.addEventListener("keydown", function (event) {
            if (modal.hidden) return;

            if (event.key === "Escape") {
                event.preventDefault();
                closeModal();
                return;
            }

            if (event.key !== "Tab") return;

            var focusable = dialog.querySelectorAll(
                "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
            );
            if (!focusable.length) return;

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    });
})();