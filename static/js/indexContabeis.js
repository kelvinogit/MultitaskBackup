/* ContábilHub - frontend demonstrativo.
   Esta camada usa dados mockados/localStorage apenas para simular o comportamento
   que posteriormente será substituído por Django Views, Forms e Models. */
document.addEventListener("DOMContentLoaded", function () {

const STORAGE_KEY = "contabilhub_frontend_v1";

const defaultData = {
  points: 350,
  level: 4,
  activities: [
    {id: 1, title: "Prova de Auditoria", subject: "Auditoria", type: "Prova", date: "2026-08-20", priority: "Alta", status: "Pendente", description: "Avaliação sobre procedimentos de auditoria."},
    {id: 2, title: "Trabalho de Custos", subject: "Contabilidade de Custos", type: "Trabalho", date: "2026-08-23", priority: "Média", status: "Em andamento", description: "Análise dos custos de produção."},
    {id: 3, title: "Seminário de Tributária", subject: "Contabilidade Tributária", type: "Seminário", date: "2026-08-27", priority: "Alta", status: "Pendente", description: "Apresentação sobre planejamento tributário."},
    {id: 4, title: "Exercícios de Gerencial", subject: "Contabilidade Gerencial", type: "Exercício", date: "2026-08-16", priority: "Baixa", status: "Concluída", description: "Lista de exercícios."},
    {id: 5, title: "Projeto de Análise Financeira", subject: "Análise das Demonstrações Contábeis", type: "Projeto", date: "2026-08-12", priority: "Alta", status: "Atrasada", description: "Projeto de análise financeira."}
  ],
  subjects: [
    {id: 1, name: "Contabilidade de Custos", professor: "Prof. Ricardo Mendes", semester: "4º semestre", progress: 72, activities: 5},
    {id: 2, name: "Contabilidade Tributária", professor: "Profa. Marina Alves", semester: "4º semestre", progress: 58, activities: 4},
    {id: 3, name: "Auditoria", professor: "Prof. Carlos Souza", semester: "4º semestre", progress: 81, activities: 6},
    {id: 4, name: "Contabilidade Gerencial", professor: "Profa. Juliana Lima", semester: "4º semestre", progress: 90, activities: 5},
    {id: 5, name: "Análise das Demonstrações Contábeis", professor: "Prof. André Silva", semester: "4º semestre", progress: 64, activities: 3}
  ],
  challengesDone: 15,
  challengeCorrect: 12,
  pointHistory: [
    {label: "Desafio contábil", points: 20, date: "Hoje"},
    {label: "Atividade concluída", points: 10, date: "Ontem"},
    {label: "Entrega antecipada", points: 15, date: "12/08"},
    {label: "Atividade complementar", points: 10, date: "10/08"}
  ]
};

let state = loadState();
let currentChallenge = 0;
let selectedAnswer = null;
let challengeAnswered = false;

const challenges = [
  {
    question: "Uma empresa apresentou determinado conjunto de informações financeiras. Qual indicador deve ser utilizado para analisar sua capacidade de pagamento no curto prazo?",
    options: ["Margem líquida", "Liquidez corrente", "Giro do ativo", "ROE"],
    correct: 1,
    explanation: "A liquidez corrente relaciona os ativos circulantes aos passivos circulantes e é utilizada para avaliar a capacidade de pagamento das obrigações de curto prazo."
  },
  {
    question: "Qual demonstração contábil apresenta a posição patrimonial e financeira da empresa em determinada data?",
    options: ["DRE", "DFC", "Balanço Patrimonial", "DMPL"],
    correct: 2,
    explanation: "O Balanço Patrimonial apresenta ativos, passivos e patrimônio líquido em determinada data."
  },
  {
    question: "Qual indicador é utilizado para avaliar o retorno obtido pelos acionistas sobre o patrimônio líquido?",
    options: ["ROE", "Liquidez seca", "Margem EBITDA", "Giro do estoque"],
    correct: 0,
    explanation: "ROE (Return on Equity) mede o retorno gerado sobre o patrimônio líquido."
  }
];

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(defaultData);
  } catch {
    return structuredClone(defaultData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function moneylessNumber(n) { return Number(n || 0).toLocaleString("pt-BR"); }

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const [y,m,d] = dateString.split("-");
  return `${d}/${m}`;
}

function statusClass(status) {
  if (status === "Concluída") return "status-concluida";
  if (status === "Em andamento") return "status-andamento";
  if (status === "Atrasada") return "status-atrasada";
  return "status-pendente";
}

function priorityClass(priority) {
  if (priority === "Alta") return "text-danger";
  if (priority === "Baixa") return "text-success";
  return "text-warning";
}

function showToast(message, type = "success") {
  const id = `toast-${Date.now()}`;
  const icon = type === "success" ? "check-circle-fill" : type === "danger" ? "x-circle-fill" : "info-circle-fill";
  document.getElementById("toastContainer").insertAdjacentHTML("beforeend", `
    <div id="${id}" class="toast border-0 shadow-sm" role="alert">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi bi-${icon} text-${type}"></i>${escapeHtml(message)}
      </div>
    </div>`);
  const toast = new bootstrap.Toast(document.getElementById(id), {delay: 2600});
  toast.show();
  setTimeout(() => document.getElementById(id)?.remove(), 3200);
}

const pageNames = {
  dashboard: "Dashboard",
  atividades: "Minhas Atividades",
  disciplinas: "Disciplinas",
  trabalhos: "Trabalhos em grupo",
  desafios: "Desafios Contábeis",
  calendario: "Calendário",
  pontuacao: "Pontuação",
  perfil: "Perfil",
  configuracoes: "Configurações"
};

function navigate(page) {
  if (!pageNames[page]) page = "dashboard";
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === page));
  document.getElementById("pageTitle").textContent = pageNames[page];
  document.getElementById("breadcrumb").textContent = pageNames[page];
  renderPage(page);
  closeSidebar();
}

