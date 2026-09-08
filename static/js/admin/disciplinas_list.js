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

    if (!searchInput) return;

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
});