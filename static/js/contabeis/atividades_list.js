document.addEventListener("DOMContentLoaded", () => {
    function getCookie(name) {
        const match = document.cookie.match(
            new RegExp("(^| )" + name + "=([^;]+)")
        );

        return match ? decodeURIComponent(match[2]) : null;
    }

    const list = document.querySelector(".activity-list");

    if (!list) return;

    const items = Array.from(list.querySelectorAll(".activity-item"));
    const searchInput = document.querySelector(".activity-search");
    const filterChips = Array.from(
        document.querySelectorAll(".activity-filter-chip")
    );
    const emptyState = document.querySelector(".activity-empty-dynamic");

    let activeStatus = "todas";

    /* =====================================================
       Entrada suave dos itens
       ===================================================== */

    items.forEach((item, index) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(6px)";

        setTimeout(() => {
            item.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            item.style.opacity = "1";
            item.style.transform = "translateY(0)";
        }, 50 * index);
    });


    /* =====================================================
       Busca + filtro por status
       ===================================================== */

    function applyFilters() {
        const termo = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        let visiveis = 0;

        items.forEach((item) => {
            const texto = item.dataset.search || "";
            const status = item.dataset.status || "";

            const combinaBusca = !termo || texto.includes(termo);
            const combinaStatus =
                activeStatus === "todas" || status === activeStatus;

            const visivel = combinaBusca && combinaStatus;

            item.classList.toggle("is-hidden", !visivel);

            if (visivel) visiveis += 1;
        });

        if (emptyState) {
            emptyState.style.display = visiveis === 0 ? "block" : "none";
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
    }

    filterChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            filterChips.forEach((c) => c.classList.remove("is-active"));
            chip.classList.add("is-active");
            activeStatus = chip.dataset.status || "todas";
            applyFilters();
        });
    });


    /* =====================================================
       Modal de detalhes / edição / exclusão
       ===================================================== */

    const detailUrlBase = list.dataset.detailUrlBase;
    const updateUrlBase = list.dataset.updateUrlBase;
    const finalizeUrlBase = list.dataset.finalizeUrlBase;
    const deleteUrlBase = list.dataset.deleteUrlBase;

    const overlay = document.getElementById("activityModalOverlay");
    const modal = overlay ? overlay.querySelector(".activity-modal") : null;
    const closeBtn = document.getElementById("activityModalClose");
    const form = document.getElementById("activityModalForm");
    const saveBtn = document.getElementById("activityModalSave");
    const modalFinalizeBtn = document.getElementById("activityModalFinalize");
    const deleteBtn = document.getElementById("activityModalDelete");
    const generalError = document.getElementById("activityModalGeneralError");

    const fieldTitulo = document.getElementById("modalTitulo");
    const fieldDisciplina = document.getElementById("modalDisciplina");
    const fieldTipo = document.getElementById("modalTipo");
    const fieldPrazo = document.getElementById("modalPrazo");
    const fieldPrioridade = document.getElementById("modalPrioridade");
    const fieldStatus = document.getElementById("modalStatus");
    const fieldDescricao = document.getElementById("modalDescricao");
    const fieldObservacoes = document.getElementById("modalObservacoes");

    let currentId = null;
    let lastFocusedEl = null;

    function urlFor(base, id) {
        return base.replace("/0/", `/${id}/`);
    }

    function fillSelect(selectEl, options, selectedValue) {
        selectEl.innerHTML = "";
        options.forEach(([value, label]) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = label;
            if (value === selectedValue) opt.selected = true;
            selectEl.appendChild(opt);
        });
    }

    function clearErrors() {
        form.querySelectorAll(".field-error").forEach((el) => {
            el.textContent = "";
        });
        form.querySelectorAll(".form-field").forEach((el) => {
            el.classList.remove("has-error");
        });
        if (generalError) {
            generalError.hidden = true;
            generalError.textContent = "";
        }
    }

    function showGeneralError(message) {
        if (!generalError) return;
        generalError.hidden = false;
        generalError.textContent = message;
    }

    async function openModal(id) {
        if (!overlay) return;

        currentId = id;
        lastFocusedEl = document.activeElement;
        clearErrors();

        try {
            const response = await fetch(urlFor(detailUrlBase, id));
            if (!response.ok) throw new Error("Falha ao carregar atividade");
            const data = await response.json();

            fieldTitulo.value = data.titulo;
            fieldPrazo.value = data.prazo;
            fieldDescricao.value = data.descricao || "";
            fieldObservacoes.value = data.observacoes || "";

            fillSelect(
                fieldDisciplina,
                data.disciplinas.map((d) => [d.id, d.nome]),
                data.disciplina_id
            );
            fillSelect(fieldTipo, data.choices.tipo, data.tipo);
            fillSelect(fieldPrioridade, data.choices.prioridade, data.prioridade);
            fillSelect(fieldStatus, data.choices.status, data.status);
            if (modalFinalizeBtn) {
                modalFinalizeBtn.hidden = data.status === "concluida";
                modalFinalizeBtn.disabled = false;
                modalFinalizeBtn.textContent = "Finalizar";
            }

            overlay.hidden = false;
            requestAnimationFrame(() => overlay.classList.add("is-open"));
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", onKeydown);
            overlay.addEventListener("click", onOverlayClick);

            setTimeout(() => fieldTitulo.focus(), 200);
        } catch (err) {
            console.error("Erro ao abrir modal:", err);
            currentId = null;
        }
    }

    function closeModal() {
        if (!overlay) return;

        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKeydown);
        overlay.removeEventListener("click", onOverlayClick);

        setTimeout(() => {
            overlay.hidden = true;
        }, 200);

        currentId = null;
        if (lastFocusedEl) lastFocusedEl.focus();
    }

    function onOverlayClick(event) {
        if (event.target === overlay) closeModal();
    }

    function onKeydown(event) {
        if (event.key === "Escape") {
            closeModal();
            return;
        }
        if (event.key === "Tab" && modal) trapFocus(event);
    }

    function trapFocus(event) {
        const focusable = modal.querySelectorAll(
            "button:not([hidden]):not([disabled]), input, select, textarea"
        );
        const visible = Array.from(focusable).filter((el) => el.offsetParent !== null);
        if (!visible.length) return;

        const first = visible[0];
        const last = visible[visible.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    items.forEach((item) => {
        item.addEventListener("click", () => openModal(item.dataset.id));
        item.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openModal(item.dataset.id);
            }
        });
    });

    function updateItemStatus(item, activity) {
        if (!activity || !activity.status) return;

        item.dataset.status = activity.status;

        const tag = item.querySelector(".activity-status");
        if (!tag) return;

        tag.className = `activity-status activity-status--${activity.status}`;
        if (activity.status_display) {
            tag.textContent = activity.status_display;
        }
    }

    /* =====================================================
       Finalizar direto pela lista
       ===================================================== */

    list.querySelectorAll("[data-finalize-activity]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();

            const item = button.closest(".activity-item");
            if (!item || !finalizeUrlBase) return;

            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = "Finalizando...";

            try {
                const response = await fetch(urlFor(finalizeUrlBase, item.dataset.id), {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                });
                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error("Falha ao finalizar atividade");
                }

                updateItemStatus(item, data.atividade);
                button.remove();
                applyFilters();
            } catch (err) {
                console.error("Erro ao finalizar atividade:", err);
                button.disabled = false;
                button.textContent = originalText;
                window.alert("Não foi possível finalizar a atividade. Tente novamente.");
            }
        });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    /* =====================================================
       Finalizar pelo modal
       ===================================================== */

    if (modalFinalizeBtn) {
        modalFinalizeBtn.addEventListener("click", async () => {
            if (!currentId || !finalizeUrlBase) return;

            modalFinalizeBtn.disabled = true;
            const originalText = modalFinalizeBtn.textContent;
            modalFinalizeBtn.textContent = "Finalizando...";

            try {
                const response = await fetch(urlFor(finalizeUrlBase, currentId), {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                });
                const data = await response.json();

                if (!response.ok || !data.ok) {
                    throw new Error("Falha ao finalizar atividade");
                }

                fieldStatus.value = data.atividade.status;
                modalFinalizeBtn.disabled = false;
                modalFinalizeBtn.textContent = originalText;
                modalFinalizeBtn.hidden = true;
                const item = list.querySelector(`.activity-item[data-id="${currentId}"]`);
                if (item) {
                    updateItemStatus(item, data.atividade);
                    item.querySelector("[data-finalize-activity]")?.remove();
                }
                applyFilters();
            } catch (err) {
                console.error("Erro ao finalizar atividade pelo modal:", err);
                modalFinalizeBtn.disabled = false;
                modalFinalizeBtn.textContent = originalText;
                showGeneralError("Não foi possível finalizar a atividade. Tente novamente.");
            }
        });
    }

    /* =====================================================
       Salvar alterações (CORRIGIDO)
       A parte de rede fica separada da atualização visual,
       assim uma falha no DOM não vira "erro ao salvar".
       ===================================================== */

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!currentId) return;

            clearErrors();
            saveBtn.disabled = true;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Salvando...";

            // 1) Requisição: somente aqui um erro significa "não salvou"
            let data;
            try {
                const response = await fetch(urlFor(updateUrlBase, currentId), {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                    body: new FormData(form),
                });
                data = await response.json();
            } catch (err) {
                console.error("Erro de rede/JSON ao salvar:", err);
                showGeneralError("Não foi possível salvar agora. Tente novamente.");
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
                return;
            }

            saveBtn.disabled = false;
            saveBtn.textContent = originalText;

            // 2) Resposta do servidor
            if (data.ok) {
                // Já salvou no servidor: falha visual não deve mostrar erro de salvamento
                try {
                    const a = data.atividade || {};
                    const item = list.querySelector(
                        `.activity-item[data-id="${currentId}"]`
                    );

                    if (item) {
                        const titleEl = item.querySelector(".activity-title");
                        const prazoEl = item.querySelector(".activity-item-prazo");

                        if (titleEl && a.titulo) titleEl.textContent = a.titulo;
                        if (prazoEl && a.prazo_exibicao) {
                            prazoEl.textContent = a.prazo_exibicao;
                        }

                        item.dataset.search =
                            `${(a.titulo || "").toLowerCase()} ${(a.disciplina_nome || "").toLowerCase()}`.trim();

                        updateItemStatus(item, a);

                        if (a.status === "concluida") {
                            item.querySelector("[data-finalize-activity]")?.remove();
                        }
                    }
                } catch (err) {
                    console.error("Salvou, mas falhou ao atualizar a lista:", err);
                }

                closeModal();
                applyFilters();
            } else {
                Object.entries(data.errors || {}).forEach(([campo, mensagens]) => {
                    const errorEl = form.querySelector(`[data-error-for="${campo}"]`);
                    if (errorEl) {
                        errorEl.textContent = mensagens[0];
                        const field = errorEl.closest(".form-field");
                        if (field) field.classList.add("has-error");
                    }
                });
                showGeneralError("Confira os campos destacados abaixo.");
            }
        });
    }

    /* =====================================================
       Excluir
       ===================================================== */

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (!currentId) return;
            if (!window.confirm("Excluir esta atividade? Essa ação não pode ser desfeita.")) return;

            deleteBtn.disabled = true;

            try {
                const response = await fetch(urlFor(deleteUrlBase, currentId), {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                });
                const data = await response.json();

                if (data.ok) {
                    const item = list.querySelector(`.activity-item[data-id="${currentId}"]`);
                    if (item) item.remove();
                    closeModal();
                }
            } catch (err) {
                console.error("Erro ao excluir atividade:", err);
                showGeneralError("Não foi possível excluir agora. Tente novamente.");
            } finally {
                deleteBtn.disabled = false;
            }
        });
    }
});