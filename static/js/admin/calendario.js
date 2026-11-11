(function () {
  "use strict";

  const root = document.querySelector("[data-calendar]");
  if (!root) return;

  const grid = root.querySelector("[data-calendar-grid]");
  const periodLabel = root.querySelector("[data-calendar-period]");
  const emptyMessage = root.querySelector("[data-calendar-empty]");
  const events = JSON.parse(document.getElementById("calendar-events").textContent);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let anchor = new Date(today);
  let view = "month";

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });

  function dateFromISO(value) {
    const parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")].join("-");
  }

  function mondayOffset(date) {
    return (date.getDay() + 6) % 7;
  }

  function sameDate(first, second) {
    return dateKey(first) === dateKey(second);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function createEvent(event) {
    const item = document.createElement("article");
    item.className = "calendar-event calendar-event--" + event.tipo;

    const title = document.createElement("span");
    title.className = "calendar-event-title";
    title.textContent = event.titulo;
    item.appendChild(title);

    const meta = document.createElement("span");
    meta.className = "calendar-event-meta";
    meta.textContent = [event.horario, event.status, event.detalhe].filter(Boolean).join(" · ");
    item.appendChild(meta);
    return item;
  }

  function renderDayCell(date, showWeekday, outsideMonth) {
    const cell = document.createElement("section");
    cell.className = "calendar-day";
    if (outsideMonth) cell.classList.add("calendar-day--outside");
    if (sameDate(date, today)) cell.classList.add("calendar-day--today");

    const heading = document.createElement("div");
    heading.className = "calendar-day-heading";
    const number = document.createElement("strong");
    number.textContent = String(date.getDate());
    heading.appendChild(number);
    if (showWeekday) {
      const dayName = document.createElement("span");
      dayName.className = "calendar-day-name";
      dayName.textContent = fullDateFormatter.format(date);
      heading.appendChild(dayName);
    }
    cell.appendChild(heading);

    const eventList = document.createElement("div");
    eventList.className = "calendar-events";
    events.filter((event) => event.data === dateKey(date))
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""))
      .forEach((event) => eventList.appendChild(createEvent(event)));
    cell.appendChild(eventList);
    return cell;
  }

  function render() {
    grid.replaceChildren();
    let dates = [];

    if (view === "month") {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const start = addDays(first, -mondayOffset(first));
      const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      const dayCount = Math.ceil((mondayOffset(last) + last.getDate()) / 7) * 7;
      periodLabel.textContent = monthFormatter.format(anchor);
      weekdays.forEach((name) => {
        const heading = document.createElement("div");
        heading.className = "calendar-weekday";
        heading.textContent = name;
        grid.appendChild(heading);
      });
      dates = Array.from({ length: dayCount }, (_, index) => addDays(start, index));
      dates.forEach((date) => grid.appendChild(renderDayCell(date, false, date.getMonth() !== anchor.getMonth())));
    } else if (view === "week") {
      const start = addDays(anchor, -mondayOffset(anchor));
      dates = Array.from({ length: 7 }, (_, index) => addDays(start, index));
      periodLabel.textContent = dates[0].toLocaleDateString("pt-BR") + " – " + dates[6].toLocaleDateString("pt-BR");
      weekdays.forEach((name) => {
        const heading = document.createElement("div");
        heading.className = "calendar-weekday";
        heading.textContent = name;
        grid.appendChild(heading);
      });
      dates.forEach((date) => grid.appendChild(renderDayCell(date, false, false)));
    } else {
      dates = [anchor];
      periodLabel.textContent = fullDateFormatter.format(anchor);
      grid.classList.add("calendar-grid--day");
      grid.appendChild(renderDayCell(anchor, true, false));
    }

    if (view !== "day") grid.classList.remove("calendar-grid--day");
    const visibleKeys = new Set(dates.map(dateKey));
    emptyMessage.hidden = events.some((event) => visibleKeys.has(event.data));
  }

  root.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.calendarView;
      root.querySelectorAll("[data-calendar-view]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      render();
    });
  });

  root.querySelectorAll("[data-calendar-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.calendarStep);
      if (view === "month") anchor = new Date(anchor.getFullYear(), anchor.getMonth() + step, 1);
      else anchor.setDate(anchor.getDate() + step * (view === "week" ? 7 : 1));
      render();
    });
  });

  root.querySelector("[data-calendar-today]").addEventListener("click", () => {
    anchor = new Date(today);
    render();
  });

  render();
})();
