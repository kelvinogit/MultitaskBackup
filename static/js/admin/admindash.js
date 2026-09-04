/**
 * Dashboard – Administração
 * Renderiza o gráfico de rosca "Resumo de Atividades".
 * Específico desta tela — depende de admin/base.js já ter
 * inicializado sidebar e avatar.
 *
 * Dependência: Chart.js (carregado via CDN no admindash.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  initResumoChart();
});

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