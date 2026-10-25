document.addEventListener("DOMContentLoaded", () => {
  const modalStack = [];

  function openModal(modal, trigger) {
    if (!modal || modalStack.some((entry) => entry.modal === modal)) return;

    modalStack.push({ modal, trigger });
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.querySelector(".notes-modal-close").focus();
  }

  function closeTopModal() {
    const entry = modalStack.pop();
    if (!entry) return;

    entry.modal.hidden = true;
    entry.modal.setAttribute("aria-hidden", "true");
    if (entry.trigger) entry.trigger.focus();
  }

  document.querySelectorAll("[data-modal-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.getElementById(button.dataset.modalTarget);
      if (!modal) return;

      const form = modal.querySelector(".notes-create-form, .notes-grade-form");
      if (form) clearFormErrors(form);
      openModal(modal, button);
    });
  });

  document.querySelectorAll(".notes-modal").forEach((modal) => {
    modal.querySelector(".notes-modal-close").addEventListener("click", closeTopModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal && modalStack.at(-1)?.modal === modal) {
        closeTopModal();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTopModal();
  });

  document.querySelectorAll(".notes-create-form, .notes-grade-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFormErrors(form);

      const submitButton = form.querySelector('[type="submit"]');
      submitButton.disabled = true;

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "X-Requested-With": "XMLHttpRequest" },
          body: new FormData(form),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          showFormErrors(form, data.errors || {});
          return;
        }

        window.location.reload();
      } catch (error) {
        const summary = form.closest(".notes-modal-content").querySelector(".notes-form-errors");
        summary.textContent = "Não foi possível salvar a avaliação. Tente novamente.";
        summary.hidden = false;
      } finally {
        submitButton.disabled = false;
      }
    });
  });

  function clearFormErrors(form) {
    form.querySelectorAll(".notes-field-error").forEach((element) => {
      element.textContent = "";
    });
    const summary = form.closest(".notes-modal-content").querySelector(".notes-form-errors");
    summary.textContent = "";
    summary.hidden = true;
  }

  function showFormErrors(form, errors) {
    const summaryMessages = [];

    Object.entries(errors).forEach(([fieldName, fieldErrors]) => {
      const messages = fieldErrors.map((error) => error.message);
      const fieldError = form.querySelector(`[data-error-for="${fieldName}"]`);

      if (fieldError) fieldError.textContent = messages.join(" ");
      else summaryMessages.push(...messages);
    });

    const summary = form.closest(".notes-modal-content").querySelector(".notes-form-errors");
    summary.textContent = summaryMessages.join(" ") || "Confira os campos destacados e tente novamente.";
    summary.hidden = false;
  }
});