function renderPage(page) {
  const container = document.getElementById("pageContent");
  const pages = {
    dashboard: renderDashboard,
    atividades: renderActivities,
    disciplinas: renderSubjects,
    trabalhos: renderWorkgroups,
    desafios: renderChallenges,
    calendario: renderCalendar,
    pontuacao: renderPoints,
    perfil: renderProfile,
    configuracoes: renderSettings
  };
  container.innerHTML = pages[page]();
  bindPageEvents(page);
}

function renderDashboard() {
  const pending = state.activities.filter(a => a.status === "Pendente").length;
  const progress = state.activities.filter(a => a.status === "Em andamento").length;
  const done = state.activities.filter(a => a.status === "Concluída").length;
  const late = state.activities.filter(a => a.status === "Atrasada").length;
  const total = state.activities.length || 1;
  const completion = Math.round((done / total) * 100);

  const upcoming = [...state.activities].sort((a,b) => a.date.localeCompare(b.date)).slice(0,4);

  return `
    <div class="welcome-card mb-4">
      <h2>Olá, Catarina! 👋</h2>
      <p>Organize suas atividades, acompanhe seus prazos e desenvolva suas competências contábeis.</p>
    </div>

    <div class="row g-3 mb-4">
      ${statCard("bi-hourglass-split", "bg-blue", pending, "Pendentes", "Priorize seus próximos prazos")}
      ${statCard("bi-arrow-repeat", "bg-orange", progress, "Em andamento", "Atividades em progresso")}
      ${statCard("bi-check2-circle", "bg-green", done, "Concluídas", "Você está avançando!")}
      ${statCard("bi-exclamation-triangle", "bg-red", late, "Atrasadas", "Precisam de atenção")}
    </div>

    <div class="row g-3 mb-4">
      <div class="col-xl-8">
        <div class="panel h-100">
          <div class="panel-header">
            <div><h3 class="section-title">Próximas atividades</h3><div class="section-subtitle">Seus próximos compromissos acadêmicos</div></div>
            <a href="#atividades" class="btn btn-light btn-sm">Ver todas <i class="bi bi-arrow-right ms-1"></i></a>
          </div>
          ${upcoming.map(a => `
            <div class="activity-row">
              <span class="activity-marker ${a.status === "Concluída" ? "bg-success" : a.status === "Atrasada" ? "bg-danger" : "bg-primary"}"></span>
              <div class="activity-info">
                <div class="activity-title">${escapeHtml(a.title)}</div>
                <div class="activity-meta">${escapeHtml(a.subject)} · ${escapeHtml(a.type)}</div>
              </div>
              <span class="badge-status ${statusClass(a.status)}">${escapeHtml(a.status)}</span>
              <div class="activity-date">${formatDate(a.date)}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="col-xl-4">
        <div class="panel h-100">
          <div class="panel-header">
            <div><h3 class="section-title">Progresso acadêmico</h3><div class="section-subtitle">Atividades concluídas</div></div>
            <strong class="text-primary fs-5">${completion}%</strong>
          </div>
          <div class="progress mb-3"><div class="progress-bar bg-primary" style="width:${completion}%"></div></div>
          <div class="d-flex justify-content-between small text-muted"><span>${done} concluídas</span><span>${state.activities.length} no total</span></div>
          <hr class="my-4">
          <div class="d-flex justify-content-between align-items-center">
            <div><div class="section-title">Pontuação</div><div class="section-subtitle">Seu progresso de gamificação</div></div>
            <strong class="fs-4">${moneylessNumber(state.points)}</strong>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-xl-7">
        <div class="panel h-100">
          <div class="panel-header">
            <div><h3 class="section-title">Minhas disciplinas</h3><div class="section-subtitle">Acompanhe seu desempenho por disciplina</div></div>
            <a href="#disciplinas" class="btn btn-light btn-sm">Ver disciplinas</a>
          </div>
          <div class="row g-3">
            ${state.subjects.slice(0,5).map(s => `
              <div class="col-md-6">
                <div class="border rounded-3 p-3">
                  <div class="d-flex gap-2 align-items-center mb-2">
                    <div class="subject-icon" style="width:34px;height:34px;font-size:15px"><i class="bi bi-journal-text"></i></div>
                    <div class="flex-grow-1"><div class="fw-semibold" style="font-size:11px">${escapeHtml(s.name)}</div><div class="text-muted" style="font-size:9px">${s.activities} atividades</div></div>
                    <strong style="font-size:10px">${s.progress}%</strong>
                  </div>
                  <div class="progress" style="height:5px"><div class="progress-bar" style="width:${s.progress}%"></div></div>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </div>
      <div class="col-xl-5">
        <div class="points-card h-100">
          <div class="points-label">Desafios contábeis</div>
          <div class="d-flex align-items-end gap-2 mt-1"><span class="points-number">${state.challengesDone}</span><span class="mb-2 text-white-50">realizados</span></div>
          <div class="mt-3 d-flex gap-4">
            <div><strong class="fs-5">${state.challengeCorrect}</strong><div class="points-label">Acertos</div></div>
            <div><strong class="fs-5">${Math.round(state.challengeCorrect / Math.max(state.challengesDone,1) * 100)}%</strong><div class="points-label">Aproveitamento</div></div>
          </div>
          <a href="#desafios" class="btn btn-light btn-sm mt-4">Continuar desafios <i class="bi bi-arrow-right ms-1"></i></a>
        </div>
      </div>
    </div>`;
}

function statCard(icon, color, value, label, trend) {
  return `<div class="col-md-6 col-xl-3"><div class="stat-card">
    <div class="stat-icon ${color}"><i class="bi ${icon}"></i></div>
    <div class="stat-value">${value}</div><div class="stat-label">${label}</div>
    <div class="stat-trend ${color === "bg-red" ? "down" : "up"}"><i class="bi bi-arrow-up-short"></i>${trend}</div>
  </div></div>`;
}

function renderActivities() {
  return `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div><h2 class="section-title fs-5">Minhas atividades</h2><div class="section-subtitle">Gerencie tarefas, provas e prazos acadêmicos.</div></div>
      <button class="btn btn-primary btn-sm" id="newActivityBtn"><i class="bi bi-plus-lg me-1"></i>Nova atividade</button>
    </div>

    <div class="panel mb-3">
      <div class="row g-2">
        <div class="col-lg-4"><div class="search-box w-100"><i class="bi bi-search"></i><input id="activitySearch" placeholder="Pesquisar atividade..."></div></div>
        <div class="col-6 col-lg-2"><select class="form-select" id="filterStatus"><option value="">Todos os status</option><option>Pendente</option><option>Em andamento</option><option>Concluída</option><option>Atrasada</option></select></div>
        <div class="col-6 col-lg-2"><select class="form-select" id="filterType"><option value="">Todos os tipos</option><option>Trabalho</option><option>Prova</option><option>Exercício</option><option>Seminário</option><option>Projeto</option></select></div>
        <div class="col-6 col-lg-2"><select class="form-select" id="filterPriority"><option value="">Prioridades</option><option>Alta</option><option>Média</option><option>Baixa</option></select></div>
        <div class="col-6 col-lg-2"><button class="btn btn-light w-100" id="clearFilters"><i class="bi bi-arrow-counterclockwise me-1"></i>Limpar</button></div>
      </div>
    </div>

    <div class="panel">
      <div class="table-responsive">
        <table class="table table-custom" id="activitiesTable">
          <thead><tr><th>Atividade</th><th>Disciplina</th><th>Tipo</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th class="text-end">Ações</th></tr></thead>
          <tbody id="activitiesBody">${activityRows(state.activities)}</tbody>
        </table>
      </div>
    </div>`;
}

function activityRows(items) {
  if (!items.length) return `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-inbox"></i><h4>Nenhuma atividade encontrada</h4><div>Crie uma nova atividade ou altere os filtros.</div></div></td></tr>`;
  return items.map(a => `
    <tr data-id="${a.id}">
      <td><div class="fw-semibold">${escapeHtml(a.title)}</div><div class="text-muted" style="font-size:9px">${escapeHtml(a.description || "")}</div></td>
      <td>${escapeHtml(a.subject)}</td><td>${escapeHtml(a.type)}</td>
      <td>${formatDate(a.date)}</td>
      <td><span class="${priorityClass(a.priority)} fw-semibold">${escapeHtml(a.priority)}</span></td>
      <td><span class="badge-status ${statusClass(a.status)}">${escapeHtml(a.status)}</span></td>
      <td class="text-end">
        <div class="dropdown">
          <button class="btn btn-light btn-sm" data-bs-toggle="dropdown"><i class="bi bi-three-dots"></i></button>
          <ul class="dropdown-menu dropdown-menu-end border-0 shadow-sm">
            <li><button class="dropdown-item edit-activity" data-id="${a.id}"><i class="bi bi-pencil me-2"></i>Editar</button></li>
            ${a.status !== "Concluída" ? `<li><button class="dropdown-item complete-activity" data-id="${a.id}"><i class="bi bi-check2 me-2"></i>Concluir</button></li>` : ""}
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger delete-activity" data-id="${a.id}"><i class="bi bi-trash me-2"></i>Excluir</button></li>
          </ul>
        </div>
      </td>
    </tr>`).join("");
}

function renderSubjects() {
  return `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div><h2 class="section-title fs-5">Disciplinas</h2><div class="section-subtitle">Organize suas matérias e acompanhe seu progresso.</div></div>
      <button class="btn btn-primary btn-sm" id="newSubjectBtn"><i class="bi bi-plus-lg me-1"></i>Nova disciplina</button>
    </div>
    <div class="row g-3">
      ${state.subjects.map((s,i) => `
        <div class="col-md-6 col-xl-4">
          <div class="subject-card">
            <div class="d-flex justify-content-between align-items-start">
              <div class="subject-icon"><i class="bi ${["bi-calculator","bi-bank","bi-search","bi-bar-chart-line","bi-pie-chart"][i%5]}"></i></div>
              <span class="badge bg-light text-dark">${s.semester}</span>
            </div>
            <h4>${escapeHtml(s.name)}</h4>
            <p>${escapeHtml(s.professor || "Professor não informado")}</p>
            <div class="d-flex justify-content-between mb-1"><span class="text-muted" style="font-size:9px">Progresso</span><strong style="font-size:10px">${s.progress}%</strong></div>
            <div class="progress mb-3"><div class="progress-bar" style="width:${s.progress}%"></div></div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="text-muted" style="font-size:9px"><i class="bi bi-check2-square me-1"></i>${s.activities} atividades</span>
              <button class="btn btn-light btn-sm subject-detail" data-id="${s.id}">Ver disciplina <i class="bi bi-arrow-right ms-1"></i></button>
            </div>
          </div>
        </div>`).join("")}
    </div>`;
}

function renderWorkgroups() {
  const workgroups = [
    {name:"Análise das Demonstrações Financeiras", subject:"Análise das Demonstrações Contábeis", progress:72, due:"28/08", members:[["João","Balanço Patrimonial","Concluída"],["Maria","DRE","Concluída"],["Pedro","Indicadores Financeiros","Em andamento"],["Ana","Apresentação","Pendente"]]},
    {name:"Projeto de Custos Empresariais", subject:"Contabilidade de Custos", progress:45, due:"03/09", members:[["Catarina","Levantamento de custos","Concluída"],["João","Custos fixos","Em andamento"],["Maria","Relatório final","Pendente"]]}
  ];
  return `
    <div class="d-flex justify-content-between align-items-center mb-4"><div><h2 class="section-title fs-5">Trabalhos em grupo</h2><div class="section-subtitle">Acompanhe participantes, tarefas e progresso.</div></div><button class="btn btn-primary btn-sm" id="newWorkBtn"><i class="bi bi-plus-lg me-1"></i>Novo trabalho</button></div>
    ${workgroups.map(w => `<div class="panel mb-3">
      <div class="d-flex flex-wrap justify-content-between gap-3 mb-3">
        <div><h3 class="section-title">${w.name}</h3><div class="section-subtitle">${w.subject} · Prazo ${w.due}</div></div>
        <div class="text-end"><strong class="fs-5">${w.progress}%</strong><div class="section-subtitle">concluído</div></div>
      </div>
      <div class="progress mb-4"><div class="progress-bar" style="width:${w.progress}%"></div></div>
      ${w.members.map(m => `<div class="activity-row">
        <div class="avatar" style="width:32px;height:32px;font-size:9px">${m[0].split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
        <div class="activity-info"><div class="activity-title">${m[0]}</div><div class="activity-meta">${m[1]}</div></div>
        <span class="badge-status ${statusClass(m[2])}">${m[2]}</span>
      </div>`).join("")}
    </div>`).join("")}`;
}

function renderChallenges() {
  const c = challenges[currentChallenge];
  return `
    <div class="text-center mb-4"><span class="badge-status status-andamento"><i class="bi bi-stars me-1"></i>Desafio Contábil</span><h2 class="section-title fs-4 mt-3">Teste seus conhecimentos</h2><div class="section-subtitle">Aprenda praticando situações relacionadas à profissão.</div></div>
    <div class="quiz-card">
      <div class="d-flex justify-content-between align-items-center"><span class="quiz-number">DESAFIO ${currentChallenge+1} DE ${challenges.length}</span><span class="text-muted small">${state.challengesDone} realizados</span></div>
      <div class="quiz-question">${c.question}</div>
      <div id="quizOptions">
        ${c.options.map((o,i) => `<button class="quiz-option ${selectedAnswer === i ? "selected" : ""}" data-answer="${i}" ${challengeAnswered ? "disabled":""}>
          <span class="option-letter">${String.fromCharCode(65+i)}</span><span>${o}</span>
          ${challengeAnswered && i === c.correct ? '<i class="bi bi-check-circle-fill text-success ms-auto"></i>' : ''}
          ${challengeAnswered && selectedAnswer === i && i !== c.correct ? '<i class="bi bi-x-circle-fill text-danger ms-auto"></i>' : ''}
        </button>`).join("")}
      </div>
      ${challengeAnswered ? `<div class="alert ${selectedAnswer === c.correct ? "alert-success" : "alert-danger"} mt-3 mb-0">
        <strong>${selectedAnswer === c.correct ? "Resposta correta! +20 pontos" : "Resposta incorreta"}</strong>
        <div class="small mt-1">${c.explanation}</div>
      </div>` : ""}
      <div class="d-flex justify-content-between align-items-center mt-4">
        <div class="text-muted small">Aproveitamento: <strong>${Math.round(state.challengeCorrect/Math.max(state.challengesDone,1)*100)}%</strong></div>
        ${challengeAnswered ? `<button class="btn btn-primary btn-sm" id="nextChallenge">Próximo desafio <i class="bi bi-arrow-right ms-1"></i></button>` : `<button class="btn btn-primary btn-sm" id="answerChallenge" disabled>Responder</button>`}
      </div>
    </div>`;
}

function renderCalendar() {
  const now = new Date(2026, 7, 1);
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year,month,1).getDay();
  const days = new Date(year,month+1,0).getDate();
  const prevDays = new Date(year,month,0).getDate();
  const events = {"20":"Prova de Auditoria","23":"Trabalho de Custos","27":"Seminário"};
  let cells = "";
  for(let i=0;i<42;i++){
    const dayNum = i-firstDay+1;
    let n = dayNum, muted=false;
    if(dayNum<=0){n=prevDays+dayNum; muted=true;}
    else if(dayNum>days){n=dayNum-days; muted=true;}
    const today = !muted && n===16;
    cells += `<div class="calendar-day ${muted?"muted":""} ${today?"today":""}">
      <div class="day-number">${n}</div>
      ${!muted && events[n] ? `<div class="calendar-event bg-primary-subtle text-primary">${events[n]}</div>` : ""}
    </div>`;
  }
  return `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4"><div><h2 class="section-title fs-5">Calendário acadêmico</h2><div class="section-subtitle">Visualize seus próximos compromissos.</div></div><button class="btn btn-light btn-sm"><i class="bi bi-plus-lg me-1"></i>Adicionar evento</button></div>
    <div class="panel"><div class="panel-header"><button class="btn btn-light btn-sm"><i class="bi bi-chevron-left"></i></button><h3 class="section-title">Agosto 2026</h3><button class="btn btn-light btn-sm"><i class="bi bi-chevron-right"></i></button></div>
    <div class="calendar-wrap"><div class="calendar-grid">
      ${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(x=>`<div class="calendar-head">${x}</div>`).join("")}${cells}
    </div></div></div>`;
}

function renderPoints() {
  const nextLevel = state.level * 100;
  const levelProgress = Math.min(100, Math.round((state.points % 100) / 100 * 100));
  return `
    <div class="row g-3 mb-4">
      <div class="col-lg-5"><div class="points-card h-100"><div class="points-label">Pontuação acumulada</div><div class="points-number">${moneylessNumber(state.points)}</div><div class="points-label">PONTOS</div><div class="mt-4 d-flex justify-content-between small"><span>Nível ${state.level}</span><span>${levelProgress}% para o próximo</span></div><div class="progress mt-2" style="background:rgba(255,255,255,.12)"><div class="progress-bar bg-info" style="width:${levelProgress}%"></div></div></div></div>
      <div class="col-lg-7"><div class="panel h-100"><div class="panel-header"><div><h3 class="section-title">Como ganhar pontos</h3><div class="section-subtitle">Continue avançando no ContábilHub</div></div></div>
      <div class="row g-2">${[["Concluir atividade","+10","bi-check2-circle"],["Entregar antes do prazo","+15","bi-clock"],["Concluir desafio","+20","bi-lightbulb"],["Atividade complementar","+10","bi-stars"]].map(x=>`<div class="col-sm-6"><div class="border rounded-3 p-3 d-flex align-items-center gap-3"><div class="stat-icon bg-blue mb-0" style="width:34px;height:34px;font-size:15px"><i class="bi ${x[2]}"></i></div><div class="flex-grow-1"><div class="fw-semibold" style="font-size:11px">${x[0]}</div><div class="text-success fw-bold" style="font-size:11px">${x[1]} pontos</div></div></div></div>`).join("")}</div>
      </div></div>
    </div>
    <div class="panel"><div class="panel-header"><div><h3 class="section-title">Histórico de pontos</h3><div class="section-subtitle">Suas últimas conquistas</div></div></div>
    ${state.pointHistory.map(p=>`<div class="activity-row"><div class="stat-icon bg-blue mb-0" style="width:34px;height:34px;font-size:14px"><i class="bi bi-plus-lg"></i></div><div class="activity-info"><div class="activity-title">${p.label}</div><div class="activity-meta">${p.date}</div></div><strong class="text-success">+${p.points}</strong></div>`).join("")}</div>`;
}

function renderProfile() {
  return `
    <div class="panel p-0 overflow-hidden mb-3"><div class="profile-cover"><div class="profile-avatar">CM</div></div><div class="profile-body"><div class="d-flex flex-wrap justify-content-between align-items-start gap-3"><div><h2 class="section-title fs-5">Catarina Momesso</h2><div class="section-subtitle">Estudante de Ciências Contábeis · 4º semestre</div></div><button class="btn btn-primary btn-sm" id="editProfile"><i class="bi bi-pencil me-1"></i>Editar perfil</button></div>
    <div class="row g-3 mt-3"><div class="col-md-4"><div class="border rounded-3 p-3"><div class="text-muted small">E-mail</div><strong style="font-size:11px">catarina@exemplo.com</strong></div></div><div class="col-md-4"><div class="border rounded-3 p-3"><div class="text-muted small">Data de cadastro</div><strong style="font-size:11px">Janeiro de 2026</strong></div></div><div class="col-md-4"><div class="border rounded-3 p-3"><div class="text-muted small">Pontuação</div><strong style="font-size:11px">${state.points} pontos</strong></div></div></div></div></div>
    <div class="row g-3"><div class="col-md-4"><div class="stat-card"><div class="stat-value">${state.activities.length}</div><div class="stat-label">Atividades cadastradas</div></div></div><div class="col-md-4"><div class="stat-card"><div class="stat-value">${state.challengesDone}</div><div class="stat-label">Desafios realizados</div></div></div><div class="col-md-4"><div class="stat-card"><div class="stat-value">${Math.round(state.challengeCorrect/Math.max(state.challengesDone,1)*100)}%</div><div class="stat-label">Aproveitamento</div></div></div></div>`;
}

function renderSettings() {
  return `
    <div class="row g-3"><div class="col-lg-8"><div class="panel">
      <div class="panel-header"><div><h3 class="section-title">Preferências</h3><div class="section-subtitle">Personalize sua experiência no ContábilHub.</div></div></div>
      ${settingRow("Notificações de prazos","Receber lembretes sobre atividades próximas.",true)}
      ${settingRow("Resumo semanal","Receber um resumo do seu progresso acadêmico.",true)}
      ${settingRow("Mostrar pontuação","Exibir sua pontuação nas telas do sistema.",true)}
      ${settingRow("Modo compacto","Reduzir espaçamentos para visualizar mais informações.",false)}
    </div></div>
    <div class="col-lg-4"><div class="panel"><div class="panel-header"><div><h3 class="section-title">Segurança</h3><div class="section-subtitle">Conta e senha</div></div></div><button class="btn btn-light btn-sm w-100 mb-2">Alterar senha</button><button class="btn btn-light btn-sm w-100 text-danger">Encerrar sessão</button></div></div></div>`;
}

function settingRow(title, desc, checked) {
  return `<div class="d-flex justify-content-between align-items-center py-3 border-bottom"><div><div class="fw-semibold" style="font-size:11px">${title}</div><div class="text-muted" style="font-size:10px">${desc}</div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" ${checked?"checked":""}></div></div>`;
}

function bindPageEvents(page) {
  if(page === "atividades") bindActivities();
  if(page === "disciplinas") bindSubjects();
  if(page === "desafios") bindChallenges();
}

function bindActivities() {
  document.getElementById("newActivityBtn")?.addEventListener("click", () => openActivityModal());
  ["activitySearch","filterStatus","filterType","filterPriority"].forEach(id => document.getElementById(id)?.addEventListener("input", filterActivities));
  document.getElementById("clearFilters")?.addEventListener("click", () => {
    ["activitySearch","filterStatus","filterType","filterPriority"].forEach(id => document.getElementById(id).value = "");
    filterActivities();
  });
  document.querySelectorAll(".edit-activity").forEach(btn => btn.addEventListener("click", () => openActivityModal(Number(btn.dataset.id))));
  document.querySelectorAll(".complete-activity").forEach(btn => btn.addEventListener("click", () => completeActivity(Number(btn.dataset.id))));
  document.querySelectorAll(".delete-activity").forEach(btn => btn.addEventListener("click", () => deleteActivity(Number(btn.dataset.id))));
}

function filterActivities() {
  const q = document.getElementById("activitySearch").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;
  const type = document.getElementById("filterType").value;
  const priority = document.getElementById("filterPriority").value;
  const filtered = state.activities.filter(a =>
    (!q || `${a.title} ${a.subject}`.toLowerCase().includes(q)) &&
    (!status || a.status === status) &&
    (!type || a.type === type) &&
    (!priority || a.priority === priority)
  );
  document.getElementById("activitiesBody").innerHTML = activityRows(filtered);
  bindActivities();
}

function openActivityModal(id = null) {
  const form = document.getElementById("activityForm");
  form.reset();
  document.getElementById("activityId").value = "";
  document.getElementById("activityModalTitle").textContent = id ? "Editar atividade" : "Nova atividade";
  if(id) {
    const a = state.activities.find(x => x.id === id);
    if(!a) return;
    document.getElementById("activityId").value = a.id;
    document.getElementById("activityTitle").value = a.title;
    document.getElementById("activityType").value = a.type;
    document.getElementById("activitySubject").value = a.subject;
    document.getElementById("activityDate").value = a.date;
    document.getElementById("activityPriority").value = a.priority;
    document.getElementById("activityStatus").value = a.status === "Atrasada" ? "Pendente" : a.status;
    document.getElementById("activityDescription").value = a.description || "";
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById("activityModal")).show();
}

function completeActivity(id) {
  const a = state.activities.find(x => x.id === id);
  if(!a || a.status === "Concluída") return;
  a.status = "Concluída";
  state.points += 10;
  state.pointHistory.unshift({label:"Atividade concluída",points:10,date:"Agora"});
  saveState(); renderPage("atividades"); showToast("Atividade concluída. +10 pontos!");
}

function deleteActivity(id) {
  const a = state.activities.find(x => x.id === id);
  if(!a) return;
  if(confirm(`Excluir "${a.title}"?`)) {
    state.activities = state.activities.filter(x => x.id !== id);
    saveState(); renderPage("atividades"); showToast("Atividade excluída.");
  }
}

function bindSubjects() {
  document.getElementById("newSubjectBtn")?.addEventListener("click", () => {
    document.getElementById("subjectForm").reset();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("subjectModal")).show();
  });
  document.querySelectorAll(".subject-detail").forEach(btn => btn.addEventListener("click", () => {
    const s = state.subjects.find(x => x.id === Number(btn.dataset.id));
    if(s) showToast(`${s.name}: ${s.progress}% de progresso.`, "success");
  }));
}

