/* =========================================================
   Listagem de projetos
   - resumo animado, busca, filtro de situação e ordenação
   - barra de progresso e prazo calculados no navegador
   - edição em modal via fetch (view projeto_update -> JsonResponse)
   - exclusão com confirmação
   Local sugerido: static/js/agro/projeto_list.js
   ========================================================= */

(function () {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* =======================================================
     UTILIDADES
     ======================================================= */
  const fold = (s) =>
    String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const plural = (n, one, many) => (n === 1 ? one : many);

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function foldWithMap(text) {
    let folded = "";
    const map = [];
    for (let i = 0; i < text.length; i++) {
      const f = fold(text[i]);
      for (let j = 0; j < f.length; j++) map.push(i);
      folded += f;
    }
    return { folded, map };
  }

  // Escreve `text` dentro de `el`, destacando os termos buscados
  function highlightInto(el, text, tokens) {
    el.textContent = "";
    if (!text || tokens.length === 0) {
      el.textContent = text || "";
      return;
    }

    const { folded, map } = foldWithMap(text);
    const ranges = [];

    tokens.forEach((token) => {
      let from = 0;
      let idx;
      while ((idx = folded.indexOf(token, from)) !== -1) {
        ranges.push([map[idx], map[idx + token.length - 1] + 1]);
        from = idx + token.length;
      }
    });

    if (ranges.length === 0) {
      el.textContent = text;
      return;
    }

    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [ranges[0].slice()];
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
      else merged.push(ranges[i].slice());
    }

    let cursor = 0;
    merged.forEach(([start, end]) => {
      if (start > cursor) {
        el.appendChild(document.createTextNode(text.slice(cursor, start)));
      }
      const mark = document.createElement("mark");
      mark.className = "search-hit";
      mark.textContent = text.slice(start, end);
      el.appendChild(mark);
      cursor = end;
    });
    if (cursor < text.length) {
      el.appendChild(document.createTextNode(text.slice(cursor)));
    }
  }

  /* ----- Datas (horário local) ----- */
  function parseISODate(value) {
    const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(date.getTime()) ? null : date;
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function formatBR(date) {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()}`;
  }

  function describeDeadline(date, done) {
    if (!date) return { text: "", tone: "" };
    if (done) return { text: "Concluído", tone: "is-done" };

    const diff = Math.round((date - startOfToday()) / 86400000);
    if (diff < 0) {
      const n = -diff;
      return { text: `Atrasado há ${n} ${plural(n, "dia", "dias")}`, tone: "is-late" };
    }
    if (diff === 0) return { text: "Vence hoje", tone: "is-today" };
    if (diff === 1) return { text: "Vence amanhã", tone: "is-soon" };
    return {
      text: `Faltam ${diff} dias`,
      tone: diff <= 7 ? "is-soon" : "is-ok",
    };
  }

  function formatPct(value) {
    const n = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
    return `${n}%`;
  }

  /* ----- Situação "efetiva" de cada projeto -----
     concluido  -> done
     atrasado, ou prazo vencido sem concluir -> late
     andamento  -> progress
     demais     -> pending                                  */
  function stateOf(row) {
    const status = row.dataset.status;
    if (status === "concluido") return "done";
    const date = parseISODate(row.dataset.prazo);
    const overdue = date && date < startOfToday();
    if (status === "atrasado" || overdue) return "late";
    if (status === "andamento") return "progress";
    return "pending";
  }

  /* ----- Rede ----- */
  function getToken() {
    const el =
      document.querySelector('#projEditForm input[name="csrfmiddlewaretoken"]') ||
      document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (el && el.value) return el.value;
    const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      body,
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getToken(),
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
    });
    // sessão expirada: o Django redireciona para a tela de login
    if (res.redirected && /login/i.test(res.url)) throw new Error("session");
    return res;
  }

  /* ----- Avisos (toast) ----- */
  let toastStack = null;
  function showToast(message, type) {
    if (!toastStack) {
      toastStack = document.createElement("div");
      toastStack.className = "proj-toast-stack";
      toastStack.setAttribute("aria-live", "polite");
      document.body.appendChild(toastStack);
    }
    const toast = document.createElement("div");
    toast.className = `proj-toast is-${type || "success"}`;
    toast.textContent = message;
    toastStack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-in"));
    setTimeout(() => {
      toast.classList.remove("is-in");
      setTimeout(() => toast.remove(), 300);
    }, 3400);
  }

  /* ----- Contador animado ----- */
  function setNumber(el, to) {
    const from = parseInt(el.textContent, 10);
    const start = Number.isNaN(from) ? 0 : from;
    if (el._raf) cancelAnimationFrame(el._raf);

    if (reduceMotion || start === to) {
      el.textContent = String(to);
      return;
    }

    const duration = 600;
    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp((now - t0) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(start + (to - start) * eased));
      if (p < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* =======================================================
     INICIALIZAÇÃO
     ======================================================= */
  function init() {
    const panel = document.querySelector(".proj-panel");
    if (!panel) return;

    const tbody = panel.querySelector(".proj-table tbody");
    if (!tbody) return; // estado vazio: nada a fazer

    let rows = Array.from(tbody.querySelectorAll(".proj-row"));

    const searchInput = document.getElementById("projSearch");
    const stateSelect = document.getElementById("projStatusFilter");
    const emptyDynamic = panel.querySelector(".proj-empty-dynamic");
    const visibleEl = panel.querySelector("[data-visible-count]");
    const totalEl = panel.querySelector("[data-total-count]");
    const summaryEls = Array.from(panel.querySelectorAll("[data-count]"));
    const sortButtons = Array.from(panel.querySelectorAll("[data-sort]"));

    let query = "";
    let stateFilter = "todos";
    const sort = { key: null, dir: 1 };

    /* ---------- Preparação das linhas ---------- */
    rows.forEach((row, index) => {
      row._order = index;
      row.style.setProperty("--i", Math.min(index, 14));
      const badge = row.querySelector(".proj-status");
      row.dataset.statusDisplay = badge ? badge.textContent.trim() : row.dataset.status;
    });
    setTimeout(() => tbody.classList.add("is-ready"), 1400);

    /* ---------- Pintura de cada linha ---------- */
    function paintMeta(row) {
      const d = row.dataset;
      const done = d.status === "concluido";
      const date = parseISODate(d.prazo);

      d.state = stateOf(row);

      const dateEl = row.querySelector(".proj-date");
      if (dateEl) dateEl.textContent = date ? formatBR(date) : "Sem prazo";

      const deadlineEl = row.querySelector(".proj-deadline");
      if (deadlineEl) {
        const info = describeDeadline(date, done);
        deadlineEl.textContent = info.text;
        deadlineEl.className = `proj-deadline ${info.tone}`.trim();
      }

      const badge = row.querySelector(".proj-status");
      if (badge) badge.textContent = d.statusDisplay || d.status;

      const pct = clamp(parseFloat(d.progresso) || 0, 0, 100);
      const track = row.querySelector(".proj-progress-track");
      const fill = row.querySelector(".proj-progress-fill");
      const label = row.querySelector(".proj-progress-label");

      if (track) {
        track.setAttribute("aria-valuenow", String(Math.round(pct)));
        track.setAttribute("aria-label", `Progresso de ${d.nome}`);
      }
      if (label) label.textContent = formatPct(pct);
      if (fill) {
        const tone =
          pct >= 100 ? "is-full" : pct >= 67 ? "is-high" : pct >= 34 ? "is-mid" : "is-low";
        fill.className = `proj-progress-fill ${tone}`;
        // dois frames: garante que a largura 0 foi pintada antes de animar
        requestAnimationFrame(() =>
          requestAnimationFrame(() => (fill.style.width = `${pct}%`))
        );
      }
    }

    function paintText(row, tokens) {
      const d = row.dataset;
      const nameEl = row.querySelector(".proj-name");
      const cell = row.querySelector(".col-name");
      let descEl = row.querySelector(".proj-desc");
      const desc = d.descricao || "";

      if (desc && !descEl) {
        descEl = document.createElement("span");
        descEl.className = "proj-desc";
        cell.appendChild(descEl);
      } else if (!desc && descEl) {
        descEl.remove();
        descEl = null;
      }

      if (nameEl) highlightInto(nameEl, d.nome || "", tokens);
      if (descEl) highlightInto(descEl, desc, tokens);
    }

    /* ---------- Resumo ---------- */
    function updateSummary() {
      const counts = { total: rows.length, progress: 0, done: 0, late: 0 };
      rows.forEach((r) => {
        if (counts[r.dataset.state] !== undefined) counts[r.dataset.state]++;
      });
      summaryEls.forEach((el) => {
        const value = counts[el.dataset.count];
        if (value !== undefined) setNumber(el, value);
      });
    }

    /* ---------- Busca + filtro ---------- */
    function applyFilters() {
      const tokens = fold(query).split(/\s+/).filter(Boolean);
      let visible = 0;

      rows.forEach((row) => {
        const hay = fold(`${row.dataset.nome || ""} ${row.dataset.descricao || ""}`);
        const okText = tokens.every((t) => hay.includes(t));
        const okState = stateFilter === "todos" || row.dataset.state === stateFilter;
        const show = okText && okState;

        row.hidden = !show;
        paintText(row, show ? tokens : []);
        if (show) visible++;
      });

      if (emptyDynamic) emptyDynamic.hidden = visible !== 0;
      if (visibleEl) visibleEl.textContent = String(visible);
      if (totalEl) totalEl.textContent = String(rows.length);
    }

    /* ---------- Ordenação ---------- */
    function compareRows(a, b) {
      const { key, dir } = sort;
      let result = 0;

      if (key === "nome") {
        result = (a.dataset.nome || "").localeCompare(b.dataset.nome || "", "pt-BR", {
          sensitivity: "base",
        });
      } else if (key === "prazo") {
        const pa = a.dataset.prazo || "";
        const pb = b.dataset.prazo || "";
        if (!pa && !pb) result = 0;
        else if (!pa) return 1; // sem prazo sempre no fim
        else if (!pb) return -1;
        else result = pa.localeCompare(pb);
      } else if (key === "progresso") {
        result = (parseFloat(a.dataset.progresso) || 0) - (parseFloat(b.dataset.progresso) || 0);
      }

      return result !== 0 ? result * dir : a._order - b._order;
    }

    function applySort() {
      const list = rows.slice();
      if (sort.key) list.sort(compareRows);
      else list.sort((a, b) => a._order - b._order);
      list.forEach((r) => tbody.appendChild(r));

      sortButtons.forEach((btn) => {
        const th = btn.closest("th");
        if (!th) return;
        let value = "none";
        if (btn.dataset.sort === sort.key) value = sort.dir === 1 ? "ascending" : "descending";
        th.setAttribute("aria-sort", value);
      });
    }

    sortButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (sort.key !== key) {
          sort.key = key;
          sort.dir = 1;
        } else if (sort.dir === 1) {
          sort.dir = -1;
        } else {
          sort.key = null; // terceiro clique volta à ordem original
          sort.dir = 1;
        }
        applySort();
      });
    });

    /* ---------- Eventos de busca / filtro ---------- */
    if (searchInput) {
      const run = debounce(() => {
        query = searchInput.value;
        applyFilters();
      }, 120);
      searchInput.addEventListener("input", run);
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && searchInput.value) {
          e.preventDefault();
          searchInput.value = "";
          query = "";
          applyFilters();
        }
      });
    }

    if (stateSelect) {
      stateSelect.addEventListener("change", () => {
        stateFilter = stateSelect.value;
        applyFilters();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || !searchInput) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (document.querySelector("dialog[open]")) return;
      const modal = document.getElementById("projModal");
      if (modal && !modal.hidden) return;
      e.preventDefault();
      searchInput.focus();
    });

    /* ---------- Render inicial ---------- */
    rows.forEach(paintMeta);
    applyFilters();
    updateSummary();

    /* =====================================================
       MODAL DE EDIÇÃO
       ===================================================== */
    const modal = document.getElementById("projModal");
    const form = document.getElementById("projEditForm");

    let editingRow = null;
    let lastTrigger = null;
    let saving = false;
    let closing = false;

    if (modal && form) {
      const idInput = document.getElementById("projEditId");
      const nomeInput = document.getElementById("projEditNome");
      const descInput = document.getElementById("projEditDescricao");
      const prazoInput = document.getElementById("projEditPrazo");
      const statusInput = document.getElementById("projEditStatus");
      const feitosInput = document.getElementById("projEditFeitos");
      const formError = document.getElementById("projEditFormError");
      const submitBtn = document.getElementById("projEditSubmit");

      const clearErrors = () => {
        form.querySelectorAll(".proj-field-error").forEach((el) => (el.textContent = ""));
        form
          .querySelectorAll(".proj-field.has-error")
          .forEach((el) => el.classList.remove("has-error", "is-shaking"));
        formError.hidden = true;
        formError.textContent = "";
      };

      const showFormError = (message) => {
        formError.textContent = message;
        formError.hidden = false;
      };

      const normalizeMessages = (value) =>
        (Array.isArray(value) ? value : [value])
          .map((m) => (m && typeof m === "object" ? m.message || "" : String(m)))
          .filter(Boolean);

      function showFieldErrors(erros) {
        const general = [];
        let firstControl = null;

        Object.entries(erros || {}).forEach(([key, value]) => {
          const messages = normalizeMessages(value);
          if (messages.length === 0) return;

          const slot =
            key !== "__all__" && form.querySelector(`[data-error-for="${CSS.escape(key)}"]`);

          if (!slot) {
            general.push(...messages);
            return;
          }

          slot.textContent = messages.join(" ");
          const field = slot.closest(".proj-field");
          if (field) {
            field.classList.add("has-error");
            if (!firstControl) firstControl = field;
          }
        });

        if (general.length) showFormError(general.join(" "));
        else if (!firstControl) showFormError("Confira os dados informados e tente novamente.");

        if (firstControl) {
          firstControl.classList.add("is-shaking");
          firstControl.addEventListener(
            "animationend",
            () => firstControl.classList.remove("is-shaking"),
            { once: true }
          );
          const control = firstControl.querySelector("input, select, textarea");
          if (control) control.focus();
        }
      }

      // some o erro do campo assim que a pessoa começa a corrigir
      form.addEventListener("input", (e) => {
        const field = e.target.closest(".proj-field");
        if (!field || !field.classList.contains("has-error")) return;
        field.classList.remove("has-error");
        const slot = field.querySelector(".proj-field-error");
        if (slot) slot.textContent = "";
      });

      function setSaving(value) {
        saving = value;
        submitBtn.disabled = value;
        submitBtn.classList.toggle("is-loading", value);
        submitBtn.textContent = value ? "Salvando..." : "Salvar";
      }

      function openEdit(row, trigger) {
        const d = row.dataset;
        editingRow = row;
        lastTrigger = trigger || null;

        idInput.value = d.id || "";
        nomeInput.value = d.nome || "";
        descInput.value = d.descricao || "";
        prazoInput.value = d.prazoInput || "";
        statusInput.value = d.status || "planejamento";
        feitosInput.value = d.feitos || "";

        clearErrors();
        setSaving(false);

        modal.hidden = false;
        document.body.classList.add("proj-modal-open");
        requestAnimationFrame(() => modal.classList.add("is-open"));
        nomeInput.focus();
      }

      function closeModal() {
        if (modal.hidden || saving || closing) return;
        closing = true;
        modal.classList.remove("is-open");

        const finish = () => {
          modal.hidden = true;
          document.body.classList.remove("proj-modal-open");
          closing = false;
          if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus();
          editingRow = null;
        };
        if (reduceMotion) finish();
        else setTimeout(finish, 200);
      }

      modal.addEventListener("click", (e) => {
        if (e.target.closest("[data-modal-close]")) closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if (modal.hidden) return;

        if (e.key === "Escape") {
          e.preventDefault();
          closeModal();
          return;
        }

        if (e.key === "Tab") {
          const focusables = Array.from(
            modal.querySelectorAll(
              "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
            )
          ).filter((el) => el.offsetParent !== null);
          if (focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });

      /* ----- Aplica na tela o JSON devolvido pela view ----- */
      function applyUpdate(row, p, submittedPrazo) {
        const d = row.dataset;

        d.nome = p.nome != null ? String(p.nome) : d.nome;
        d.descricao = p.descricao != null ? String(p.descricao) : "";
        d.feitos = p.feitos != null ? String(p.feitos) : "";
        d.status = p.status || d.status;
        d.statusDisplay = p.status_display || d.status;
        d.progresso = String(p.progresso != null ? p.progresso : 0);

        // a view não devolve o prazo: usa o enviado (ou o da resposta, se existir)
        const prazoRaw = p.prazo || submittedPrazo;
        if (typeof prazoRaw === "string") {
          const iso = prazoRaw.trim().replace(" ", "T");
          d.prazo = iso.slice(0, 10);
          d.prazoInput = iso.length >= 16 ? iso.slice(0, 16) : "";
        }

        paintMeta(row);
        applyFilters();
        applySort();
        updateSummary();

        row.classList.remove("is-updated");
        void row.offsetWidth; // reinicia a animação
        row.classList.add("is-updated");
        setTimeout(() => row.classList.remove("is-updated"), 1800);
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (saving || !editingRow) return;

        clearErrors();

        if (!nomeInput.value.trim()) {
          showFieldErrors({ nome: ["Informe o nome do projeto."] });
          return;
        }

        const row = editingRow;
        const formData = new FormData(form);
        setSaving(true);

        try {
          const res = await post(row.dataset.updateUrl, formData);

          let data = null;
          try {
            data = await res.json();
          } catch (_) {
            data = null;
          }
          if (!data) throw new Error("bad-response");

          if (!data.ok) {
            showFieldErrors(data.erros || {});
            return;
          }

          applyUpdate(row, data.projeto || {}, formData.get("prazo"));
          setSaving(false);
          closeModal();
          showToast("Projeto atualizado com sucesso.");
        } catch (err) {
          showFormError(
            err && err.message === "session"
              ? "Sua sessão expirou. Recarregue a página e entre novamente."
              : "Não foi possível salvar agora. Tente novamente em instantes."
          );
        } finally {
          setSaving(false);
        }
      });

      panel.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-edit-projeto]");
        if (!btn) return;
        const row = btn.closest(".proj-row");
        if (row) openEdit(row, btn);
      });
    }

    /* =====================================================
       EXCLUSÃO COM CONFIRMAÇÃO
       ===================================================== */
    let confirmDialog = null;
    let confirmRow = null;
    let confirmTrigger = null;
    let deleting = false;
    let confirmName, confirmOk, confirmCancel, confirmError;

    function buildConfirm() {
      confirmDialog = document.createElement("dialog");
      confirmDialog.className = "proj-confirm";
      confirmDialog.setAttribute("aria-labelledby", "projConfirmTitle");
      confirmDialog.innerHTML = `
        <div class="proj-confirm-body">
          <div class="proj-confirm-icon" aria-hidden="true">!</div>
          <h3 id="projConfirmTitle">Excluir projeto?</h3>
          <p class="proj-confirm-text">
            Você está prestes a excluir <strong class="proj-confirm-name"></strong>.
            Essa ação não pode ser desfeita.
          </p>
          <p class="proj-confirm-error" hidden></p>
          <div class="proj-confirm-actions">
            <button type="button" class="proj-confirm-cancel">Cancelar</button>
            <button type="button" class="proj-confirm-ok">Sim, excluir</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      confirmName = confirmDialog.querySelector(".proj-confirm-name");
      confirmOk = confirmDialog.querySelector(".proj-confirm-ok");
      confirmCancel = confirmDialog.querySelector(".proj-confirm-cancel");
      confirmError = confirmDialog.querySelector(".proj-confirm-error");

      confirmCancel.addEventListener("click", () => {
        if (!deleting) confirmDialog.close();
      });
      confirmDialog.addEventListener("click", (e) => {
        if (e.target === confirmDialog && !deleting) confirmDialog.close();
      });
      confirmDialog.addEventListener("cancel", (e) => {
        if (deleting) e.preventDefault();
      });
      confirmDialog.addEventListener("close", () => {
        if (confirmTrigger && document.body.contains(confirmTrigger)) confirmTrigger.focus();
      });
      confirmOk.addEventListener("click", () => confirmDelete());
    }

    function openConfirm(row, trigger) {
      const nome = row.dataset.nome || "este projeto";
      confirmRow = row;
      confirmTrigger = trigger;

      if (typeof HTMLDialogElement === "undefined" || !document.createElement("dialog").showModal) {
        if (window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
          confirmRow = row;
          confirmDelete(true);
        }
        return;
      }

      if (!confirmDialog) buildConfirm();
      confirmName.textContent = nome;
      confirmError.hidden = true;
      confirmOk.disabled = false;
      confirmOk.classList.remove("is-loading");
      confirmOk.textContent = "Sim, excluir";
      confirmDialog.showModal();
      confirmCancel.focus();
    }

    async function confirmDelete(noDialog) {
      const row = confirmRow;
      if (!row || deleting) return;

      deleting = true;
      if (!noDialog) {
        confirmOk.disabled = true;
        confirmOk.classList.add("is-loading");
        confirmOk.textContent = "Excluindo...";
        confirmError.hidden = true;
      }

      try {
        const body = new URLSearchParams({ csrfmiddlewaretoken: getToken() });
        const res = await post(row.dataset.deleteUrl, body);

        let ok = res.ok;
        const type = res.headers.get("content-type") || "";
        if (type.includes("application/json")) {
          const data = await res.json();
          ok = ok && data.ok !== false;
        }
        if (!ok) throw new Error("delete-failed");

        deleting = false;
        if (!noDialog) confirmDialog.close();
        removeRow(row);
        showToast("Projeto excluído.");
      } catch (err) {
        deleting = false;
        const message =
          err && err.message === "session"
            ? "Sua sessão expirou. Recarregue a página e entre novamente."
            : "Não foi possível excluir agora. Tente novamente.";

        if (noDialog || !confirmDialog.open) {
          showToast(message, "error");
        } else {
          confirmError.textContent = message;
          confirmError.hidden = false;
          confirmOk.disabled = false;
          confirmOk.classList.remove("is-loading");
          confirmOk.textContent = "Tentar novamente";
        }
      }
    }

    function removeRow(row) {
      row.classList.add("is-removing");
      setTimeout(
        () => {
          row.remove();
          rows = rows.filter((r) => r !== row);

          if (rows.length === 0) {
            window.location.reload(); // mostra o estado vazio do servidor
            return;
          }
          applyFilters();
          updateSummary();
        },
        reduceMotion ? 0 : 350
      );
    }

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-projeto]");
      if (!btn) return;
      const row = btn.closest(".proj-row");
      if (row) openConfirm(row, btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();