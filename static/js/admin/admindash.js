/**
 * Dashboard – Administração
 * Renderiza o gráfico de rosca "Resumo de Atividades".
 * Específico desta tela — depende de admin/base.js já ter
 * inicializado sidebar e avatar.
 *
 * Dependência: Chart.js (carregado via CDN no admindash.html)
 */

document.addEventListener("DOMContentLoaded", () => {
  const chart = initActivityChart();
  const activityList = document.getElementById("dashboardActivityList");

  activityList?.addEventListener("change", async (event) => {
    const checkbox = event.target.closest(".dashboard-activity-checkbox");
    if (!checkbox) return;

    const row = checkbox.closest(".dashboard-activity");
    checkbox.disabled = true;
    showActivityFeedback(row, "");
    try {
      const response = await fetch(row.dataset.toggleUrl, {
        method: "POST",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error("Não foi possível atualizar a atividade.");

      checkbox.checked = data.finalizada;
      row.classList.toggle("is-complete", data.finalizada);
      updateActivitySummary(data, chart);
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      showActivityFeedback(row, error.message);
    } finally {
      checkbox.disabled = false;
    }
  });

  document.querySelectorAll(".project-progress-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      clearFeedback(form);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
          body: new FormData(form),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível salvar o progresso.");

        const project = form.closest(".dashboard-project");
        project.querySelector(".project-progress-value").textContent = `${data.progresso}%`;
        const fill = project.querySelector("[data-progress-fill]");
        fill.style.width = `${data.progresso}%`;
        fill.classList.remove("project-progress-fill--alto", "project-progress-fill--medio", "project-progress-fill--baixo");
        fill.classList.add(progressClass(data.progresso));
        updateProjectKpi(data.media_progresso, data.projetos_ativos);
        showFeedback(form, "Progresso salvo.", true);
      } catch (error) {
        showFeedback(form, error.message);
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll(".dashboard-member-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFeedback(form);
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
          body: new FormData(form),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          const errors = Object.values(data.errors || {}).flat().map((error) => error.message);
          throw new Error(errors.join(" ") || "Não foi possível adicionar o integrante.");
        }

        addMemberToList(form.closest(".dashboard-project").querySelector(".dashboard-member-list"), data.integrante);
        form.reset();
        showFeedback(form, "Integrante adicionado.", true);
      } catch (error) {
        showFeedback(form, error.message);
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll(".dashboard-member-list").forEach((list) => {
    list.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-url]");
      if (!button) return;
      button.disabled = true;

      try {
        const response = await fetch(button.dataset.deleteUrl, {
          method: "POST",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error("Não foi possível remover o integrante.");
        button.closest(".dashboard-member").remove();
        if (!list.querySelector(".dashboard-member")) {
          const empty = document.createElement("span");
          empty.className = "dashboard-empty-members";
          empty.textContent = "Sem integrantes";
          list.append(empty);
        }
      } catch (error) {
        button.disabled = false;
        showFeedback(list.closest(".dashboard-project-members"), error.message);
      }
    });
  });
});

function initActivityChart() {
  const canvas = document.getElementById("resumoChart");
  const completedNode = document.getElementById("activity-done-data");
  const pendingNode = document.getElementById("activity-pending-data");
  if (!canvas || !completedNode || !pendingNode || typeof Chart === "undefined") return null;

  const completed = Number(JSON.parse(completedNode.textContent)) || 0;
  const pending = Number(JSON.parse(pendingNode.textContent)) || 0;
  return new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Finalizadas", "Pendentes"],
      datasets: [{ data: [completed, pending], backgroundColor: ["#22a06b", "#f5a524"], borderWidth: 0, hoverOffset: 4 }],
    },
    options: {
      cutout: "72%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

function updateActivitySummary(data, chart) {
  const pending = data.total - data.concluidas;
  const completedCount = document.getElementById("activityDoneCount");
  const pendingCount = document.getElementById("activityPendingCount");
  const percentage = document.getElementById("kpiAtividadesPercentual");
  const count = document.getElementById("kpiAtividadesContagem");
  const chartLabel = document.getElementById("activityCompletionLabel");
  if (completedCount) completedCount.textContent = data.concluidas;
  if (pendingCount) pendingCount.textContent = pending;
  if (percentage) percentage.textContent = `${data.percentual}%`;
  if (count) count.textContent = `${data.concluidas} de ${data.total}`;
  if (chartLabel) chartLabel.textContent = `${data.percentual}%`;
  if (chart) {
    chart.data.datasets[0].data = [data.concluidas, pending];
    chart.update();
  }
}

function updateProjectKpi(average, activeCount) {
  const value = document.getElementById("kpiProgressoProjetos");
  const count = document.getElementById("kpiProjetosAtivos");
  if (value) value.textContent = `${average}%`;
  if (count) count.textContent = `${activeCount} projetos ativos`;
}

function progressClass(value) {
  return value >= 80 ? "project-progress-fill--alto" : value >= 50 ? "project-progress-fill--medio" : "project-progress-fill--baixo";
}

function addMemberToList(list, member) {
  list.querySelector(".dashboard-empty-members")?.remove();
  const wrapper = document.createElement("span");
  wrapper.className = "dashboard-member";
  wrapper.dataset.memberId = member.id;

  const avatar = document.createElement("span");
  avatar.className = "dashboard-member-avatar";
  avatar.title = member.nome;
  avatar.textContent = member.iniciais;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "dashboard-member-remove";
  remove.dataset.deleteUrl = member.delete_url;
  remove.setAttribute("aria-label", `Remover ${member.nome}`);
  remove.textContent = "×";

  wrapper.append(avatar, remove);
  list.append(wrapper);
}

function getCookie(name) {
  const value = document.cookie.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

function showFeedback(container, message, success = false) {
  const feedback = container.querySelector(".project-form-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle("is-success", success);
}

function clearFeedback(container) {
  const feedback = container.querySelector(".project-form-feedback");
  if (feedback) {
    feedback.textContent = "";
    feedback.classList.remove("is-success");
  }
}

function showActivityFeedback(row, message) {
  const feedback = row.querySelector(".activity-form-feedback");
  if (feedback) feedback.textContent = message;
}
