
document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('participante-form');
    const button = document.getElementById(
        'add-participante-button'
    );


    if (!form || !button) {
        return;
    }


    /* =====================================================
       ENVIO DO FORMULÁRIO
       ===================================================== */

    form.addEventListener('submit', () => {

        /*
         * Evita múltiplos cliques enquanto o formulário
         * está sendo enviado.
         */

        button.disabled = true;

        button.textContent = 'Adicionando...';

    });


    /* =====================================================
       REMOVER ESTADO DE ERRO AO DIGITAR
       ===================================================== */

    const campos = form.querySelectorAll(
        'input, select, textarea'
    );


    campos.forEach((campo) => {

        campo.addEventListener('input', () => {

            campo.style.borderColor = '';

        });


        campo.addEventListener('change', () => {

            campo.style.borderColor = '';

        });

    });

});

