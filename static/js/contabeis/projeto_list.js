document.addEventListener("DOMContentLoaded", () => {
    const table = document.querySelector(".proj-table");
    if (!table) return;

    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll(".proj-row"));
    const originalOrder = rows.slice();

    const searchInput = document.querySelector(".proj-search");
    const statusFilter = document.querySelector(".proj-status-filter");
    const emptyState = document.querySelector(".proj-empty-dynamic");
    const visibleCountEl = document.querySelector("[data-visible-count]");
    const sortButtons = Array.from(table.querySelectorAll(".proj-sort"));

    /* =====================================================
       Utilitários
       ===================================================== */

    // Estava faltando: o submit do modal chamava getCookie sem ela existir
    function getCookie(name) {
        const match = document.cookie.match(
            new RegExp("(^| )" + name + "=([^;]+)")
        );
        return match ? decodeURIComponent(match[2]) : null;
    }

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

    // Classifica o status em um "tom" independente dos valores exatos do seu model
    function toneFromStatus(row) {
        const label = row.querySelector(".proj-status")?.textContent || "";
        const text = normalize(`${row.dataset.status || ""} ${label}`);

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


    /* =====================================================
       Enriquecimento de uma linha (status, progresso, prazo)
       Em função própria para ser reaplicada após salvar no modal
       ===================================================== */

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function enhanceRow(row) {
        // Situação
        const tone = toneFromStatus(row);
        row.dataset.tone = tone;

        // Progresso
        const progress = clampProgress(row.dataset.progresso);
        row.dataset.progresso = String(progress);

        const fill = row.querySelector(".proj-progress-fill");
        const label = row.querySelector(".proj-progress-label");
        const track = row.querySelector(".proj-progress-track");

        if (label) label.textContent = `${progress}%`;
        if (track) track.setAttribute("aria-valuenow", String(progress));
        if (fill) {
            requestAnimationFrame(() => {
                fill.style.width = `${progress}%`;
            });
        }

        // Prazo
        const prazo = parseISODate(row.dataset.prazo);
        const deadlineEl = row.querySelector(".proj-deadline");
        const isOpen = tone !== "done" && tone !== "hold";
        let late = false;

        delete row.dataset.urgency;
        if (deadlineEl) deadlineEl.textContent = "";

        if (prazo && isOpen) {
            const info = deadlineInfo(prazo, today);
            late = info.urgency === "late";

            if (info.urgency) row.dataset.urgency = info.urgency;
            if (deadlineEl) deadlineEl.textContent = info.text;
        }

        row.dataset.late = late ? "true" : "false";

        // Texto normalizado para a busca
        const nome = row.querySelector(".proj-name")?.textContent || "";
        const desc = row.querySelector(".proj-desc")?.textContent || "";
        row.dataset.search = normalize(`${nome} ${desc}`);
    }

    rows.forEach(enhanceRow);


    /* =====================================================
       Totais no topo
       ===================================================== */

    function updateSummary() {
        const counts = {
            total: rows.length,
            progress: rows.filter((r) => r.dataset.tone === "progress").length,
            done: rows.filter((r) => r.dataset.tone === "done").length,
            late: rows.filter((r) => r.dataset.late === "true").length,
        };

        Object.entries(counts).forEach(([key, value]) => {
            const el = document.querySelector(`[data-count="${key}"]`);
            if (el) el.textContent = String(value);
        });

        const lateEl = document.querySelector('[data-count="late"]');
        if (lateEl) lateEl.classList.toggle("has-late", counts.late > 0);
    }

    updateSummary();


    /* =====================================================
       Busca + filtro por situação
       ===================================================== */

    function applyFilters() {
        const termo = normalize(searchInput ? searchInput.value : "");
        const filtro = statusFilter ? statusFilter.value : "todos";

        let visiveis = 0;

        rows.forEach((row) => {
            const combinaBusca = !termo || row.dataset.search.includes(termo);

            let combinaStatus = true;
            if (filtro === "late") {
                combinaStatus = row.dataset.late === "true";
            } else if (filtro !== "todos") {
                combinaStatus = row.dataset.tone === filtro;
            }

            const visivel = combinaBusca && combinaStatus;
            row.hidden = !visivel;
            if (visivel) visiveis += 1;
        });

        if (visibleCountEl) visibleCountEl.textContent = String(visiveis);
        if (emptyState) emptyState.hidden = visiveis !== 0;
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);


    /* =====================================================
       Ordenação por coluna (asc → desc → ordem original)
       ===================================================== */

    function valueFor(row, key) {
        if (key === "nome") return row.dataset.nome || "";
        if (key === "prazo") return row.dataset.prazo || null;
        if (key === "progresso") return Number(row.dataset.progresso) || 0;
        return null;
    }

    function sortRows(key, direction) {
        let ordered;

        if (!direction) {
            ordered = originalOrder.slice();
        } else {
            const factor = direction === "ascending" ? 1 : -1;

            ordered = rows.slice().sort((a, b) => {
                const va = valueFor(a, key);
                const vb = valueFor(b, key);

                // Valores vazios sempre por último
                if (va === null && vb === null) return 0;
                if (va === null) return 1;
                if (vb === null) return -1;

                if (typeof va === "number") return (va - vb) * factor;
                return va.localeCompare(vb, "pt-BR") * factor;
            });
        }

        ordered.forEach((row) => tbody.appendChild(row));
    }

    sortButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const th = button.closest("th");
            const key = button.dataset.sort;
            const current = th.getAttribute("aria-sort");

            let next = "ascending";
            if (current === "ascending") next = "descending";
            else if (current === "descending") next = null;

            // Só uma coluna ordenada por vez
            table.querySelectorAll("th[aria-sort]").forEach((other) => {
                other.setAttribute("aria-sort", "none");
            });

            th.setAttribute("aria-sort", next || "none");
            sortRows(key, next);
        });
    });

    applyFilters();




    /* =====================================================
       Excluir projeto
       COLE ESTE BLOCO logo depois do "applyFilters();" e
       ANTES da seção "Editar projeto (modal)"
       ===================================================== */

    // Tira a linha da tela e dos arrays usados pelos totais, filtros e ordenação
    function removeRow(row) {
        [rows, originalOrder].forEach((list) => {
            const index = list.indexOf(row);
            if (index !== -1) list.splice(index, 1);
        });

        row.remove();

        // Era o último projeto: recarrega para mostrar o estado vazio do template
        if (!rows.length) {
            window.location.reload();
            return;
        }

        const totalEl = document.querySelector("[data-total-count]");
        if (totalEl) totalEl.textContent = String(rows.length);

        updateSummary();
        applyFilters();
    }

    document.querySelectorAll("[data-delete-projeto]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();

            const row = button.closest(".proj-row");
            const url = row ? row.dataset.deleteUrl : null;
            if (!row || !url) return;

            const nome = row.querySelector(".proj-name")?.textContent.trim() || "este projeto";
            if (!window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = "Excluindo...";

            // 1) Requisição: só aqui um erro significa "não excluiu"
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                });
                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error("Falha ao excluir projeto");
                }
            } catch (err) {
                console.error("Erro ao excluir projeto:", err);
                button.disabled = false;
                button.textContent = originalText;
                window.alert("Não foi possível excluir o projeto. Tente novamente.");
                return;
            }

            // 2) Excluiu no servidor: agora só atualiza a tela
            removeRow(row);
        });
    });


    /* =====================================================
       Editar projeto (modal)
       ===================================================== */

    const projModal = document.getElementById("projModal");
    const projEditForm = document.getElementById("projEditForm");

    if (!projModal || !projEditForm) {
        console.error("Modal de projeto não encontrado no HTML (#projModal / #projEditForm).");
        return;
    }

    const projEditFormErr = document.getElementById("projEditFormError");
    const projEditSubmit = document.getElementById("projEditSubmit");
    const fieldNome = document.getElementById("projEditNome");
    const fieldPrazo = document.getElementById("projEditPrazo");

    let currentUpdateUrl = null;
    let currentRow = null;
    let lastFocusedEl = null;

    function openProjModal(row, trigger) {
        currentRow = row;
        currentUpdateUrl = row.dataset.updateUrl;
        lastFocusedEl = trigger || document.activeElement;

        document.getElementById("projEditId").value = row.dataset.id || "";
        fieldNome.value = row.dataset.nome || "";
        document.getElementById("projEditDescricao").value = row.dataset.descricao || "";
        fieldPrazo.value = row.dataset.prazoInput || "";
        document.getElementById("projEditStatus").value = row.dataset.status || "";
        document.getElementById("projEditFeitos").value = row.dataset.feitos || 0;

        clearProjFormErrors();
        projModal.hidden = false;
        document.body.style.overflow = "hidden";
        fieldNome.focus();
    }

    function closeProjModal() {
        projModal.hidden = true;
        document.body.style.overflow = "";
        currentUpdateUrl = null;
        currentRow = null;
        if (lastFocusedEl) lastFocusedEl.focus();
    }

    function clearProjFormErrors() {
        projEditFormErr.hidden = true;
        projEditFormErr.textContent = "";
        projEditForm.querySelectorAll("[data-error-for]").forEach((el) => {
            el.textContent = "";
        });
    }

    // Aceita erros como lista de textos ou lista de objetos {message}
    function messageText(value) {
        const list = Array.isArray(value) ? value : [value];
        return list
            .map((item) => (item && typeof item === "object" ? item.message : item))
            .filter(Boolean)
            .join(" ");
    }

    function showProjFormErrors(erros) {
        clearProjFormErrors();

        Object.entries(erros).forEach(([campo, mensagens]) => {
            const alvo = projEditForm.querySelector(`[data-error-for="${campo}"]`);
            const texto = messageText(mensagens);

            if (alvo) {
                alvo.textContent = texto;
            } else {
                projEditFormErr.hidden = false;
                projEditFormErr.textContent += texto + " ";
            }
        });

        if (!projEditFormErr.textContent && !Object.keys(erros).length) {
            projEditFormErr.hidden = false;
            projEditFormErr.textContent = "Confira os campos e tente novamente.";
        }
    }

    // Reflete na linha o que a view devolveu (e o prazo que foi enviado)
    function applyProjectToRow(row, p, prazoValue) {
        row.dataset.nome = p.nome;
        row.dataset.descricao = p.descricao || "";
        row.dataset.status = p.status;
        row.dataset.feitos = p.feitos ?? 0;
        row.dataset.progresso = p.progresso ?? 0;

        // A view não devolve o prazo, então usamos o valor do formulário
        const prazoIso = (prazoValue || "").slice(0, 10);
        const [ano, mes, dia] = prazoIso.split("-");
        row.dataset.prazo = prazoIso;
        row.dataset.prazoInput = (prazoValue || "").slice(0, 16);

        const dateEl = row.querySelector(".proj-date");
        if (dateEl) dateEl.textContent = ano && mes && dia ? `${dia}/${mes}/${ano}` : "";

        const nameEl = row.querySelector(".proj-name");
        if (nameEl) nameEl.textContent = p.nome;

        // A descrição pode não existir na linha se estava vazia antes
        let descEl = row.querySelector(".proj-desc");
        if (p.descricao) {
            if (!descEl) {
                descEl = document.createElement("span");
                descEl.className = "proj-desc";
                row.querySelector(".col-name").appendChild(descEl);
            }
            descEl.textContent = p.descricao;
        } else if (descEl) {
            descEl.remove();
        }

        const statusEl = row.querySelector(".proj-status");
        if (statusEl) statusEl.textContent = p.status_display || p.status;

        // Recalcula cor da situação, barra, prazo, busca e totais
        enhanceRow(row);
        updateSummary();
        applyFilters();
    }

    document.querySelectorAll("[data-edit-projeto]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const row = button.closest(".proj-row");
            if (row) openProjModal(row, button);
        });
    });

    projModal.querySelectorAll("[data-modal-close]").forEach((el) => {
        el.addEventListener("click", closeProjModal);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !projModal.hidden) closeProjModal();
    });

    projEditForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUpdateUrl) return;

        const row = currentRow;
        const prazoValue = fieldPrazo.value;

        clearProjFormErrors();
        projEditSubmit.disabled = true;
        const originalLabel = projEditSubmit.textContent;
        projEditSubmit.textContent = "Salvando...";

        function resetSubmit() {
            projEditSubmit.disabled = false;
            projEditSubmit.textContent = originalLabel;
        }

        // 1) Requisição: só aqui um erro significa "não salvou"
        let data;
        try {
            const response = await fetch(currentUpdateUrl, {
                method: "POST",
                headers: { "X-CSRFToken": getCookie("csrftoken") },
                body: new FormData(projEditForm),
            });
            data = await response.json();
        } catch (err) {
            console.error("Erro de rede/JSON ao salvar projeto:", err);
            projEditFormErr.hidden = false;
            projEditFormErr.textContent = "Não foi possível salvar. Tente novamente.";
            resetSubmit();
            return;
        }

        resetSubmit();

        // 2) Resposta da view
        if (!data.ok) {
            showProjFormErrors(data.erros || data.errors || {});
            return;
        }

        // Já salvou: falha visual não deve virar "erro ao salvar"
        try {
            if (row && data.projeto) applyProjectToRow(row, data.projeto, prazoValue);
        } catch (err) {
            console.error("Salvou, mas falhou ao atualizar a linha:", err);
        }

        closeProjModal();
    });
});