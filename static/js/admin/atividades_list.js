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
});