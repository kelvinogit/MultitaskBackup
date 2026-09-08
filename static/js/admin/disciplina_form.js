document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".discipline-form");

    if (!form) return;

    const fields = form.querySelectorAll(
        "input, select, textarea"
    );

    const submitButton = form.querySelector(
        ".discipline-form-submit"
    );

    const formFields = form.querySelectorAll(
        ".discipline-form-field"
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
            ".discipline-form-field"
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
                <span class="discipline-button-spinner"></span>
                Salvando...
            `;

        }

    });

});