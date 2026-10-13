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
    return date ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date) : "日期待定";
  };
  // 支持站内相对路径和 http(s) 链接，避免执行意外填入的脚本链接。
  const safeUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    const path = value.trim();
    if (/^[a-z][a-z\d+.-]*:/i.test(path) && !/^https?:/i.test(path)) return null;
    try {
      const url = new URL(path, document.baseURI);
      if (["http:", "https:"].includes(url.protocol)) return url;
      if (location.protocol === "file:" && url.protocol === "file:") return url;
    } catch { /* 无效链接不显示 */ }
    return null;
  };
  const addLinks = (container, session) => {
    container.replaceChildren();
    const choices = [["readingUrl", "阅读材料", false], ["slides", "下载 PPT", true], ["pdf", "查看 PDF ↗", false]];
    for (const [key, label, download] of choices) {
      const url = safeUrl(session[key]);
      if (!url) continue;
      const a = make("a", "button", label);
      a.href = url.href;
      if (download && url.origin === location.origin) a.setAttribute("download", "");
      else { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      container.append(a);
    }
    if (!container.childElementCount) container.append(make("span", "muted", "资料待上传"));
  };
  document.title = club.name || "Reading Club";
  document.querySelectorAll("[data-club-name]").forEach((el) => { el.textContent = club.name || "Reading Club"; });
  $("club-description").textContent = club.description || "每两周一起阅读与讨论。";
  $("demo-note").hidden = !club.demo;
  if (club.next) {
    const next = club.next;
    const date = parseDate(next.date);
    $("next-date").textContent = dateLabel(next.date);
    $("next-weekday").textContent = date ? new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(date) : "";
    $("next-title").textContent = next.title || "主题待定";
    $("next-summary").textContent = next.summary || "阅读计划即将公布。";
    for (const [label, value] of [["分享人", next.speaker], ["时间", next.time], ["地点", next.location]]) {
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
  } else {
    $("next-title").textContent = "下一期安排即将公布";
  }
  const sessions = [...club.archive].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
  function renderArchive() {
    const query = $("search").value.trim().toLocaleLowerCase();
    const filtered = sessions.filter((s) => [s.title, s.speaker, s.summary, ...(s.tags || [])].join(" ").toLocaleLowerCase().includes(query));
    const fragment = document.createDocumentFragment();
    filtered.forEach((session) => {
      const article = make("article", "archive-card");
      const date = make("p", "archive-date", dateLabel(session.date));
      const body = make("div", "archive-body");
      body.append(make("h3", "", session.title || "未命名分享"));
      body.append(make("p", "speaker", `分享人 · ${session.speaker || "待填写"}`));
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
    $("archive-count").textContent = `${filtered.length} / ${sessions.length} ${club.demo ? "份示例记录" : "次分享"}`;
    $("empty-state").hidden = filtered.length > 0;
    $("empty-state").textContent = query ? "没有找到相关分享，试试其他关键词。" : "还没有往期记录，第一次讨论结束后就可以添加。";
  }
  $("search").addEventListener("input", renderArchive);
  renderArchive();
})();
