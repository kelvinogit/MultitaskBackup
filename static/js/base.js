document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector("[data-sidebar]");
  const backdrop = document.querySelector("[data-sidebar-backdrop]");
  const openButton = document.querySelector("[data-sidebar-open]");
  const closeButton = document.querySelector("[data-sidebar-close]");

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
  }

  function openSidebar() {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-visible");
  }

  openButton?.addEventListener("click", openSidebar);
  closeButton?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
});