function bindChallenges() {
  document.querySelectorAll(".quiz-option").forEach(btn => btn.addEventListener("click", () => {
    if(challengeAnswered) return;
    selectedAnswer = Number(btn.dataset.answer);
    document.querySelectorAll(".quiz-option").forEach(x => x.classList.remove("selected"));
    btn.classList.add("selected");
    document.getElementById("answerChallenge").disabled = false;
  }));
  document.getElementById("answerChallenge")?.addEventListener("click", answerChallenge);
  document.getElementById("nextChallenge")?.addEventListener("click", () => {
    currentChallenge = (currentChallenge + 1) % challenges.length;
    selectedAnswer = null; challengeAnswered = false; renderPage("desafios");
  });
}

function answerChallenge() {
  if(selectedAnswer === null) return;
  const c = challenges[currentChallenge];
  challengeAnswered = true;
  state.challengesDone++;
  if(selectedAnswer === c.correct) {
    state.challengeCorrect++;
    state.points += 20;
    state.pointHistory.unshift({label:"Desafio contábil concluído",points:20,date:"Agora"});
  }
  saveState(); renderPage("desafios");
}

document.getElementById("activityForm").addEventListener("submit", e => {
  e.preventDefault();
  const id = Number(document.getElementById("activityId").value);
  const payload = {
    title: document.getElementById("activityTitle").value.trim(),
    type: document.getElementById("activityType").value,
    subject: document.getElementById("activitySubject").value,
    date: document.getElementById("activityDate").value,
    priority: document.getElementById("activityPriority").value,
    status: document.getElementById("activityStatus").value,
    notes: document.getElementById("activityNotes").value,
    description: document.getElementById("activityDescription").value.trim()
  };
  if(!payload.title || !payload.date) return;
  if(id) {
    const index = state.activities.findIndex(a => a.id === id);
    if(index >= 0) state.activities[index] = {...state.activities[index], ...payload};
    showToast("Atividade atualizada.");
  } else {
    state.activities.unshift({id: Date.now(), ...payload});
    showToast("Atividade criada.");
  }
  saveState();
  bootstrap.Modal.getInstance(document.getElementById("activityModal")).hide();
  renderPage("atividades");
});

