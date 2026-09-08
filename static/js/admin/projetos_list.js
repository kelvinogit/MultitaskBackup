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
});