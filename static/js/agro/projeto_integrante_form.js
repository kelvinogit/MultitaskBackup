/* ==========================================================================
   Formulário de participante — tema Engenharia Agronômica
   Arquivo: static/js/agro/projeto_integrante_form.js
   Apenas comportamento visual: a lógica de cadastro continua no Django.
   ========================================================================== */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        var form = document.getElementById("participante-form");
        var botao = document.getElementById("add-participante-button");

        if (!form) return;

        var campos = form.querySelectorAll(".form-field");
        var textoOriginal = botao ? botao.textContent : "";

        /* ---------- Estado dos campos ---------- */

        function atualizarPreenchido(campo, controle) {
            var valor = (controle.value || "").trim();
            campo.classList.toggle("is-filled", valor !== "");
        }

        campos.forEach(function (campo) {
            var controle = campo.querySelector("input, select, textarea");
            if (!controle) return;

            // Marca campos com erro vindos do servidor
            if (campo.querySelector(".form-field__erro")) {
                campo.classList.add("has-error");
                controle.setAttribute("aria-invalid", "true");
            }

            atualizarPreenchido(campo, controle);

            // Ao alterar, remove o erro daquele campo
            ["input", "change"].forEach(function (evento) {
                controle.addEventListener(evento, function () {
                    atualizarPreenchido(campo, controle);

                    if (campo.classList.contains("has-error")) {
                        campo.classList.remove("has-error");
                        controle.removeAttribute("aria-invalid");

                        var erro = campo.querySelector(".form-field__erro");
                        if (erro) erro.remove();
                    }
                });
            });
        });

        /* ---------- Foco no primeiro campo com erro (ou no primeiro campo) ---------- */

        var primeiroErro = form.querySelector(".form-field.has-error input, .form-field.has-error select, .form-field.has-error textarea");

        if (primeiroErro) {
            primeiroErro.focus();
        } else {
            var primeiro = form.querySelector(".form-field input, .form-field select");
            if (primeiro && !primeiro.value) primeiro.focus({ preventScroll: true });
        }

        /* ---------- Envio: evita duplo clique e mostra progresso ---------- */

        function restaurarBotao() {
            if (!botao) return;
            botao.disabled = false;
            botao.classList.remove("is-loading");
            botao.removeAttribute("aria-busy");
            botao.textContent = textoOriginal;
        }

        form.addEventListener("submit", function (event) {
            if (!botao) return;

            // Respeita a validação nativa do navegador
            if (!form.checkValidity()) return;

            if (botao.disabled) {
                event.preventDefault();
                return;
            }

            botao.disabled = true;
            botao.classList.add("is-loading");
            botao.setAttribute("aria-busy", "true");
            botao.textContent = "Adicionando…";
        });

        // Se o usuário voltar pelo histórico do navegador, o botão volta ao normal
        window.addEventListener("pageshow", function (event) {
            if (event.persisted) restaurarBotao();
        });
    });
})();