/* =========================================================
   CERNE — script.js
   Controla apenas a interface: nenhuma requisição é feita.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Referências ---------- */
  const overlay = document.getElementById('authOverlay');
  const drawer = document.getElementById('authDrawer');
  const closeBtn = document.getElementById('authClose');

  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const tabIndicator = document.getElementById('tabIndicator');
  const panelLogin = document.getElementById('panelLogin');
  const panelSignup = document.getElementById('panelSignup');

  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const signupSuccess = document.getElementById('signupSuccess');
  const successClose = document.getElementById('successClose');

  const areaSelect = document.getElementById('areaSelect');
  const areaOptions = Array.from(document.querySelectorAll('.area-option'));
  let selectedArea = null;

  let lastFocusedEl = null;

  /* =========================================================
     1. Abrir / fechar o drawer
     ========================================================= */

  function openAuth(mode) {
    lastFocusedEl = document.activeElement;
    overlay.hidden = false;
    // força reflow antes de animar
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    switchTab(mode || 'login');

    const firstField = mode === 'signup'
      ? document.getElementById('suNome')
      : document.getElementById('loginEmail');
    setTimeout(() => firstField && firstField.focus(), 320);

    document.addEventListener('keydown', onKeydown);
    overlay.addEventListener('click', onOverlayClick);
  }

  function closeAuth() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    overlay.removeEventListener('click', onOverlayClick);

    setTimeout(() => {
      overlay.hidden = true;
      resetSignupPanel();
    }, 320);

    if (lastFocusedEl) lastFocusedEl.focus();
  }

  function onOverlayClick(event) {
    if (event.target === overlay) closeAuth();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      closeAuth();
      return;
    }
    if (event.key === 'Tab') trapFocus(event);
  }

  function trapFocus(event) {
    const focusable = drawer.querySelectorAll(
      'button:not([hidden]):not([disabled]), input:not([hidden]):not([disabled]), a[href]'
    );
    const visible = Array.from(focusable).filter((el) => el.offsetParent !== null);
    if (!visible.length) return;

    const first = visible[0];
    const last = visible[visible.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.querySelectorAll('[data-open-auth]').forEach((btn) => {
    btn.addEventListener('click', () => openAuth(btn.dataset.openAuth));
  });

  closeBtn.addEventListener('click', closeAuth);
  successClose.addEventListener('click', closeAuth);

  /* =========================================================
     2. Alternar abas Entrar / Criar conta
     ========================================================= */

  function switchTab(mode) {
    const isSignup = mode === 'signup';

    tabLogin.setAttribute('aria-selected', String(!isSignup));
    tabSignup.setAttribute('aria-selected', String(isSignup));

    panelLogin.hidden = isSignup;
    panelSignup.hidden = !isSignup;

    tabIndicator.style.transform = isSignup ? 'translateX(104px)' : 'translateX(0)';
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabSignup.addEventListener('click', () => switchTab('signup'));

  document.querySelectorAll('[data-switch-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.switchTab);
      const target = btn.dataset.switchTab === 'signup'
        ? document.getElementById('suNome')
        : document.getElementById('loginEmail');
      target && target.focus();
    });
  });

  /* =========================================================
     3. Mostrar / ocultar senha
     ========================================================= */

  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      const isVisible = input.type === 'text';
      input.type = isVisible ? 'password' : 'text';
      btn.classList.toggle('is-visible', !isVisible);
      btn.setAttribute('aria-label', isVisible ? 'Mostrar senha' : 'Ocultar senha');
    });
  });

  /* =========================================================
     4. Seleção de área (cards estilo radio)
     ========================================================= */

  areaOptions.forEach((option) => {
    option.addEventListener('click', () => selectArea(option.dataset.area));
  });

  function selectArea(area) {
    selectedArea = area;
    areaOptions.forEach((opt) => {
      opt.setAttribute('aria-checked', String(opt.dataset.area === area));
    });
    clearFieldError(areaSelect, 'areaError');
  }

  /* =========================================================
     5. Validação — utilitários
     ========================================================= */

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(fieldEl, errorId, message) {
    fieldEl.classList.add('has-error');
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(fieldEl, errorId) {
    fieldEl.classList.remove('has-error');
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = '';
  }

  function shakeDrawer() {
    drawer.classList.remove('is-shaking');
    // força reflow para permitir reanimação
    void drawer.offsetWidth;
    drawer.classList.add('is-shaking');
  }

  /* =========================================================
     6. Formulário de login
     ========================================================= */

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const emailField = document.getElementById('loginEmail').closest('.field');
    const senhaField = document.getElementById('loginSenha').closest('.field');
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;

    clearFieldError(emailField, 'loginEmailError');
    clearFieldError(senhaField, 'loginSenhaError');

    let hasError = false;

    if (!email) {
      setFieldError(emailField, 'loginEmailError', 'Informe seu e-mail.');
      hasError = true;
    } else if (!EMAIL_RE.test(email)) {
      setFieldError(emailField, 'loginEmailError', 'Digite um e-mail válido.');
      hasError = true;
    }

    if (!senha) {
      setFieldError(senhaField, 'loginSenhaError', 'Informe sua senha.');
      hasError = true;
    }

    if (hasError) {
      shakeDrawer();
      return;
    }

    // Simulação: nenhuma requisição é feita neste protótipo.
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Entrando...';
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      closeAuth();
    }, 700);
  });

  /* =========================================================
     7. Formulário de cadastro
     ========================================================= */

  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nomeField = document.getElementById('suNome').closest('.field');
    const emailField = document.getElementById('suEmail').closest('.field');
    const senhaField = document.getElementById('suSenha').closest('.field');
    const confirmarField = document.getElementById('suConfirmar').closest('.field');
    const termosInput = document.getElementById('suTermos');

    const nome = document.getElementById('suNome').value.trim();
    const email = document.getElementById('suEmail').value.trim();
    const senha = document.getElementById('suSenha').value;
    const confirmar = document.getElementById('suConfirmar').value;

    // limpa erros anteriores
    [
      [nomeField, 'suNomeError'],
      [emailField, 'suEmailError'],
      [senhaField, 'suSenhaError'],
      [confirmarField, 'suConfirmarError'],
    ].forEach(([field, id]) => clearFieldError(field, id));
    clearFieldError(areaSelect, 'areaError');
    document.getElementById('suTermosError').textContent = '';

    let hasError = false;

    if (!nome) {
      setFieldError(nomeField, 'suNomeError', 'Informe seu nome completo.');
      hasError = true;
    } else if (nome.trim().split(/\s+/).length < 2) {
      setFieldError(nomeField, 'suNomeError', 'Informe nome e sobrenome.');
      hasError = true;
    }

    if (!email) {
      setFieldError(emailField, 'suEmailError', 'Informe seu e-mail.');
      hasError = true;
    } else if (!EMAIL_RE.test(email)) {
      setFieldError(emailField, 'suEmailError', 'Digite um e-mail válido.');
      hasError = true;
    }

    if (!senha) {
      setFieldError(senhaField, 'suSenhaError', 'Crie uma senha.');
      hasError = true;
    } else if (senha.length < 8) {
      setFieldError(senhaField, 'suSenhaError', 'Use pelo menos 8 caracteres.');
      hasError = true;
    }

    if (!confirmar) {
      setFieldError(confirmarField, 'suConfirmarError', 'Confirme sua senha.');
      hasError = true;
    } else if (senha && confirmar !== senha) {
      setFieldError(confirmarField, 'suConfirmarError', 'As senhas não coincidem.');
      hasError = true;
    }

    if (!selectedArea) {
      setFieldError(areaSelect, 'areaError', 'Escolha sua área de estudo.');
      hasError = true;
    }

    if (!termosInput.checked) {
      document.getElementById('suTermosError').textContent = 'É preciso aceitar os termos de uso.';
      hasError = true;
    }

    if (hasError) {
      shakeDrawer();
      return;
    }

    // Simulação de sucesso — nenhuma requisição real é feita.
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Criando conta...';
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      showSignupSuccess(nome);
    }, 800);
  });

  function areaLabel(area) {
    const labels = {
      contabil: 'ContábilHub',
      agro: 'AgroGest',
      administracao: 'Administra+',
    };
    return labels[area] || '';
  }

  function showSignupSuccess(nome) {
    signupForm.hidden = true;
    signupSuccess.hidden = false;
    const firstName = nome.split(' ')[0];
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = `Bem-vindo(a), ${firstName}. Sua área (${areaLabel(selectedArea)}) foi registrada — o próximo passo é o dashboard.`;
  }

  function resetSignupPanel() {
    // Só reseta o formulário depois que a animação de fechar terminou,
    // para não "piscar" o conteúdo enquanto o drawer ainda está visível.
    if (signupSuccess.hidden) return;

    signupForm.reset();
    signupForm.hidden = false;
    signupSuccess.hidden = true;
    selectedArea = null;
    areaOptions.forEach((opt) => opt.setAttribute('aria-checked', 'false'));

    document.querySelectorAll('.field').forEach((field) => field.classList.remove('has-error'));
    document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  }
})();