/* ==========================================================================
   Engenharia Agronômica — formulário de atividade
   Caminho sugerido: static/js/agronomia/atividade_form.js

   Melhoria progressiva: o envio e a validação final continuam sendo do Django.
   Este script cuida apenas da parte visual:
     1. Valida os campos na tela antes de enviar (blur e submit)
     2. Foca o primeiro campo com erro, inclusive erros vindos do servidor
     3. Mostra contador de caracteres e cresce o textarea conforme o texto
     4. Mostra quanto tempo falta para a data de entrega
     5. Evita envio duplicado e mostra o estado "Salvando..."
     6. Avisa antes de sair da página com alterações não salvas
   ========================================================================== */

(() => {
  'use strict';

  const form = document.querySelector('.activity-form');
  if (!form) return;

  // O JS assume a validação visual; sem JS, o navegador valida normalmente.
  form.noValidate = true;

  const submitButton = form.querySelector('.submit-button');
  const submitLabel = submitButton ? submitButton.textContent.trim() : '';
  const fieldWrappers = Array.from(form.querySelectorAll('.form-field'));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let isSubmitting = false;
  let initialState = '';

  /* ------------------------------------------------------------------------
     Utilitários
     ------------------------------------------------------------------------ */

  const getControl = (wrapper) =>
    wrapper.querySelector('input:not([type="hidden"]), select, textarea');

  const serializeForm = () =>
    JSON.stringify(
      Array.from(new FormData(form))
        .filter(([name]) => name !== 'csrfmiddlewaretoken')
        .map(([name, value]) => [name, String(value)])
    );

  const scrollToControl = (control) => {
    control.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    });
    control.focus({ preventScroll: true });
  };

  /* ------------------------------------------------------------------------
     1. Validação visual
     ------------------------------------------------------------------------ */

  const getMessage = (control) => {
    const { validity } = control;
    if (validity.valid) return '';

    if (validity.valueMissing) {
      if (control.type === 'checkbox') return 'Marque esta opção para continuar.';
      if (control.tagName === 'SELECT') return 'Selecione uma opção.';
      return 'Preencha este campo.';
    }
    if (validity.tooLong) return `Use no máximo ${control.maxLength} caracteres.`;
    if (validity.tooShort) return `Use pelo menos ${control.minLength} caracteres.`;
    if (validity.badInput || validity.typeMismatch) return 'O valor informado não é válido.';
    if (validity.rangeUnderflow) return 'O valor está abaixo do permitido.';
    if (validity.rangeOverflow) return 'O valor está acima do permitido.';

    return control.validationMessage;
  };

  const getErrorElement = (wrapper, control, create) => {
    let errorEl = wrapper.querySelector('.field-error');
    if (!errorEl && create) {
      errorEl = document.createElement('span');
      errorEl.className = 'field-error';
      errorEl.id = `${control.id || control.name}-error`;
      errorEl.setAttribute('role', 'alert');
      wrapper.appendChild(errorEl);
    }
    return errorEl;
  };

  const showError = (wrapper, control, message) => {
    wrapper.classList.add('has-error');
    control.setAttribute('aria-invalid', 'true');

    const errorEl = getErrorElement(wrapper, control, true);
    errorEl.textContent = message;
    if (errorEl.id) control.setAttribute('aria-describedby', errorEl.id);
  };

  const clearError = (wrapper, control) => {
    wrapper.classList.remove('has-error');
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');

    const errorEl = getErrorElement(wrapper, control, false);
    if (errorEl) errorEl.remove();
  };

  const validateField = (wrapper) => {
    const control = getControl(wrapper);
    if (!control) return true;

    const message = getMessage(control);
    if (message) {
      showError(wrapper, control, message);
      return false;
    }
    clearError(wrapper, control);
    return true;
  };

  fieldWrappers.forEach((wrapper) => {
    const control = getControl(wrapper);
    if (!control) return;

    // Valida ao sair do campo
    control.addEventListener('blur', () => {
      if (control.value !== '' || wrapper.classList.contains('has-error')) {
        validateField(wrapper);
      }
    });

    // Limpa o erro assim que a pessoa começa a corrigir
    const clearOnChange = () => {
      if (wrapper.classList.contains('has-error') && getMessage(control) === '') {
        clearError(wrapper, control);
      }
    };
    control.addEventListener('input', clearOnChange);
    control.addEventListener('change', clearOnChange);
  });

  /* ------------------------------------------------------------------------
     2. Foco no primeiro erro vindo do servidor
     ------------------------------------------------------------------------ */

  const firstServerError = form.querySelector('.form-field.has-error');
  if (firstServerError) {
    const control = getControl(firstServerError);
    if (control) scrollToControl(control);
  }

  /* ------------------------------------------------------------------------
     3. Contador de caracteres e textarea que cresce
     ------------------------------------------------------------------------ */

  form.querySelectorAll('textarea').forEach((textarea) => {
    const wrapper = textarea.closest('.form-field');
    const limit = textarea.maxLength > 0 ? textarea.maxLength : null;
    let counter = null;

    if (limit && wrapper) {
      counter = document.createElement('span');
      counter.className = 'char-counter';
      counter.setAttribute('aria-live', 'off');
      textarea.insertAdjacentElement('afterend', counter);
    }

    const update = () => {
      // Cresce até um limite razoável
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight + 2, 360)}px`;

      if (counter) {
        const length = textarea.value.length;
        counter.textContent = `${length} de ${limit} caracteres`;
        counter.classList.toggle('is-near-limit', length >= limit * 0.9);
      }
    };

    textarea.addEventListener('input', update);
    update();
  });

  /* ------------------------------------------------------------------------
     4. Indicador de prazo para campos de data
     ------------------------------------------------------------------------ */

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const describeDeadline = (value) => {
    // Aceita "YYYY-MM-DD" e "YYYY-MM-DDTHH:mm"
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return null;

    const target = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = Math.round((target - today) / MS_PER_DAY);

    if (diff < 0) {
      const days = Math.abs(diff);
      return { state: 'late', text: `Atrasada há ${days} ${days === 1 ? 'dia' : 'dias'}` };
    }
    if (diff === 0) return { state: 'soon', text: 'Entrega hoje' };
    if (diff === 1) return { state: 'soon', text: 'Entrega amanhã' };
    if (diff <= 3) return { state: 'soon', text: `Faltam ${diff} dias` };
    if (diff < 14) return { state: 'ok', text: `Faltam ${diff} dias` };

    const weeks = Math.round(diff / 7);
    return { state: 'ok', text: `Faltam cerca de ${weeks} semanas` };
  };

  form.querySelectorAll('input[type="date"], input[type="datetime-local"]').forEach((input) => {
    const hint = document.createElement('span');
    hint.className = 'date-hint';
    hint.setAttribute('aria-live', 'polite');
    input.insertAdjacentElement('afterend', hint);

    const update = () => {
      const info = input.value ? describeDeadline(input.value) : null;
      hint.textContent = info ? info.text : '';
      hint.dataset.state = info ? info.state : '';
      hint.hidden = !info;
    };

    input.addEventListener('input', update);
    input.addEventListener('change', update);
    update();
  });

  /* ------------------------------------------------------------------------
     5. Envio: validação visual + estado de carregamento
     ------------------------------------------------------------------------ */

  const setLoading = (loading) => {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    submitButton.setAttribute('aria-busy', String(loading));
    submitButton.textContent = loading ? 'Salvando...' : submitLabel;
  };

  form.addEventListener('submit', (event) => {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }

    let firstInvalid = null;
    fieldWrappers.forEach((wrapper) => {
      const valid = validateField(wrapper);
      if (!valid && !firstInvalid) firstInvalid = getControl(wrapper);
    });

    if (firstInvalid) {
      event.preventDefault();
      scrollToControl(firstInvalid);
      return;
    }

    // Tudo certo: o Django assume a partir daqui
    isSubmitting = true;
    setLoading(true);
  });

  // Ao voltar pelo botão "voltar" do navegador, destrava o botão
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      isSubmitting = false;
      setLoading(false);
    }
  });

  /* ------------------------------------------------------------------------
     6. Aviso de alterações não salvas
     ------------------------------------------------------------------------ */

  initialState = serializeForm();

  window.addEventListener('beforeunload', (event) => {
    if (isSubmitting) return;
    if (serializeForm() === initialState) return;

    event.preventDefault();
    event.returnValue = '';
  });
})();