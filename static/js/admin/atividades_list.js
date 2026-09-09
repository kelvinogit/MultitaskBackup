document.addEventListener("DOMContentLoaded", () => {
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
        form.querySelectorAll(".activity-modal-field-error").forEach((el) => {
            el.textContent = "";
        });
        form.querySelectorAll(".activity-modal-field").forEach((el) => {
            el.classList.remove("has-error");
        });
        if (generalError) {
            generalError.hidden = true;
            generalError.textContent = "";
        }
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
        item.dataset.status = activity.status;

        const tag = item.querySelector(".activity-status-tag");
        tag.className = `activity-status-tag activity-status-tag--${activity.status}`;
        tag.textContent = activity.status_display;
    }

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
                button.disabled = false;
                button.textContent = originalText;
                window.alert("Não foi possível finalizar a atividade. Tente novamente.");
            }
        });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeModal);

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
                modalFinalizeBtn.disabled = false;
                modalFinalizeBtn.textContent = originalText;
                if (generalError) {
                    generalError.hidden = false;
                    generalError.textContent = "Não foi possível finalizar a atividade. Tente novamente.";
                }
            }
        });
    }

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!currentId) return;

            clearErrors();
            saveBtn.disabled = true;
            const originalText = saveBtn.textContent;
            saveBtn.textContent = "Salvando...";

            try {
                const response = await fetch(urlFor(updateUrlBase, currentId), {
                    method: "POST",
                    headers: { "X-CSRFToken": getCookie("csrftoken") },
                    body: new FormData(form),
                });
                const data = await response.json();

                if (data.ok) {
                    const item = list.querySelector(`.activity-item[data-id="${currentId}"]`);
                    if (item) {
                        item.querySelector(".activity-item-title").textContent = data.atividade.titulo;
                        item.querySelector(".activity-item-prazo").textContent = data.atividade.prazo_exibicao;
                        item.dataset.search = `${data.atividade.titulo.toLowerCase()} ${data.atividade.disciplina_nome.toLowerCase()}`;
                        updateItemStatus(item, data.atividade);
                        if (data.atividade.status === "concluida") {
                            item.querySelector("[data-finalize-activity]")?.remove();
                        }
                    }
                    closeModal();
                    applyFilters();
                } else {
                    Object.entries(data.errors || {}).forEach(([campo, mensagens]) => {
                        const errorEl = form.querySelector(`[data-error-for="${campo}"]`);
                        if (errorEl) {
                            errorEl.textContent = mensagens[0];
                            errorEl.closest(".activity-modal-field").classList.add("has-error");
                        }
                    });
                    if (generalError) {
                        generalError.hidden = false;
                        generalError.textContent = "Confira os campos destacados abaixo.";
                    }
                }
            } catch (err) {
                if (generalError) {
                    generalError.hidden = false;
                    generalError.textContent = "Não foi possível salvar agora. Tente novamente.";
                }
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        });
    }

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
            } finally {
                deleteBtn.disabled = false;
            }
        });
    }
});
