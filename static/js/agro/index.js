document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".dashboard-donut").forEach((donut) => {
    const completed = Number(donut.dataset.completed) || 0;
    const total = Number(donut.dataset.total) || 0;
    const percentage = total ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    donut.style.background = `conic-gradient(var(--folha) 0 ${percentage}%, #e8eee4 ${percentage}% 100%)`;
  });
});