document.getElementById("subjectForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("subjectName").value.trim();
  if(!name) return;
  state.subjects.push({
    id: Date.now(), name,
    professor: document.getElementById("subjectProfessor").value.trim(),
    semester: document.getElementById("subjectSemester").value.trim() || "Semestre não informado",
    progress: 0, activities: 0
  });
  saveState();
  bootstrap.Modal.getInstance(document.getElementById("subjectModal")).hide();
  renderPage("disciplinas");
  showToast("Disciplina adicionada.");
});

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");
}

document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebarOverlay").classList.add("show");
});
document.getElementById("sidebarOverlay").addEventListener("click", closeSidebar);

document.querySelectorAll("[data-page]").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    location.hash = link.dataset.page;
  });
});

window.addEventListener("hashchange", () => navigate(location.hash.replace("#","") || "dashboard"));

document.getElementById("globalSearch").addEventListener("keydown", e => {
  if(e.key === "Enter") {
    const query = e.target.value.trim();
    if(query) {
      location.hash = "atividades";
      setTimeout(() => {
        const input = document.getElementById("activitySearch");
        if(input) { input.value = query; filterActivities(); }
      }, 50);
    }
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => showToast("Logout simulado no frontend.", "info"));
document.getElementById("logoutDropdown").addEventListener("click", () => showToast("Logout simulado no frontend.", "info"));

navigate(location.hash.replace("#","") || "dashboard");
})();