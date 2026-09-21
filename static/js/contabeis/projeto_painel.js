document.addEventListener("DOMContentLoaded", () => {
    const board = document.getElementById("ppBoard");
    const pool = document.querySelector("[data-pool]");
    if (!board || !pool) return;

    const MAX_MEMBERS = 4; // avatares visíveis por cartão; o resto vira "+N"

    const searchInput = document.getElementById("ppSearch");
    const cards = Array.from(pool.querySelectorAll(".pp-card"));

    // Faixas indexadas por data-lane (late, pending, progress, done, hold)
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
       Utilitários
       ===================================================== */

    function normalize(text) {
        return (text || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function parseISODate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
        if (!match) return null;
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    function clampProgress(value) {
        const number = parseFloat(String(value).replace(",", "."));
        if (Number.isNaN(number)) return 0;
        return Math.min(100, Math.max(0, Math.round(number)));
    }

    // Classifica o status em um "tom" sem depender dos valores exatos do seu model
    function toneFromStatus(card) {
        const label = card.querySelector(".pp-status")?.textContent || "";
        const text = normalize(`${card.dataset.status || ""} ${label}`);

        if (/conclu|finaliz|entreg|complet|done/.test(text)) return "done";
        if (/andamento|progress|execu|ativo|desenvolv/.test(text)) return "progress";
        if (/paus|paralis|suspens|cancel|arquiv/.test(text)) return "hold";
        return "pending";
    }

    function deadlineInfo(prazo, today) {
        const days = Math.round((prazo - today) / 86400000);

        if (days < 0) {
            const abs = Math.abs(days);
            return {
                urgency: "late",
                text: `Atrasado há ${abs} ${abs === 1 ? "dia" : "dias"}`,
            };
        }
        if (days === 0) return { urgency: "soon", text: "Vence hoje" };
        if (days === 1) return { urgency: "soon", text: "Vence amanhã" };
        if (days <= 7) return { urgency: "soon", text: `Vence em ${days} dias` };
        return { urgency: "", text: "" };
    }

    function initials(name) {
        const parts = (name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        const first = parts[0][0];
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (first + last).toUpperCase();
    }


    /* =====================================================
       Preparação de cada cartão
       ===================================================== */

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function buildTeam(card) {
        const team = card.querySelector(".pp-team");
        if (!team) return;

        const members = Array.from(team.querySelectorAll(".pp-member"));

        members.forEach((member, index) => {
            const name = member.dataset.name || "";
            member.textContent = initials(name);
            member.title = name;
            member.setAttribute("aria-label", name);
            if (index >= MAX_MEMBERS) member.hidden = true;
        });

        if (members.length > MAX_MEMBERS) {
            const extra = members.slice(MAX_MEMBERS);
            const more = document.createElement("li");
            more.className = "pp-member pp-member--more";
            more.textContent = `+${extra.length}`;
            more.title = extra.map((m) => m.dataset.name).join(", ");
            more.setAttribute("aria-label", `Mais ${extra.length}: ${more.title}`);
            team.appendChild(more);
        }

        team.classList.toggle("is-empty", members.length === 0);
    }

    function prepareCard(card) {
        const tone = toneFromStatus(card);
        let laneKey = tone;

        // Prazo
        const prazo = parseISODate(card.dataset.prazo);
        const deadlineEl = card.querySelector(".pp-deadline");
        const isOpen = tone !== "done" && tone !== "hold";

        if (prazo && isOpen) {
            const info = deadlineInfo(prazo, today);
            if (info.urgency) card.dataset.urgency = info.urgency;
            if (deadlineEl) deadlineEl.textContent = info.text;

            // Prazo vencido e não concluído: vai para a faixa de atrasados
            if (info.urgency === "late") laneKey = "late";
        }

        card.dataset.lane = lanes[laneKey] ? laneKey : "pending";

        // Progresso
        const progress = clampProgress(card.dataset.progresso);
        const fill = card.querySelector(".pp-progress-fill");
        const label = card.querySelector(".pp-progress-label");
        const track = card.querySelector(".pp-progress-track");

        if (label) label.textContent = `${progress}%`;
        if (track) track.setAttribute("aria-valuenow", String(progress));
        if (fill) {
            requestAnimationFrame(() => {
                fill.style.width = `${progress}%`;
            });
        }

        // Texto normalizado para a busca
        const nome = card.querySelector(".pp-card-title")?.textContent || "";
        const desc = card.querySelector(".pp-card-desc")?.textContent || "";
        card.dataset.search = normalize(`${nome} ${desc}`);

        buildTeam(card);
    }

    cards.forEach(prepareCard);


    /* =====================================================
       Distribui os cartões nas faixas
       (prazo mais próximo primeiro; sem prazo por último)
       ===================================================== */

    cards
        .slice()
        .sort((a, b) =>
            (a.dataset.prazo || "9999-99-99").localeCompare(b.dataset.prazo || "9999-99-99")
        )
        .forEach((card) => {
            lanes[card.dataset.lane].track.appendChild(card);
        });


    /* =====================================================
       Contadores, faixas vazias e busca
       ===================================================== */

    function updateLanes() {
        const termo = normalize(searchInput ? searchInput.value : "");
        const totals = {};
        const visibles = {};

        cards.forEach((card) => {
            const key = card.dataset.lane;
            const combina = !termo || card.dataset.search.includes(termo);

            totals[key] = (totals[key] || 0) + 1;
            card.hidden = !combina;
            if (combina) visibles[key] = (visibles[key] || 0) + 1;
        });

        Object.entries(lanes).forEach(([key, lane]) => {
            const total = totals[key] || 0;
            const visible = visibles[key] || 0;

            lane.count.textContent = String(visible);

            if (lane.empty) {
                lane.empty.hidden = visible !== 0;
                lane.empty.textContent =
                    total && !visible
                        ? "Nenhum resultado para a busca."
                        : "Nenhum projeto nesta situação.";
            }

            // Faixa opcional (Pausados) só aparece se houver projetos nela
            lane.el.hidden = lane.hideEmpty && total === 0;
        });
    }

    if (searchInput) searchInput.addEventListener("input", updateLanes);

    updateLanes();
});