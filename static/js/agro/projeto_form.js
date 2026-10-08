/* =========================================================
   Formulário de projeto — comportamento apenas estético
   Local sugerido: static/js/agro/projeto_form.js
   Sem fetch: validação e envio ficam na view do Django.
   Usa os ganchos que já existem no template:
   [data-counter], [data-prazo-hint] e [data-submit].
   ========================================================= */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const fold = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const controlSelector = "input:not([type='hidden']), select, textarea";

  /* ---------- Datas (sempre no horário local) ---------- */
  function parseDate(value) {
    const v = (value || "").trim();
    let y, m, d;

    let match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      [, y, m, d] = match;
    } else if ((match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) {
      [, d, m, y] = match;
    } else {
      return null;
    }

    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const valid =
      date.getFullYear() === Number(y) &&
      date.getMonth() === Number(m) - 1 &&
      date.getDate() === Number(d);
    return valid ? date : null;
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function toISO(date) {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
  }

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function describeDeadline(date) {
    const diff = Math.round((date - startOfToday()) / 86400000);
    const when = dateLabel.format(date);

    if (diff === 0) return { text: `Vence hoje · ${when}`, tone: "is-today" };
    if (diff === 1) return { text: `Vence amanhã · ${when}`, tone: "is-soon" };
    if (diff === -1) return { text: "O prazo venceu ontem", tone: "is-late" };
    if (diff < -1) {
      return { text: `O prazo já passou há ${-diff} dias`, tone: "is-late" };
    }

    const span =
      diff > 60 ? `cerca de ${Math.round(diff / 30)} meses` : `${diff} dias`;
    return {
      text: `Faltam ${span} · ${when}`,
      tone: diff <= 7 ? "is-soon" : "is-ok",
    };
  }

  /* ---------- Cor da "Situação" a partir do texto da opção ---------- */
  function toneFor(label) {
    const t = fold(label || "");
    if (/conclu|finaliz|entreg|pronto/.test(t)) return "done";
    if (/andamento|execu|desenvolv|progress|ativo/.test(t)) return "doing";
    if (/atras|cancel|paralis|bloquead|suspens/.test(t)) return "late";
    if (/pend|aguard|planej|nao iniciad|aberto|novo|ideia/.test(t)) return "todo";
    return "";
  }

  /* ---------- Inicialização ---------- */
  function init() {
    const form = document.querySelector(".pf-form");
    if (!form) return;

    const fields = Array.from(form.querySelectorAll(".pf-field"));
    const alertBox = form.querySelector(".pf-alert");
    const submitBtn = form.querySelector("[data-submit]");

    /* ----- 1. Entrada escalonada (delay definido via CSS var) ----- */
    fields.forEach((field, i) => field.style.setProperty("--i", i + 1));

    /* ----- 2. Foco / preenchido / limpar erro ao digitar ----- */
    const controlsOf = (field) =>
      Array.from(field.querySelectorAll(controlSelector));

    const isFilled = (field) =>
      controlsOf(field).some((c) =>
        c.type === "checkbox" || c.type === "radio"
          ? c.checked
          : c.value.trim() !== ""
      );

    const refresh = (field) =>
      field.classList.toggle("is-filled", isFilled(field));

    fields.forEach((field) => {
      refresh(field);

      field.addEventListener("focusin", () => field.classList.add("is-focused"));
      field.addEventListener("focusout", () => {
        field.classList.remove("is-focused");
        refresh(field);
      });

      const clearError = () => {
        refresh(field);
        if (!field.classList.contains("has-error")) return;
        field.classList.remove("has-error", "is-shaking");
        field.querySelectorAll(".pf-error").forEach((el) => (el.hidden = true));
      };

      field.addEventListener("input", clearError);
      field.addEventListener("change", clearError);
    });

    /* ----- 3. Textareas que crescem com o texto ----- */
    const autoGrow = (ta) => {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight + 2, 360)}px`;
    };

    form.querySelectorAll("textarea").forEach((ta) => {
      autoGrow(ta);
      ta.addEventListener("input", () => autoGrow(ta));
      window.addEventListener("load", () => autoGrow(ta));
    });

    /* ----- 4. Contador de caracteres da descrição ----- */
    const counter = form.querySelector("[data-counter]");
    if (counter) {
      const owner = counter.closest(".pf-field");
      const source = owner && owner.querySelector("textarea, input[type='text']");

      if (source) {
        const max = parseInt(source.getAttribute("maxlength"), 10) || 0;

        const update = () => {
          const len = source.value.length;
          counter.textContent = max
            ? `${len}/${max}`
            : `${len} ${len === 1 ? "caractere" : "caracteres"}`;
          counter.classList.toggle("is-near", Boolean(max) && len >= max * 0.85 && len < max);
          counter.classList.toggle("is-full", Boolean(max) && len >= max);
        };

        counter.hidden = false;
        source.addEventListener("input", update);
        update();
      }
    }

    /* ----- 5. Prazo: dica de tempo restante + atalhos ----- */
    const hint = form.querySelector("[data-prazo-hint]");
    if (hint) {
      const prazoField = hint.closest(".pf-field");
      const prazoInput = prazoField && prazoField.querySelector("input");

      if (prazoInput) {
        const updateHint = () => {
          hint.classList.remove("is-ok", "is-soon", "is-today", "is-late");
          const date = parseDate(prazoInput.value);
          if (!date) {
            hint.textContent = "";
            return;
          }
          const { text, tone } = describeDeadline(date);
          hint.textContent = text;
          hint.classList.add(tone);
        };

        prazoInput.addEventListener("input", updateHint);
        prazoInput.addEventListener("change", updateHint);
        updateHint();

        // Atalhos só fazem sentido para <input type="date">
        if (prazoInput.type === "date") {
          const quick = document.createElement("div");
          quick.className = "pf-quick";
          quick.setAttribute("role", "group");
          quick.setAttribute("aria-label", "Atalhos de prazo");

          [
            ["Hoje", 0],
            ["+7 dias", 7],
            ["+15 dias", 15],
            ["+30 dias", 30],
          ].forEach(([label, days]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = label;
            b.addEventListener("click", () => {
              const target = startOfToday();
              target.setDate(target.getDate() + days);
              prazoInput.value = toISO(target);
              prazoInput.dispatchEvent(new Event("input", { bubbles: true }));
              prazoInput.dispatchEvent(new Event("change", { bubbles: true }));
            });
            quick.appendChild(b);
          });

          hint.insertAdjacentElement("beforebegin", quick);
        }
      }
    }

    /* ----- 6. Situação: cor conforme a opção escolhida ----- */
    const status = form.querySelector("select[name='status']");
    if (status) {
      const statusField = status.closest(".pf-field");
      const applyTone = () => {
        const option = status.options[status.selectedIndex];
        const tone = option && option.value ? toneFor(option.textContent) : "";
        if (tone) {
          statusField.dataset.tone = tone;
        } else {
          delete statusField.dataset.tone;
        }
      };
      status.addEventListener("change", applyTone);
      applyTone();
    }

    /* ----- 7. Erros vindos da view: rolar, tremer e focar ----- */
    const firstError = form.querySelector(".pf-field.has-error");
    const target = firstError || alertBox;

    if (target) {
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      target.classList.add("is-shaking");
      target.addEventListener(
        "animationend",
        () => target.classList.remove("is-shaking"),
        { once: true }
      );

      if (firstError) {
        const control = firstError.querySelector(controlSelector);
        if (control) control.focus({ preventScroll: true });
      }
    } else {
      const first = form.querySelector(
        "input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='date']), textarea"
      );
      if (first) first.focus({ preventScroll: true });
    }

    /* ----- 8. Ripple nos botões ----- */
    form.querySelectorAll(".pf-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (reduceMotion) return;

        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement("span");
        ripple.className = "pf-ripple";
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

        btn.appendChild(ripple);
        ripple.addEventListener("animationend", () => ripple.remove());
      });
    });

    /* ----- 9. Ctrl/Cmd + Enter envia o formulário ----- */
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit(submitBtn || undefined);
        } else {
          form.submit();
        }
      }
    });

    /* ----- 10. Estado de "salvando" (o POST segue normalmente) ----- */
    form.addEventListener("submit", () => {
      if (!submitBtn) return;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.classList.add("is-loading");
      submitBtn.textContent = "Salvando...";
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted && submitBtn) {
        submitBtn.classList.remove("is-loading");
        if (submitBtn.dataset.originalText) {
          submitBtn.textContent = submitBtn.dataset.originalText;
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();