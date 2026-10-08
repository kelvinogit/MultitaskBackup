/* =========================================================
   Formulário de disciplina — comportamento apenas estético
   Local sugerido: static/js/agro/disciplina_form.js
   (sem fetch: validação e envio ficam na view do Django)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".discipline-form");
  if (!form) return;

  const fields = form.querySelectorAll(".form-field");
  const submitBtn = form.querySelector(".submit-button");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- 1. Entrada escalonada dos campos ---------- */
  fields.forEach((field, index) => {
    const delay = prefersReducedMotion ? 0 : 70 * index;
    setTimeout(() => field.classList.add("is-visible"), delay);
  });

  /* ---------- 2. Estados de foco / preenchido ---------- */
  const controlSelector = "input, select, textarea";

  const updateFilled = (field, control) => {
    let filled = false;
    if (control.type === "checkbox" || control.type === "radio") {
      filled = control.checked;
    } else {
      filled = control.value.trim() !== "";
    }
    field.classList.toggle("is-filled", filled);
  };

  fields.forEach((field) => {
    const control = field.querySelector(controlSelector);
    if (!control) return;

    updateFilled(field, control);

    control.addEventListener("focus", () => field.classList.add("is-focused"));
    control.addEventListener("blur", () => {
      field.classList.remove("is-focused");
      updateFilled(field, control);
    });
    control.addEventListener("input", () => {
      updateFilled(field, control);
      // ao digitar, tira o destaque de erro do campo
      if (field.classList.contains("has-error")) {
        field.classList.remove("has-error", "is-shaking");
        const msg = field.querySelector(".field-error");
        if (msg) msg.style.display = "none";
      }
    });
  });

  /* ---------- 3. Contador de caracteres (se houver maxlength) ---------- */
  form
    .querySelectorAll("input[maxlength], textarea[maxlength]")
    .forEach((control) => {
      const max = parseInt(control.getAttribute("maxlength"), 10);
      if (!max) return;

      const counter = document.createElement("span");
      counter.className = "char-counter";
      control.insertAdjacentElement("afterend", counter);

      const update = () => {
        const len = control.value.length;
        counter.textContent = `${len}/${max}`;
        counter.classList.toggle("is-near-limit", len >= max * 0.85 && len < max);
        counter.classList.toggle("is-at-limit", len >= max);
      };

      control.addEventListener("input", update);
      update();
    });

  /* ---------- 4. Foco inicial inteligente + scroll até o erro ---------- */
  const firstError = form.querySelector(".form-field.has-error");
  if (firstError) {
    firstError.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
    firstError.classList.add("is-shaking");
    const errControl = firstError.querySelector(controlSelector);
    if (errControl) errControl.focus({ preventScroll: true });
  } else {
    const firstControl = form.querySelector(
      "input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, textarea"
    );
    if (firstControl) firstControl.focus({ preventScroll: true });
  }

  /* ---------- 5. Efeito ripple nos botões ---------- */
  form.querySelectorAll(".submit-button, .cancel-button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (prefersReducedMotion) return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  });

  /* ---------- 6. Estado de "carregando" ao enviar ---------- */
  // Não interrompe o envio: o navegador faz o POST normalmente
  // e a view do Django cuida da validação e do banco.
  form.addEventListener("submit", () => {
    if (!submitBtn) return;
    submitBtn.classList.add("is-loading");
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = "Salvando...";
  });

  // Se o usuário voltar pelo botão "voltar" do navegador, restaura o botão
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && submitBtn) {
      submitBtn.classList.remove("is-loading");
      if (submitBtn.dataset.originalText) {
        submitBtn.textContent = submitBtn.dataset.originalText;
      }
    }
  });
});