/**
 * Dashboard – Administração
 * Renderiza o gráfico de rosca "Resumo de Atividades" e cuida de
 * pequenas interações de UI (navegação ativa, clique no avatar).
 *
 * Dependência: Chart.js (carregado via CDN no dashboard.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  initSidebarNavigation();
  initResumoChart();
  initAvatarButton();
});

/* -------------------------------------------------------------
 * Navegação lateral: marca o item clicado como ativo.
 * No Django, troque isso por lógica de URL ativa no template
 * (ex.: {% if request.resolver_match.url_name == 'dashboard' %}).
 * ----------------------------------------------------------- */
function initSidebarNavigation() {
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      // Em produção, deixe o link navegar normalmente.
      // event.preventDefault();
      navItems.forEach((el) => el.classList.remove("is-active"));
      item.classList.add("is-active");
    });
  });
}

/* -------------------------------------------------------------
 * Gráfico de rosca com o resumo de atividades.
 * Os dados abaixo devem vir do backend (contexto do Django /
 * endpoint JSON) em vez de estarem fixos aqui.
 * ----------------------------------------------------------- */
function initResumoChart() {
  const canvas = document.getElementById("resumoChart");
  if (!canvas || typeof Chart === "undefined") return;

  const resumoData = {
    labels: ["Pendentes", "Em andamento", "Concluídas", "Atrasadas"],
    values: [12, 8, 24, 3],
    colors: ["#f5a524", "#8b5cf6", "#22a06b", "#e5484d"],
  };

  const total = resumoData.values.reduce((sum, value) => sum + value, 0);
  const totalLabel = document.getElementById("resumoTotalValue");
  if (totalLabel) totalLabel.textContent = total;

  new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: resumoData.labels,
      datasets: [
        {
          data: resumoData.values,
          backgroundColor: resumoData.colors,
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      cutout: "72%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.raw}`,
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------
 * Botão de avatar no header (placeholder de navegação para o perfil).
 * ----------------------------------------------------------- */
function initAvatarButton() {
  const avatarBtn = document.getElementById("avatarBtn");
  if (!avatarBtn) return;

  avatarBtn.addEventListener("click", () => {
    // No Django, troque por: window.location.href = "{% url 'perfil' %}";
    console.log("Abrir menu / página de perfil");
  });
}