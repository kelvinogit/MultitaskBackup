document.addEventListener("DOMContentLoaded", () => {
    function getCookie(name) {
        const match = document.cookie.match(
            new RegExp("(^| )" + name + "=([^;]+)")
        );

        return match ? decodeURIComponent(match[2]) : null;
    }

    /* =====================================================
       Excluir disciplina
       ===================================================== */

    document.querySelectorAll("[data-delete-disciplina]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();

            const card = button.closest(".discipline-card");
            const url = button.dataset.deleteUrl;
            if (!card || !url) return;

            const nome = button.dataset.nome || "esta disciplina";
            if (!window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
                return;
            }

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
                    throw new Error("Falha ao excluir disciplina");
                }
            } catch (err) {
                console.error("Erro ao excluir disciplina:", err);
                button.disabled = false;
                button.textContent = originalText;
                window.alert("Não foi possível excluir a disciplina. Tente novamente.");
                return;
            }

            // 2) Excluiu no servidor: agora só atualiza a tela
            const grid = card.closest(".discipline-grid");
            card.classList.add("is-removing");

            setTimeout(() => {
                card.remove();

                // Sem cards restantes: recarrega para mostrar o estado vazio do template
                if (grid && !grid.querySelector(".discipline-card")) {
                    window.location.reload();
                }
            }, 250);
        });
    });

    
});