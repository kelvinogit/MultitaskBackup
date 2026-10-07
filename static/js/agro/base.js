/* Cerne AgroHub — base.js (JavaScript puro, sem dependências) */
(function () {
  "use strict";

  var sidebar = document.querySelector("[data-sidebar]");
  var backdrop = document.querySelector("[data-sidebar-backdrop]");
  var openBtn = document.querySelector("[data-sidebar-open]");
  var closeBtn = document.querySelector("[data-sidebar-close]");
  var MOBILE_QUERY = window.matchMedia("(max-width: 960px)");

  /* ---------- Sidebar (mobile) ---------- */
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    if (backdrop) backdrop.classList.add("is-visible");
    document.body.classList.add("is-locked");
    if (openBtn) openBtn.setAttribute("aria-expanded", "true");
    if (closeBtn) closeBtn.focus();
  }

  function closeSidebar(returnFocus) {
    if (!sidebar || !sidebar.classList.contains("is-open")) return;
    sidebar.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-visible");
    document.body.classList.remove("is-locked");
    if (openBtn) {
      openBtn.setAttribute("aria-expanded", "false");
      if (returnFocus) openBtn.focus();
    }
  }

  if (openBtn) {
    openBtn.setAttribute("aria-expanded", "false");
    openBtn.addEventListener("click", openSidebar);
  }
  if (closeBtn) closeBtn.addEventListener("click", function () { closeSidebar(true); });
  if (backdrop) backdrop.addEventListener("click", function () { closeSidebar(true); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSidebar(true);
  });

  // Fecha o menu ao clicar em um link (mobile) e ao voltar para desktop
  if (sidebar) {
    sidebar.addEventListener("click", function (e) {
      if (e.target.closest(".nav-item") && MOBILE_QUERY.matches) closeSidebar(false);
    });
  }
  MOBILE_QUERY.addEventListener("change", function (e) {
    if (!e.matches) closeSidebar(false);
  });

  /* ---------- Data e safra na barra superior ---------- */
  // Ano agrícola brasileiro: começa em julho e termina em junho.
  function safraLabel(date) {
    var y = date.getFullYear();
    var start = date.getMonth() >= 6 ? y : y - 1;
    return "Safra " + start + "/" + String((start + 1) % 100).padStart(2, "0");
  }

  var now = new Date();
  var dateEl = document.querySelector("[data-today-date]");
  var seasonEl = document.querySelector("[data-season-label]");

  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }).replace(".", "");
  }
  if (seasonEl) seasonEl.textContent = safraLabel(now);
})();