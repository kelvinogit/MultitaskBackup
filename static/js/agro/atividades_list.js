/* ==========================================================================
   Cerne AgroHub — atividades_list.js (JavaScript puro)
   Ajustado às views: atividade_detail, atividade_update,
   atividade_finalizar e atividade_delete.
   ========================================================================== */
(function () {
  "use strict";

  var list = document.querySelector(".activity-list");
  if (!list) return;

  var items = Array.prototype.slice.call(list.querySelectorAll(".activity-item"));
  var searchInput = document.querySelector(".activity-search");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".activity-filter-chip"));
  var emptyMsg = document.querySelector(".activity-empty-dynamic");

  var state = { status: "todas", query: "" };

  var STATUS_ICON = {
    pendente: "#i-seed",
    andamento: "#i-sprout",
    concluida: "#i-check",
    atrasada: "#i-alert"
  };

  /* ---------- Utilitários ---------- */
  function normalize(text) {
    return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function urlFor(base, pk) {
    return base.replace("/0/", "/" + pk + "/");
  }

  function getCsrf() {
    var input = document.querySelector("[name=csrfmiddlewaretoken]");
    if (input && input.value) return input.value;
    var match = document.cookie.split("; ").filter(function (c) {
      return c.indexOf("csrftoken=") === 0;
    })[0];
    return match ? decodeURIComponent(match.split("=")[1]) : "";
  }

  function post(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCsrf(),
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json"
      },
      body: body || null
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        data._status = res.status;
        data._httpOk = res.ok;
        return data;
      });
    });
  }

  function findItem(id) {
    return items.filter(function (li) { return String(li.dataset.id) === String(id); })[0];
  }

  /* ---------- Contadores ---------- */
  function updateCounts() {
    var counts = { todas: items.length, pendente: 0, andamento: 0, concluida: 0, atrasada: 0 };
    items.forEach(function (li) {
      if (counts[li.dataset.status] !== undefined) counts[li.dataset.status] += 1;
    });
    Object.keys(counts).forEach(function (key) {
      var el = document.querySelector('[data-count="' + key + '"]');
      if (el) el.textContent = counts[key];
    });
  }

  /* ---------- Prazo relativo ---------- */
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function renderDue(li) {
    var el = li.querySelector("[data-due]");
    var due = new Date(li.dataset.prazo);
    if (!el || isNaN(due)) return;

    el.className = "activity-due";
    if (li.dataset.status === "concluida") { el.textContent = ""; return; }

    var days = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000);
    if (days < 0) {
      el.textContent = "Atrasada há " + -days + (days === -1 ? " dia" : " dias");
      el.classList.add("is-late");
    } else if (days === 0) {
      el.textContent = "Vence hoje";
      el.classList.add("is-soon");
    } else if (days === 1) {
      el.textContent = "Vence amanhã";
      el.classList.add("is-soon");
    } else {
      el.textContent = "Em " + days + " dias";
      if (days <= 3) el.classList.add("is-soon");
    }
  }

  /* ---------- Busca e filtro ---------- */
  function applyFilters() {
    var q = normalize(state.query);
    var visible = 0;

    items.forEach(function (li) {
      var matchStatus = state.status === "todas" || li.dataset.status === state.status;
      var matchText = !q || normalize(li.dataset.search).indexOf(q) !== -1;
      li.hidden = !(matchStatus && matchText);
      if (!li.hidden) visible += 1;
    });

    if (emptyMsg) emptyMsg.hidden = visible !== 0;
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      state.status = chip.dataset.status;
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value;
      applyFilters();
    });
  }

  /* ---------- Atualização da linha (sem recarregar a página) ---------- */
  function setItemStatus(li, status, statusDisplay) {
    li.dataset.status = status;

    var badge = li.querySelector(".activity-status");
    if (badge) {
      badge.className = "activity-status activity-status--" + status;
      var use = badge.querySelector("use");
      if (use) use.setAttribute("href", STATUS_ICON[status] || "#i-seed");
      // troca só o texto, preservando o ícone
      Array.prototype.slice.call(badge.childNodes).forEach(function (n) {
        if (n.nodeType === 3) badge.removeChild(n);
      });
      badge.appendChild(document.createTextNode(" " + statusDisplay));
    }

    var finishBtn = li.querySelector("[data-finalize-activity]");
    if (finishBtn && status === "concluida") finishBtn.remove();

    renderDue(li);
  }

  function updateItemFromForm(li, a) {
    var title = li.querySelector(".activity-title");
    if (title) title.textContent = a.titulo;

    var meta = li.querySelectorAll(".meta-item");
    if (meta[0]) {
      var svg = meta[0].querySelector("svg");
      meta[0].textContent = "";
      if (svg) meta[0].appendChild(svg);
      meta[0].appendChild(document.createTextNode(" " + a.disciplina_nome));
    }

    var time = li.querySelector(".activity-prazo");
    if (time) time.textContent = a.prazo_exibicao;

    // data-prazo vem do campo datetime-local (hora local, sem fuso)
    if (form.elements.prazo.value) li.dataset.prazo = form.elements.prazo.value;

    li.dataset.search = normalize(a.titulo + " " + a.disciplina_nome);
    setItemStatus(li, a.status, a.status_display);
  }

  /* ---------- Modal ---------- */
  var overlay = document.getElementById("activityModalOverlay");
  var modal = overlay.querySelector(".activity-modal");
  var form = document.getElementById("activityModalForm");
  var generalError = document.getElementById("activityModalGeneralError");
  var closeBtn = document.getElementById("activityModalClose");
  var deleteBtn = document.getElementById("activityModalDelete");
  var finalizeBtn = document.getElementById("activityModalFinalize");
  var saveBtn = document.getElementById("activityModalSave");

  var currentId = null;
  var lastFocus = null;

  function clearErrors() {
    generalError.hidden = true;
    generalError.textContent = "";
    form.querySelectorAll("[data-error-for]").forEach(function (el) { el.textContent = ""; });
    form.querySelectorAll(".has-error").forEach(function (el) { el.classList.remove("has-error"); });
  }

  function showGeneral(msg) {
    generalError.textContent = msg;
    generalError.hidden = false;
  }

  // errors pode ter: ["msg"], [{message: "msg"}] ou lista vazia
  function errorText(list) {
    var texts = [].concat(list || []).map(function (e) {
      return typeof e === "string" ? e : (e && e.message) || "";
    }).filter(Boolean);
    return texts.join(" ") || "Verifique este campo.";
  }

  function fieldLabel(name) {
    var field = form.elements[name];
    var label = field && field.id ? form.querySelector('label[for="' + field.id + '"]') : null;
    return label ? label.textContent : name;
  }

  function showErrors(errors, fallback) {
    clearErrors();
    var keys = Object.keys(errors || {});
    if (!keys.length) { showGeneral(fallback || "Não foi possível concluir a ação. Tente novamente."); return; }

    var general = [];
    keys.forEach(function (field) {
      var msg = errorText(errors[field]);
      var slot = form.querySelector('[data-error-for="' + field + '"]');
      if (slot) {
        slot.textContent = msg;
        slot.parentElement.classList.add("has-error");
      } else if (field === "__all__") {
        general.push(msg);
      } else {
        general.push(fieldLabel(field) + ": " + msg);
      }
    });
    if (general.length) showGeneral(general.join(" "));
  }

  // Aceita [valor, rótulo] (choices) e {id, nome} (disciplinas)
  function fillSelect(select, options, selected) {
    select.innerHTML = "";
    (options || []).forEach(function (opt) {
      var value = Array.isArray(opt) ? opt[0] : opt.id;
      var label = Array.isArray(opt) ? opt[1] : opt.nome;
      var o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      if (String(value) === String(selected)) o.selected = true;
      select.appendChild(o);
    });
  }

  function populate(d) {
    var choices = d.choices || {};

    form.elements.titulo.value = d.titulo || "";
    form.elements.prazo.value = d.prazo || "";
    form.elements.descricao.value = d.descricao || "";
    form.elements.observacoes.value = d.observacoes || "";

    fillSelect(form.elements.disciplina, d.disciplinas, d.disciplina_id);
    fillSelect(form.elements.tipo, choices.tipo, d.tipo);
    fillSelect(form.elements.prioridade, choices.prioridade, d.prioridade);
    fillSelect(form.elements.status, choices.status, d.status);

    finalizeBtn.hidden = d.status === "concluida";
  }

  function openModal(li) {
    currentId = li.dataset.id;
    lastFocus = document.activeElement;
    clearErrors();
    form.reset();
    saveBtn.disabled = true;

    overlay.hidden = false;
    document.body.classList.add("is-locked");
    closeBtn.focus();

    fetch(urlFor(list.dataset.detailUrlBase, currentId), {
      credentials: "same-origin",
      headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      })
      .then(function (data) {
        populate(data);
        saveBtn.disabled = false;
        form.elements.titulo.focus();
      })
      .catch(function () {
        showGeneral("Não foi possível carregar os dados da atividade.");
      });
  }

  function closeModal() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("is-locked");
    currentId = null;
    if (lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  /* ---------- Ações ---------- */
  function finalize(id) {
    return post(urlFor(list.dataset.finalizeUrlBase, id)).then(function (data) {
      if (data._httpOk && data.ok) {
        var li = findItem(id);
        if (li) setItemStatus(li, data.atividade.status, data.atividade.status_display);
        updateCounts();
        applyFilters();
        return true;
      }
      return false;
    });
  }

  function removeItem(id) {
    var li = findItem(id);
    if (li) {
      items = items.filter(function (x) { return x !== li; });
      li.remove();
    }
    if (!items.length) { window.location.reload(); return; } // mostra o estado vazio do Django
    updateCounts();
    applyFilters();
  }

  /* ---------- Eventos da lista ---------- */
  items.forEach(function (li) {
    renderDue(li);

    li.addEventListener("click", function (e) {
      var finishBtn = e.target.closest("[data-finalize-activity]");
      if (finishBtn) {
        e.stopPropagation();
        finishBtn.disabled = true;
        finalize(li.dataset.id).then(function (ok) {
          if (!ok) { finishBtn.disabled = false; window.alert("Não foi possível finalizar a atividade."); }
        });
        return;
      }
      openModal(li);
    });

    li.addEventListener("keydown", function (e) {
      if (e.target !== li) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(li);
      }
    });
  });

  /* ---------- Eventos do modal ---------- */
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  // Mantém o foco dentro do modal
  modal.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusables = modal.querySelectorAll("button:not([hidden]):not([disabled]), input, select, textarea");
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!currentId) return;
    clearErrors();
    saveBtn.disabled = true;

    post(urlFor(list.dataset.updateUrlBase, currentId), new FormData(form))
      .then(function (data) {
        if (data._httpOk && data.ok) {
          var li = findItem(currentId);
          if (li) updateItemFromForm(li, data.atividade);
          updateCounts();
          applyFilters();
          closeModal();
        } else if (data._status === 403) {
          showGeneral("Sessão expirada ou token CSRF ausente. Recarregue a página.");
        } else {
          showErrors(data.errors);
        }
        saveBtn.disabled = false;
      })
      .catch(function () {
        showGeneral("Falha de conexão. Tente novamente.");
        saveBtn.disabled = false;
      });
  });

  finalizeBtn.addEventListener("click", function () {
    if (!currentId) return;
    finalizeBtn.disabled = true;
    finalize(currentId).then(function (ok) {
      finalizeBtn.disabled = false;
      if (ok) closeModal();
      else showGeneral("Não foi possível finalizar a atividade.");
    });
  });

  deleteBtn.addEventListener("click", function () {
    if (!currentId) return;
    if (!window.confirm("Excluir esta atividade? Essa ação não pode ser desfeita.")) return;
    var id = currentId;

    post(urlFor(list.dataset.deleteUrlBase, id)).then(function (data) {
      if (data._httpOk && data.ok) {
        closeModal();
        removeItem(id);
      } else {
        showGeneral("Não foi possível excluir a atividade.");
      }
    });
  });

  /* ---------- Início ---------- */
  updateCounts();
  applyFilters();
})();