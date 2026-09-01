/* =========================================================
   ADMINISTRA+ — script.js
   Nenhuma requisição é feita. Os arrays abaixo simulam os dados
   que futuramente virão do contexto da view Django.
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     1. DADOS FICTÍCIOS
     Django: cada array aqui corresponde a uma variável de contexto.
     - resumoStatus   -> já vem calculado pela view (contagens)
     - atividades     -> {% for atividade in atividades %}
     - projetos       -> {% for projeto in projetos %}
     ========================================================= */

  const resumoStatus = [
    { status: 'pendentes', label: 'Pendentes', valor: 5 },
    { status: 'andamento', label: 'Em andamento', valor: 3 },
    { status: 'concluidas', label: 'Concluídas', valor: 12 },
    { status: 'atrasadas', label: 'Atrasadas', valor: 2 },
  ];

  const atividades = [
    {
      nome: 'Prova de Gestão Financeira',
      disciplina: 'Gestão Financeira',
      data: '02/09',
      prioridade: 'alta',
      status: 'pendente',
    },
    {
      nome: 'Trabalho de Marketing',
      disciplina: 'Marketing',
      data: '05/09',
      prioridade: 'media',
      status: 'pendente',
    },
    {
      nome: 'Apresentação de Administração',
      disciplina: 'Administração Geral',
      data: '08/09',
      prioridade: 'media',
      status: 'andamento',
    },
    {
      nome: 'Relatório de Projeto',
      disciplina: 'Gestão de Projetos',
      data: '10/09',
      prioridade: 'baixa',
      status: 'atrasada',
    },
  ];

  const projetos = [
    {
      nome: 'Plano de Marketing',
      progresso: 70,
      prazo: '18/09',
      integrantes: 4,
      tarefasConcluidas: '3/4',
    },
    {
      nome: 'Estudo de Viabilidade',
      progresso: 35,
      prazo: '25/09',
      integrantes: 3,
      tarefasConcluidas: '2/6',
    },
  ];

  /* =========================================================
     2. GRÁFICO DE BARRAS (Atividades por status)
     Construído a partir do mesmo array `resumoStatus` usado no
     resumo — nenhum número é digitado duas vezes.
     ========================================================= */

  function renderBarChart() {
    const container = document.getElementById('statusChart');
    if (!container) return;

    const max = Math.max(...resumoStatus.map((item) => item.valor));

    resumoStatus.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.dataset.status = item.status;

      const label = document.createElement('span');
      label.className = 'bar-row-label';
      label.textContent = item.label;

      const track = document.createElement('div');
      track.className = 'bar-track';

      const fill = document.createElement('div');
      fill.className = 'bar-fill';

      const value = document.createElement('span');
      value.className = 'bar-row-value';
      value.textContent = item.valor;

      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      container.appendChild(row);

      // largura calculada depois de inserir no DOM, para a transição de CSS rodar
      requestAnimationFrame(() => {
        const pct = max > 0 ? (item.valor / max) * 100 : 0;
        fill.style.width = pct + '%';
      });
    });
  }

  /* =========================================================
     3. PRÓXIMAS ATIVIDADES
     ========================================================= */

  const PRIORIDADE_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  const STATUS_LABEL = { pendente: 'Pendente', andamento: 'Em andamento', atrasada: 'Atrasada' };

  function renderAtividades() {
    const list = document.getElementById('activityList');
    if (!list) return;

    atividades.forEach((atividade) => {
      const item = document.createElement('li');
      item.className = 'activity-item';

      item.innerHTML = `
        <div class="activity-info">
          <span class="activity-name">${atividade.nome}</span>
          <span class="activity-meta">${atividade.disciplina}</span>
        </div>
        <div class="activity-side">
          <span class="tag tag-priority-${atividade.prioridade}">${PRIORIDADE_LABEL[atividade.prioridade]}</span>
          <span class="tag tag-status-${atividade.status}">${STATUS_LABEL[atividade.status]}</span>
          <span class="activity-date">${atividade.data}</span>
        </div>
      `;

      list.appendChild(item);
    });
  }

  /* =========================================================
     4. PROJETOS EM GRUPO
     ========================================================= */

  function renderProjetos() {
    const list = document.getElementById('projectList');
    if (!list) return;

    projetos.forEach((projeto) => {
      const card = document.createElement('div');
      card.className = 'project-card';

      card.innerHTML = `
        <div class="project-head">
          <span class="project-name">${projeto.nome}</span>
          <span class="project-progress-value">${projeto.progresso}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${projeto.progresso}%;"></div>
        </div>
        <div class="project-meta">
          <span>Prazo: ${projeto.prazo}</span>
          <span>${projeto.integrantes} integrantes</span>
          <span>${projeto.tarefasConcluidas} tarefas concluídas</span>
        </div>
      `;

      list.appendChild(card);
    });
  }

  /* =========================================================
     5. SIDEBAR — menu recolhível no celular
     ========================================================= */

  function setupMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggle = document.getElementById('menuToggle');
    if (!sidebar || !overlay || !toggle) return;

    function openMenu() {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-visible');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-visible');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.contains('is-open');
      isOpen ? closeMenu() : openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    // fecha o menu ao navegar (comportamento esperado em mobile)
    sidebar.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
  }

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  document.addEventListener('DOMContentLoaded', () => {
    renderBarChart();
    renderAtividades();
    renderProjetos();
    setupMobileMenu();
  });
})();