/**
 * Admin – Base
 * Interações comuns a todas as telas do módulo Administração:
 * navegação da sidebar e botão de avatar.
 */

document.addEventListener("DOMContentLoaded", () => {
  initSidebarNavigation();
  initAvatarButton();
});

/* -------------------------------------------------------------
 * Navegação lateral: marca o item clicado como ativo.
 * O estado "ativo" real (ao carregar a página) já vem do backend
 * via request.resolver_match no template; isto aqui só cobre o
 * feedback visual imediato ao clicar antes da navegação completar.
 * ----------------------------------------------------------- */
function initSidebarNavigation() {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((el) => el.classList.remove("is-active"));
      item.classList.add("is-active");
    });
  });
}

/* -------------------------------------------------------------
 * Botão de avatar no header (placeholder de navegação para o perfil).
 * ----------------------------------------------------------- */
function initAvatarButton() {
  const avatarBtn = document.getElementById("avatarBtn");
  if (!avatarBtn) return;

  avatarBtn.addEventListener("click", () => {
    // Ex.: window.location.href = "{% url 'administraco:perfil' %}";
    console.log("Abrir menu / página de perfil");
  });
}