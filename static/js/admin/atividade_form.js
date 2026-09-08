document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".activity-form");

    if (!form) return;

    const fields = form.querySelectorAll(
        "input, select, textarea"
    );

    const submitButton = form.querySelector(
        ".activity-form-submit"
    );

    /* =====================================================
       Entrada suave dos campos
       ===================================================== */

    const formFields = form.querySelectorAll(
        ".activity-form-field"
    );

    formFields.forEach((field, index) => {
        field.style.opacity = "0";
        field.style.transform = "translateY(6px)";

        setTimeout(() => {
            field.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            field.style.opacity = "1";
            field.style.transform = "translateY(0)";
        }, 60 * index);
    });


    /* =====================================================
       Feedback visual ao preencher
       ===================================================== */

    fields.forEach((field) => {

        field.addEventListener("input", () => {
            updateFieldState(field);
        });

        field.addEventListener("change", () => {
            updateFieldState(field);
        });

    });


    function updateFieldState(field) {

        if (field.value.trim() !== "") {
            field.classList.add("is-filled");
        } else {
            field.classList.remove("is-filled");
        }

    }


    /* =====================================================
       Foco automático no primeiro campo
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
       Erros Django
       Foca automaticamente no primeiro campo com erro
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
       Estado do botão ao enviar
       ===================================================== */

    form.addEventListener("submit", (event) => {

        if (form.dataset.submitting === "true") {
            event.preventDefault();
            return;
        }

        form.dataset.submitting = "true";

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.dataset.originalText =
                submitButton.textContent;

            submitButton.innerHTML = `
                <span class="activity-button-spinner"></span>
                Salvando...
            `;

        }

    });


    /* =====================================================
       Animação de disciplina inexistente
       ===================================================== */

    const emptyMessage = document.querySelector(
        ".activity-empty-message"
    );

    if (emptyMessage) {

        emptyMessage.style.opacity = "0";
        emptyMessage.style.transform = "translateY(-5px)";

        setTimeout(() => {
            emptyMessage.style.transition =
                "opacity 0.3s ease, transform 0.3s ease";

            emptyMessage.style.opacity = "1";
            emptyMessage.style.transform = "translateY(0)";
        }, 150);

    }

});