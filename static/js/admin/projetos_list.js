document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector(".project-list");

    if (!list) return;

    const items = Array.from(list.querySelectorAll(".project-item"));
    const filterChips = Array.from(
        document.querySelectorAll(".project-filter-chip")
    );
    const emptyState = document.querySelector(".project-empty-dynamic");

    let activeStatus = "todos";

    /* =====================================================
       Entrada suave + animação da barra de progresso
       ===================================================== */

    items.forEach((item, index) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(6px)";

        const fill = item.querySelector(".project-progress-fill");
        const alvo = fill ? fill.dataset.progress || "0" : "0";

        setTimeout(() => {
            item.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            item.style.opacity = "1";
            item.style.transform = "translateY(0)";

            if (fill) {
                // pequeno delay extra pra transição de width disparar
                setTimeout(() => {
                    fill.style.width = `${alvo}%`;
                }, 80);
            }
        }, 60 * index);
    });


    /* =====================================================
       Filtro por status
       ===================================================== */

    function applyFilter() {
        let visiveis = 0;

        items.forEach((item) => {
            const status = item.dataset.status || "";
            const visivel = activeStatus === "todos" || status === activeStatus;

            item.classList.toggle("is-hidden", !visivel);

            if (visivel) visiveis += 1;
        });

        if (emptyState) {
            emptyState.style.display = visiveis === 0 ? "block" : "none";
        }
    }

    filterChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            filterChips.forEach((c) => c.classList.remove("is-active"));
            chip.classList.add("is-active");
            activeStatus = chip.dataset.status || "todos";
            applyFilter();
        });
    });

    const modal = document.querySelector("#project-edit-modal");
    const editForm = document.querySelector("#project-edit-form");
    const modalError = document.querySelector("#project-modal-error");

    let editingButton = null;

    function openEditModal(button) {
        editingButton = button;

        editForm.elements.nome.value = button.dataset.nome || "";
        editForm.elements.status.value = button.dataset.status || "";
        editForm.elements.descricao.value = button.dataset.descricao || "";
        editForm.elements.feitos.value = button.dataset.feitos || "";

        modal.hidden = false;
        modalError.hidden = true;
        editForm.elements.nome.focus();
    }

    function closeEditModal() {
        modal.hidden = true;
        editingButton = null;
    }

    document.querySelectorAll(".project-edit-button").forEach((button) => {
        button.addEventListener("click", () => {
            openEditModal(button);
        });
    });

    modal.querySelectorAll("[data-close-modal]").forEach((element) => {
        element.addEventListener("click", closeEditModal);
    });

    editForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!editingButton) return;

        const formData = new FormData(editForm);
        const csrfToken = editForm.querySelector(
            "[name=csrfmiddlewaretoken]"
        ).value;

        try {
            const response = await fetch(editingButton.dataset.updateUrl, {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken,
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                modalError.textContent = "Não foi possível salvar. Verifique os campos.";
                modalError.hidden = false;
                return;
            }

            const projeto = data.projeto;
            const item = editingButton.closest(".project-item");

            // Atualiza o HTML visível
            item.querySelector(".project-item-name").textContent = projeto.nome;
            item.dataset.status = projeto.status;

            const tag = item.querySelector(".project-status-tag");
            tag.textContent = projeto.status_display;
            tag.className = `project-status-tag project-status-tag--${projeto.status}`;

            const fill = item.querySelector(".project-progress-fill");
            fill.dataset.progress = projeto.progresso;
            fill.style.width = `${projeto.progresso}%`;

            item.querySelector(".project-progress-label").textContent =
                `${projeto.progresso}% concluído`;

            // Mantém os dados do botão atualizados para uma próxima edição
            editingButton.dataset.nome = projeto.nome;
            editingButton.dataset.status = projeto.status;
            editingButton.dataset.descricao = projeto.descricao || "";
            editingButton.dataset.feitos = projeto.feitos || "";

            closeEditModal();

        } catch (error) {
            modalError.textContent = "Erro de conexão ao salvar o projeto.";
            modalError.hidden = false;
        }
    });
});