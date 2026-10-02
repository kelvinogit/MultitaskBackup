document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("participante-form");
    const button = document.getElementById("add-participante-button");

    if (!form || !button) {
        return;
    }


    /*
    =========================================================
    REMOVE ESTADO DE ERRO AO ALTERAR UM CAMPO
    =========================================================
    */

    const fields = form.querySelectorAll(
        "input, select, textarea"
    );

    fields.forEach(function (field) {

        field.addEventListener("input", function () {
            limparErroCampo(field);
        });

        field.addEventListener("change", function () {
            limparErroCampo(field);
        });

    });


    /*
    =========================================================
    FUNÇÃO PARA LIMPAR ERRO VISUAL
    =========================================================
    */

    function limparErroCampo(field) {

        const container = field.closest(".form-field");

        if (!container) {
            return;
        }

        container.classList.remove("form-field--erro");

        const erro = container.querySelector(
            ".form-field__erro"
        );

        if (erro) {
            erro.style.display = "none";
        }

    }


    /*
    =========================================================
    ENVIO DO FORMULÁRIO
    =========================================================
    */

    form.addEventListener("submit", function () {

        /*
        Evita múltiplos cliques enquanto o formulário
        está sendo enviado.
        */

        button.disabled = true;

        button.classList.add("is-loading");

        button.textContent = "Adicionando...";

    });


    /*
    =========================================================
    FOCO AUTOMÁTICO NO PRIMEIRO CAMPO COM ERRO
    =========================================================
    */

    const primeiroErro = form.querySelector(
        ".form-field__erro"
    );

    if (primeiroErro) {

        const campo = primeiroErro
            .closest(".form-field")
            ?.querySelector("input, select, textarea");

        if (campo) {

            campo.focus();

            campo
                .closest(".form-field")
                ?.classList.add("form-field--erro");

        }

    }


    /*
    =========================================================
    ANIMAÇÃO SUAVE DOS CAMPOS
    =========================================================
    */

    fields.forEach(function (field) {

        field.addEventListener("focus", function () {

            const container = field.closest(".form-field");

            if (container) {
                container.classList.add("is-focused");
            }

        });


        field.addEventListener("blur", function () {

            const container = field.closest(".form-field");

            if (container) {
                container.classList.remove("is-focused");
            }

        });

    });

});