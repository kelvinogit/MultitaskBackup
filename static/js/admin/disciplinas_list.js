document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector(".discipline-list");

    if (!list) return;

    const items = Array.from(list.querySelectorAll(".discipline-item"));
    const searchInput = document.querySelector(".discipline-search");
    const emptyState = document.querySelector(".discipline-empty-dynamic");

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
       Busca
       ===================================================== */

    if (searchInput) {
    searchInput.addEventListener("input", () => {
        const termo = searchInput.value.trim().toLowerCase();
        let visiveis = 0;

        items.forEach((item) => {
            const texto = item.dataset.search || "";
            const visivel = !termo || texto.includes(termo);

            item.classList.toggle("is-hidden", !visivel);

            if (visivel) visiveis += 1;
        });

        if (emptyState) {
            emptyState.style.display = visiveis === 0 ? "block" : "none";
        }
    });
}

    /* =====================================================
       Delete
       ===================================================== */

    list.addEventListener("click", async (event) => {

        const button = event.target.closest(".discipline-delete");

        if (!button) return;

        const deleteUrl = button.dataset.deleteUrl;

        try {

            const response = await fetch(deleteUrl, {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken"),
                },
            });

            const data = await response.json();

            if (data.ok) {

                const item = button.closest(".discipline-item");

                item.remove();

            }

        } catch (error) {

            console.error("Erro ao excluir:", error);

        }

            function getCookie(name) {
        const cookies = document.cookie.split(";");

        for (const cookie of cookies) {
            const [key, value] = cookie.trim().split("=");

            if (key === name) {
                return decodeURIComponent(value);
            }
        }

        return null;
    }
    });


    /* edição */

        const modal = document.getElementById("disciplineModal");
        const form = document.getElementById("disciplineForm");
        const error = document.getElementById("disciplineError");
        let editButton = null;

        function getCookie(name) {
        const cookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${name}=`));

        return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
        }

        list.addEventListener("click", (event) => {
        const button = event.target.closest(".discipline-edit");
        if (!button) return;

        editButton = button;

        document.getElementById("disciplinaNome").value = button.dataset.nome;
        document.getElementById("disciplinaProfessor").value = button.dataset.professor;
        document.getElementById("disciplinaSemestre").value = button.dataset.semestre;
        document.getElementById("disciplinaDescricao").value = button.dataset.descricao;

        error.hidden = true;
        modal.hidden = false;
        });

        document.getElementById("closeDisciplineModal").addEventListener("click", () => {
        modal.hidden = true;
        });

        form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!editButton) return;

        error.hidden = true;

        try {
            const response = await fetch(editButton.dataset.updateUrl, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: new FormData(form),
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
            const messages = Object.values(data.errors || {})
                .flat()
                .join(" ");

            error.textContent = messages || "Não foi possível salvar a disciplina.";
            error.hidden = false;
            return;
            }

            const disciplina = data.disciplina;
            const item = editButton.closest(".discipline-item");

            item.querySelector(".discipline-item-name").textContent = disciplina.nome;
            item.querySelector(".discipline-item-meta").textContent =
            `${disciplina.professor || "Sem professor cadastrado"}${disciplina.semestre ? ` · ${disciplina.semestre}` : ""}`;

            item.dataset.search =
            `${disciplina.nome} ${disciplina.professor}`.toLowerCase();

            editButton.dataset.nome = disciplina.nome;
            editButton.dataset.professor = disciplina.professor;
            editButton.dataset.semestre = disciplina.semestre;
            editButton.dataset.descricao = disciplina.descricao;

            modal.hidden = true;
        } catch (err) {
            console.error(err);
            error.textContent = "Erro de conexão ao salvar.";
            error.hidden = false;
        }
        });
    
    


});


