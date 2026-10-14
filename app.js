(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const club = window.READING_CLUB;
  if (!club || !Array.isArray(club.archive)) {
    $("load-error").hidden = false;
    return;
  }
  const make = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = value;
    return el;
  };
  const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const parts = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
    return parts.join("-") === value.split("-").map(Number).join("-") ? date : null;
  };
  const dateLabel = (value) => {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "long", day: "numeric" }).format(date) : "Date to be announced";
  };
  // Allow relative paths and HTTP(S) links; reject accidental script URLs.
  const safeUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    const path = value.trim();
    if (/^[a-z][a-z\d+.-]*:/i.test(path) && !/^https?:/i.test(path)) return null;
    try {
      const url = new URL(path, document.baseURI);
      if (["http:", "https:"].includes(url.protocol)) return url;
      if (location.protocol === "file:" && url.protocol === "file:") return url;
    } catch { /* Invalid links are not shown. */ }
    return null;
  };
  const addLinks = (container, session) => {
    container.replaceChildren();
    const choices = [["readingUrl", session.readingLabel || "Reading material", false], ["slides", "Download slides", true], ["pdf", "View PDF ↗", false]];
    for (const [key, label, download] of choices) {
      const url = safeUrl(session[key]);
      if (!url) continue;
      const a = make("a", "button", label);
      a.href = url.href;
      if (download && url.origin === location.origin) a.setAttribute("download", "");
      else { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      container.append(a);
    }
    if (!container.childElementCount) container.append(make("span", "muted", "Materials coming soon"));
  };
  document.title = club.name || "Reading Club";
  document.querySelectorAll("[data-club-name]").forEach((el) => { el.textContent = club.name || "Reading Club"; });
  $("club-description").textContent = club.description || "Read and discuss together every two weeks.";
  $("demo-note").hidden = !club.demo;
  if (club.next) {
    const next = club.next;
    const date = parseDate(next.date);
    $("next-date").textContent = dateLabel(next.date);
    $("next-weekday").textContent = date ? new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date) : "";
    $("next-title").textContent = next.title || "Topic to be announced";
    $("next-summary").textContent = next.summary || "Our reading plan is coming soon.";
    for (const [label, value] of [["Presenter", next.speaker], ["Time", next.time], ["Location", next.location]]) {
      if (value) {
        const group = make("div");
        group.append(make("dt", "", label), make("dd", "", value));
        $("next-meta").append(group);
      }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    $("schedule-note").hidden = !date || date >= today;
    addLinks($("next-links"), next);
    const references = $("next-references");
    const list = make("ul");
    for (const reference of next.references || []) {
      const url = safeUrl(reference.url);
      if (!url) continue;
      const link = make("a", "", reference.title || "Related reading");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const item = make("li");
      item.append(link);
      list.append(item);
    }
    if (list.childElementCount) {
      references.append(make("h4", "", "Further reading"), list);
      references.hidden = false;
    }
  } else {
    $("next-title").textContent = "Next session coming soon";
  }
  const sessions = [...club.archive].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
  function renderArchive() {
    const query = $("search").value.trim().toLocaleLowerCase();
    const filtered = sessions.filter((s) => [s.title, s.speaker, s.summary, ...(s.tags || [])].join(" ").toLocaleLowerCase().includes(query));
    const fragment = document.createDocumentFragment();
    filtered.forEach((session) => {
      const article = make("article", "archive-card");
      if (session.discussionIssue) article.dataset.discussionIssue = String(session.discussionIssue);
      const date = make("p", "archive-date", dateLabel(session.date));
      const body = make("div", "archive-body");
      body.append(make("h3", "", session.title || "Untitled session"));
      body.append(make("p", "speaker", `Presenter · ${session.speaker || "To be announced"}`));
      if (session.summary) body.append(make("p", "summary", session.summary));
      const tags = make("div", "tags");
      (session.tags || []).forEach((tag) => tags.append(make("span", "tag", tag)));
      const actions = make("div", "actions");
      addLinks(actions, session);
      body.append(tags, actions);
      article.append(date, body);
      fragment.append(article);
    });
    $("archive-list").replaceChildren(fragment);
    $("archive-count").textContent = `${filtered.length} of ${sessions.length} ${club.demo ? "sample " : ""}${sessions.length === 1 ? "session" : "sessions"}`;
    $("empty-state").hidden = filtered.length > 0;
    $("empty-state").textContent = query ? "No matching sessions. Try a different keyword." : "Past sessions and their materials will appear here after our first discussion.";
  }
  $("search").addEventListener("input", renderArchive);
  renderArchive();
})();
