(() => {
  "use strict";
  const club = window.READING_CLUB;
  const section = document.getElementById("discussion");
  if (!club || !section || !/^[\w.-]+\/[\w.-]+$/.test(club.discussionRepo || "")) return;
  const $ = (id) => document.getElementById(id);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const repoUrl = `https://github.com/${club.discussionRepo}`;
  const seen = new Set();
  const entries = [club.next, ...[...club.archive].sort((a, b) => (b.date || "").localeCompare(a.date || ""))]
    .filter((session) => {
      if (!session || !Number.isSafeInteger(session.discussionIssue) || session.discussionIssue < 1 || seen.has(session.discussionIssue)) return false;
      seen.add(session.discussionIssue);
      return true;
    });
  if (!entries.length) {
    $("discussion-status").textContent = "Discussion details will be announced soon.";
    $("discussion-controls").hidden = true;
    return;
  }
  entries.forEach((session) => {
    const option = make("option", "", `${session.date || "Date TBA"} · ${session.title}`);
    option.value = String(session.discussionIssue);
    $("discussion-session").append(option);
  });

  // These are reading links; posting happens on GitHub under the visitor's account.
  const addSessionEntry = (session, target, label) => {
    if (!session || !seen.has(session.discussionIssue) || !target) return;
    const link = make("a", "button discussion-entry", label);
    link.href = `#discussion-${session.discussionIssue}`;
    target.append(link);
  };
  addSessionEntry(club.next, $("next-links"), "Ask a question / suggest a topic");
  // Archive cards are rendered by app.js, including after a search.
  const addArchiveEntries = () => {
    const cards = $("archive-list").children;
    Array.from(cards).forEach((card) => {
      if (card.querySelector(".discussion-entry")) return;
      const issue = Number(card.dataset.discussionIssue);
      const session = entries.find((item) => item.discussionIssue === issue);
      addSessionEntry(session, card.querySelector(".actions"), "Discuss / give feedback");
    });
  };
  new MutationObserver(addArchiveEntries).observe($("archive-list"), { childList: true });
  addArchiveEntries();

  let controller;
  let request = 0;
  let page = 1;
  let shown = 0;
  let selectedIssue = entries[0].discussionIssue;
  const perPage = 20;
  const select = $("discussion-session");
  const list = $("discussion-comments");
  const status = $("discussion-status");
  const refresh = $("discussion-refresh");
  const more = $("discussion-more");

  const configureSession = () => {
    const session = entries.find((item) => item.discussionIssue === selectedIssue);
    select.value = String(selectedIssue);
    $("discussion-title").textContent = session.title;
    $("discussion-context").textContent = session === club.next
      ? "Before we meet: leave questions, reading notes, or topics you would like us to cover."
      : "After the session: share takeaways, feedback, or follow-up questions. An optional 1–5 rating is welcome.";
    $("discussion-post").href = `${repoUrl}/issues/${selectedIssue}#new_comment_field`;
    $("discussion-view").href = `${repoUrl}/issues/${selectedIssue}`;
  };

  const renderComment = (comment) => {
    const item = make("article", "comment-card");
    const header = make("div", "comment-header");
    header.append(make("strong", "", comment.user?.login || "GitHub member"));
    const date = new Date(comment.created_at);
    if (!Number.isNaN(date.getTime())) header.append(make("time", "", new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    }).format(date)));
    const text = make("p", "comment-body", comment.body_text ?? comment.body ?? "");
    item.append(header, text);
    // Comment text is never inserted as HTML, and links stay in this issue.
    if (typeof comment.html_url === "string" && comment.html_url.startsWith(`${repoUrl}/issues/${selectedIssue}#issuecomment-`)) {
      const link = make("a", "comment-link", "View / reply on GitHub ↗");
      link.href = comment.html_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link);
    }
    list.append(item);
  };

  async function loadComments(reset = true) {
    controller?.abort();
    controller = new AbortController();
    const activeController = controller;
    const current = ++request;
    const issue = selectedIssue;
    if (reset) {
      page = 1;
      shown = 0;
      list.replaceChildren();
    }
    configureSession();
    status.textContent = "Loading comments…";
    list.setAttribute("aria-busy", "true");
    refresh.disabled = true;
    more.disabled = true;
    more.hidden = true;
    const timeout = setTimeout(() => activeController.abort(), 12000);
    try {
      const response = await fetch(`https://api.github.com/repos/${club.discussionRepo}/issues/${issue}/comments?per_page=${perPage}&page=${page}`, {
        headers: { Accept: "application/vnd.github.text+json" }, signal: activeController.signal
      });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const comments = await response.json();
      if (!Array.isArray(comments)) throw new Error("Invalid comment response");
      if (current !== request) return;
      comments.forEach(renderComment);
      shown += comments.length;
      status.textContent = shown ? `${shown} comment${shown === 1 ? "" : "s"} shown.` : "No comments yet. Be the first to share a question, note, or review.";
      page += 1;
      more.hidden = comments.length < perPage;
    } catch {
      if (current !== request) return;
      status.textContent = "Comments could not be loaded here. You can still read and post in the GitHub discussion.";
      more.hidden = reset || page === 1;
    } finally {
      clearTimeout(timeout);
      if (current === request) {
        list.setAttribute("aria-busy", "false");
        refresh.disabled = false;
        more.disabled = false;
      }
    }
  }

  function followSessionLink(scroll, load = true) {
    const match = location.hash.match(/^#discussion-(\d+)$/);
    const issue = match ? Number(match[1]) : selectedIssue;
    if (!seen.has(issue)) return;
    const changed = issue !== selectedIssue;
    selectedIssue = issue;
    if (changed && load) loadComments();
    if (scroll && match) section.scrollIntoView({ block: "start" });
  }
  select.addEventListener("change", () => {
    selectedIssue = Number(select.value);
    history.replaceState(null, "", `#discussion-${selectedIssue}`);
    loadComments();
  });
  refresh.addEventListener("click", () => loadComments());
  more.addEventListener("click", () => loadComments(false));
  window.addEventListener("hashchange", () => followSessionLink(true));
  followSessionLink(false, false);
  loadComments();
  if (/^#discussion-\d+$/.test(location.hash)) section.scrollIntoView({ block: "start" });
})();
