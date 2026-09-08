document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".project-form");

    if (!form) return;

    const fields = form.querySelectorAll(
        "input, select, textarea"
    );

    const submitButton = form.querySelector(
        ".project-form-submit"
    );

    const formFields = form.querySelectorAll(
        ".project-form-field"
    );


    /* =====================================================
       Entrada suave do formulário
       ===================================================== */

    formFields.forEach((field, index) => {

        field.style.opacity = "0";
        field.style.transform = "translateY(6px)";

        setTimeout(() => {

            field.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            field.style.opacity = "1";
            field.style.transform = "translateY(0)";

        }, 70 * index);

    });


    /* =====================================================
       Estado dos campos
       ===================================================== */

    fields.forEach((field) => {

        field.addEventListener("input", () => {
            updateField(field);
        });

        field.addEventListener("change", () => {
            updateField(field);
        });

        // Verifica se Django já trouxe algum valor
        updateField(field);

    });


    function updateField(field) {

        const wrapper = field.closest(
            ".project-form-field"
        );

        if (!wrapper) return;

        if (field.value.trim() !== "") {

            field.classList.add("is-filled");
            wrapper.classList.add("is-filled");

        } else {

            field.classList.remove("is-filled");
            wrapper.classList.remove("is-filled");

        }

    }


    /* =====================================================
       Progresso: mantém o valor entre 0 e 100
       ===================================================== */

    const progressoField = form.querySelector(
        "input[name='progresso']"
    );

    if (progressoField) {

        progressoField.addEventListener("blur", () => {

            let valor = parseInt(progressoField.value, 10);

            if (Number.isNaN(valor)) return;

            if (valor < 0) valor = 0;
            if (valor > 100) valor = 100;

            progressoField.value = valor;
            updateField(progressoField);

        });

    }


    /* =====================================================
       Primeiro campo recebe foco
       ===================================================== */

    const firstField = form.querySelector(
        "input:not([type='hidden']), select, textarea"
    );

    if (firstField) {

        setTimeout(() => {
            firstField.focus();
        }, 250);

    }


    /* =====================================================
       Se houver erro, focar nele
       ===================================================== */

    const errorField = form.querySelector(
        ".has-error input, .has-error select, .has-error textarea"
    );

    if (errorField) {

        setTimeout(() => {
            errorField.focus();
        }, 300);

    }


    /* =====================================================
       Animação do aviso de responsável automático
       ===================================================== */

    const hint = document.querySelector(".project-hint");

    if (hint) {

        hint.style.opacity = "0";
        hint.style.transform = "translateY(-5px)";

        setTimeout(() => {
            hint.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            hint.style.opacity = "1";
            hint.style.transform = "translateY(0)";
        }, 150);

    }


    /* =====================================================
       Envio do formulário
       ===================================================== */

    form.addEventListener("submit", (event) => {

        if (form.dataset.submitting === "true") {
            event.preventDefault();
            return;
        }

        form.dataset.submitting = "true";

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.innerHTML = `
                <span class="project-button-spinner"></span>
                Salvando...
            `;

        }

    });

});3