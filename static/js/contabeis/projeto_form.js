document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".pf-form");
    if (!form) return;

    const submitBtn = form.querySelector("[data-submit]");
    const submitLabel = submitBtn ? submitBtn.textContent : "";
    const prazoInput = form.querySelector('input[type="datetime-local"]');
    const prazoHint = form.querySelector("[data-prazo-hint]");


    /* =====================================================
       Prazo: corrige valor reexibido pelo Django e mostra
       quanto tempo falta
       ===================================================== */

    // Se o Django renderizar "2026-09-20 10:00:00", o navegador descarta o valor.
    // Aqui recuperamos o valor original do atributo e convertemos.
    function normalizeDatetimeLocal(raw) {
        const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(raw || "");
        return match ? `${match[1]}T${match[2]}` : "";
    }

    if (prazoInput && !prazoInput.value) {
        const fixed = normalizeDatetimeLocal(prazoInput.getAttribute("value"));
        if (fixed) prazoInput.value = fixed;
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function setHint(text, tone) {
        prazoHint.textContent = text;
        if (tone) prazoHint.dataset.tone = tone;
        else delete prazoHint.dataset.tone;
    }

    function updatePrazoHint() {
        if (!prazoInput || !prazoHint) return;

        if (!prazoInput.value) {
            setHint("", "");
            return;
        }

        const date = new Date(prazoInput.value);
        if (Number.isNaN(date.getTime())) {
            setHint("", "");
            return;
        }

        const days = Math.round(
            (startOfDay(date) - startOfDay(new Date())) / 86400000
        );

        if (days < 0) {
            setHint("Esse prazo já passou.", "late");
        } else if (days === 0) {
            setHint("Vence hoje.", "soon");
        } else if (days === 1) {
            setHint("Vence amanhã.", "soon");
        } else if (days <= 7) {
            setHint(`Vence em ${days} dias.`, "soon");
        } else {
            setHint(`Vence em ${days} dias.`, "");
        }
    }

    if (prazoInput) {
        prazoInput.addEventListener("input", updatePrazoHint);
        prazoInput.addEventListener("change", updatePrazoHint);
        updatePrazoHint();
    }


    /* =====================================================
       Descrição: altura automática e contador de caracteres
       ===================================================== */

    form.querySelectorAll("textarea").forEach((textarea) => {
        const field = textarea.closest(".pf-field");
        const counter = field ? field.querySelector("[data-counter]") : null;
        const max = textarea.maxLength > 0 ? textarea.maxLength : null;

        if (counter) counter.hidden = !max;

        function update() {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight + 2}px`;

            if (counter && max) {
                counter.textContent = `${textarea.value.length}/${max}`;
            }
        }

        textarea.addEventListener("input", update);
        update();
    });


    /* =====================================================
       Validação leve: só destaca o campo depois de tocado
       ===================================================== */

    form.querySelectorAll(".pf-field").forEach((field) => {
        const control = field.querySelector("input, select, textarea");
        if (!control) return;

        control.addEventListener("blur", () => field.classList.add("was-touched"));
        control.addEventListener("input", () => field.classList.remove("has-error"));
    });

    // Ao tentar enviar com campos inválidos, destaca todos eles
    form.addEventListener(
        "invalid",
        (event) => {
            const field = event.target.closest(".pf-field");
            if (field) field.classList.add("was-touched");
        },
        true
    );


    /* =====================================================
       Foco no primeiro erro vindo do servidor
       ===================================================== */

    const firstError = form.querySelector(
        ".pf-field.has-error input, .pf-field.has-error select, .pf-field.has-error textarea"
    );

    if (firstError) {
        firstError.focus({ preventScroll: true });
        firstError.scrollIntoView({ block: "center", behavior: "smooth" });
    }


    /* =====================================================
       Evita envio duplicado
       (o evento submit só dispara se a validação do navegador passou)
       ===================================================== */

    form.addEventListener("submit", () => {
        if (!submitBtn) return;
        submitBtn.disabled = true;
        submitBtn.textContent = "Criando...";
    });

    // Se a pessoa voltar pelo botão "voltar" do navegador, libera o botão de novo
    window.addEventListener("pageshow", () => {
        if (!submitBtn) return;
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
    });
});