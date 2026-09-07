/**
 * Admin – Base
 * Interações comuns a todas as telas do módulo Administração:
 * navegação da sidebar e botão de avatar.
 */

document.addEventListener("DOMContentLoaded", () => {
  initSidebarNavigation();
  initAvatarButton();
  initLogout();
});

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

/* -------------------------------------------------------------
 * Logout: accounts:logout responde com JSON (não redireciona),
 * então interceptamos o clique, chamamos via fetch com o token
 * CSRF e só então navegamos pra fora do painel.
 * ----------------------------------------------------------- */
function initLogout() {
  const logoutLink = document.querySelector(".sidebar-logout");
  if (!logoutLink) return;

  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    const destino = logoutLink.href;

    try {
      await fetch(destino, {
        method: "POST",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
    } finally {
      window.location.href = "/";
    }
  });
}

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