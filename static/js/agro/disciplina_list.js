/* =========================================================
   Listagem de disciplinas — busca ao vivo, filtro por semestre,
   "ver mais" e modal de exclusão.
   Local sugerido: static/js/agro/disciplina_list.js
   Sem fetch: tudo acontece no navegador com os cards já renderizados.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Utilidades ---------- */
  const fold = (s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Texto "dobrado" (sem acento/maiúsculas) + mapa para os índices originais
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

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function getCsrfToken() {
    const input = document.querySelector(
      'input[name="csrfmiddlewaretoken"]:not(.delete-dialog input)'
    );
    if (input && input.value) return input.value;
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  const plural = (n, one, many) => (n === 1 ? one : many);

  /* ---------- Inicialização ---------- */
  function init() {
    const panel = document.querySelector(".discipline-panel");
    if (!panel) return;

    initDeleteModal(panel);

    const grid = panel.querySelector(".discipline-grid");
    if (!grid) return; // estado vazio: nada a filtrar

    initListing(panel, grid);
  }

  /* =======================================================
     BUSCA, FILTRO E "VER MAIS"
     ======================================================= */
  function initListing(panel, grid) {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cards = Array.from(grid.querySelectorAll(".discipline-card")).map(
      (el, index) => {
        el.style.setProperty("--i", Math.min(index, 12));

        const parts = [
          el.querySelector("h3"),
          el.querySelector(".discipline-professor"),
          el.querySelector(".discipline-description:not(.is-empty)"),
        ]
          .filter(Boolean)
          .map((node) => ({ node, text: node.textContent.trim() }));

        const tag = el.querySelector(".semester-tag");

        return {
          el,
          parts,
          semester: tag ? tag.textContent.trim() : "",
          haystack: fold(parts.map((p) => p.text).join(" ")),
          desc: el.querySelector(".discipline-description:not(.is-empty)"),
          readMore: null,
        };
      }
    );

    // Tira o stagger depois da entrada, para o filtro ficar rápido
    setTimeout(() => grid.classList.add("is-ready"), 1200);

    /* ----- Barra de busca + chips (injetados) ----- */
    const toolbar = document.createElement("div");
    toolbar.className = "discipline-toolbar";
    toolbar.innerHTML = `
      <label class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" autocomplete="off" spellcheck="false"
               placeholder="Buscar por disciplina, professor ou descrição…  ( / )"
               aria-label="Buscar disciplinas">
        <button type="button" class="search-clear" aria-label="Limpar busca" hidden>×</button>
      </label>
      <div class="filter-chips" role="group" aria-label="Filtrar por semestre"></div>
    `;

    const count = document.createElement("p");
    count.className = "results-count";
    count.setAttribute("aria-live", "polite");

    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.hidden = true;
    noResults.innerHTML = `
      <strong>Nenhuma disciplina encontrada.</strong>
      <p></p>
      <button type="button" class="reset-filters">Limpar filtros</button>
    `;

    const header = panel.querySelector(".discipline-header");
    header.insertAdjacentElement("afterend", toolbar);
    toolbar.insertAdjacentElement("afterend", count);
    grid.insertAdjacentElement("afterend", noResults);

    const input = toolbar.querySelector("input");
    const clearBtn = toolbar.querySelector(".search-clear");
    const chipsWrap = toolbar.querySelector(".filter-chips");
    const noResultsMsg = noResults.querySelector("p");

    // Só mostra os controles de busca se fizer sentido
    const semesters = Array.from(
      new Set(cards.map((c) => c.semester).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

    const makeChip = (label, value) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "filter-chip";
      b.textContent = label;
      b.dataset.semester = value;
      b.setAttribute("aria-pressed", "false");
      return b;
    };

    if (semesters.length > 0) {
      chipsWrap.appendChild(makeChip("Todos", ""));
      semesters.forEach((s) => chipsWrap.appendChild(makeChip(s, s)));
    } else {
      chipsWrap.hidden = true;
    }

    /* ----- Estado ----- */
    let query = "";
    let semester = "";

    /* ----- Destaque dos termos buscados ----- */
    function highlight(part, tokens) {
      const { node, text } = part;
      node.textContent = "";

      if (tokens.length === 0) {
        node.textContent = text;
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
        node.textContent = text;
        return;
      }

      ranges.sort((a, b) => a[0] - b[0]);
      const merged = [ranges[0].slice()];
      for (let i = 1; i < ranges.length; i++) {
        const last = merged[merged.length - 1];
        if (ranges[i][0] <= last[1]) {
          last[1] = Math.max(last[1], ranges[i][1]);
        } else {
          merged.push(ranges[i].slice());
        }
      }

      let cursor = 0;
      merged.forEach(([start, end]) => {
        if (start > cursor) {
          node.appendChild(document.createTextNode(text.slice(cursor, start)));
        }
        const mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = text.slice(start, end);
        node.appendChild(mark);
        cursor = end;
      });
      if (cursor < text.length) {
        node.appendChild(document.createTextNode(text.slice(cursor)));
      }
    }

    /* ----- Aplicar filtros ----- */
    function apply() {
      const tokens = fold(query).split(/\s+/).filter(Boolean);
      let visible = 0;

      cards.forEach((card) => {
        const matchesText = tokens.every((t) => card.haystack.includes(t));
        const matchesSemester = !semester || card.semester === semester;
        const show = matchesText && matchesSemester;

        card.el.classList.toggle("is-filtered-out", !show);
        if (show) {
          visible++;
          card.parts.forEach((p) => highlight(p, tokens));
        }
      });

      const total = cards.length;
      const filtering = tokens.length > 0 || semester !== "";

      count.textContent = filtering
        ? `Mostrando ${visible} de ${total} ${plural(total, "disciplina", "disciplinas")}`
        : `${total} ${plural(total, "disciplina cadastrada", "disciplinas cadastradas")}`;

      grid.hidden = visible === 0;
      noResults.hidden = visible !== 0;

      if (visible === 0) {
        noResultsMsg.textContent = query.trim()
          ? `Nada encontrado para "${query.trim()}"${semester ? ` no ${semester}` : ""}.`
          : "Nenhuma disciplina neste semestre.";
      }

      clearBtn.hidden = query === "";
      requestAnimationFrame(checkOverflow);
    }

    const applyDebounced = debounce(apply, 120);

    /* ----- Eventos da busca ----- */
    input.addEventListener("input", () => {
      query = input.value;
      clearBtn.hidden = query === "";
      applyDebounced();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) {
        e.preventDefault();
        resetSearch();
      }
    });

    clearBtn.addEventListener("click", () => {
      resetSearch();
      input.focus();
    });

    function resetSearch() {
      input.value = "";
      query = "";
      apply();
    }

    function setSemester(value) {
      semester = value;
      chipsWrap.querySelectorAll(".filter-chip").forEach((chip) => {
        const active = chip.dataset.semester === value;
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
      apply();
    }

    chipsWrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (chip) setSemester(chip.dataset.semester);
    });

    noResults.querySelector(".reset-filters").addEventListener("click", () => {
      input.value = "";
      query = "";
      setSemester("");
      input.focus();
    });

    // Atalho: "/" foca na busca
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      input.focus();
    });

    /* ----- "Ver mais / Ver menos" nas descrições longas ----- */
    function ensureReadMore(card) {
      if (card.readMore) return card.readMore;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "read-more";
      btn.textContent = "Ver mais";
      btn.hidden = true;
      btn.setAttribute("aria-expanded", "false");

      btn.addEventListener("click", () => {
        const expanded = card.desc.classList.toggle("is-expanded");
        btn.textContent = expanded ? "Ver menos" : "Ver mais";
        btn.setAttribute("aria-expanded", String(expanded));
      });

      card.desc.insertAdjacentElement("afterend", btn);
      card.readMore = btn;
      return btn;
    }

    function checkOverflow() {
      cards.forEach((card) => {
        if (!card.desc) return;
        if (card.el.classList.contains("is-filtered-out")) return;

        const btn = ensureReadMore(card);
        const expanded = card.desc.classList.contains("is-expanded");
        const overflowing = card.desc.scrollHeight > card.desc.clientHeight + 1;
        btn.hidden = !(expanded || overflowing);
      });
    }

    window.addEventListener("resize", debounce(checkOverflow, 200));
    window.addEventListener("load", checkOverflow);

    /* ----- Estado inicial ----- */
    setSemester("");
    if (!reduceMotion) {
      // pequena folga para o layout assentar antes de medir o texto
      setTimeout(checkOverflow, 150);
    }
  }

  /* =======================================================
     MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
     O envio é um POST de formulário comum (sem fetch).
     ======================================================= */
  function initDeleteModal(panel) {
    const buttons = panel.querySelectorAll("[data-delete-disciplina]");
    if (buttons.length === 0) return;

    const dialog = document.createElement("dialog");
    dialog.className = "delete-dialog";
    dialog.setAttribute("aria-labelledby", "delete-dialog-title");
    dialog.innerHTML = `
      <form method="post" class="delete-dialog-form">
        <input type="hidden" name="csrfmiddlewaretoken" value="">
        <div class="delete-dialog-icon" aria-hidden="true">!</div>
        <h3 id="delete-dialog-title">Excluir disciplina?</h3>
        <p class="delete-dialog-text">
          Você está prestes a excluir <strong class="delete-dialog-name"></strong>.
          Essa ação não pode ser desfeita.
        </p>
        <div class="delete-dialog-actions">
          <button type="button" class="dialog-cancel">Cancelar</button>
          <button type="submit" class="dialog-confirm">Sim, excluir</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);

    const form = dialog.querySelector("form");
    const tokenInput = dialog.querySelector('input[name="csrfmiddlewaretoken"]');
    const nameEl = dialog.querySelector(".delete-dialog-name");
    const cancelBtn = dialog.querySelector(".dialog-cancel");
    const confirmBtn = dialog.querySelector(".dialog-confirm");

    const supportsDialog = typeof dialog.showModal === "function";

    function openFor(btn) {
      const url = btn.dataset.deleteUrl;
      const nome = btn.dataset.nome || "esta disciplina";
      if (!url) return;

      // Fallback para navegadores sem <dialog>
      if (!supportsDialog) {
        if (window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
          form.action = url;
          tokenInput.value = getCsrfToken();
          document.body.appendChild(form);
          form.submit();
        }
        return;
      }

      form.action = url;
      tokenInput.value = getCsrfToken();
      nameEl.textContent = nome;
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Sim, excluir";
      dialog.showModal();
      cancelBtn.focus();
    }

    // Delegação: funciona também para cards filtrados/reexibidos
    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-delete-disciplina]");
      if (btn) openFor(btn);
    });

    cancelBtn.addEventListener("click", () => dialog.close());

    // Clique fora do conteúdo fecha o modal
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    // Feedback visual ao confirmar (o POST segue normalmente)
    form.addEventListener("submit", () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Excluindo...";
    });

    // Voltar pelo botão do navegador: restaura o estado
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Sim, excluir";
        if (dialog.open) dialog.close();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();