// Activate only after the account owner has created and configured GoatCounter.
// Never put an API key, password, or secret dashboard token in these files.
(() => {
  "use strict";
  const config = window.READING_CLUB?.analytics;
  const section = document.getElementById("visitors");
  if (!section) return;
  const local = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  const preview = local && new URLSearchParams(location.search).has("analytics-preview");
  const valid = config?.enabled === true && /^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(config.siteCode || "");
  const status = document.getElementById("analytics-status");
  if (!valid) {
    if (preview) {
      section.hidden = false;
      status.textContent = "Preview · Connect a GoatCounter account to show real statistics. No visits are recorded in this preview.";
    }
    return;
  }

  const base = `https://${config.siteCode}.goatcounter.com`;
  section.hidden = false;
  const dashboard = document.getElementById("analytics-dashboard");
  dashboard.href = base;
  dashboard.hidden = false;
  const details = document.getElementById("analytics-details");
  details.hidden = false;
  let frameAdded = false;
  details.addEventListener("toggle", () => {
    if (!details.open || frameAdded) return;
    const frame = document.createElement("iframe");
    frame.src = `${base}/?hideui=1`;
    frame.title = "Public visitor statistics: countries, regions and visit trends";
    frame.loading = "lazy";
    frame.referrerPolicy = "strict-origin";
    frame.className = "analytics-frame";
    document.getElementById("analytics-frame-container").appendChild(frame);
    frameAdded = true;
  });

  // Record only the public site. File/local previews and unrelated forks do not count.
  // Canonical path excludes query strings and section hashes from analytics.
  if (location.protocol === "https:" && location.hostname === "wangshuaiia.github.io" && location.pathname.startsWith("/reading-club/")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.setAttribute("data-goatcounter", `${base}/count`);
    script.setAttribute("data-goatcounter-settings", JSON.stringify({path: "/reading-club/", title: "AI Frontier Reading Club", no_events: true}));
    document.head.appendChild(script);
  }

  const readCount = async (suffix, id) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${base}/counter/TOTAL.json${suffix}`, {signal: controller.signal, credentials: "omit"});
      if (!response.ok) throw new Error("Count unavailable");
      const data = await response.json();
      const count = String(data.count ?? "");
      if (!/^\d[\d, .\u00a0\u202f]*$/.test(count) || count.length > 30) throw new Error("Invalid count");
      document.getElementById(id).textContent = count;
    } finally {
      clearTimeout(timer);
    }
  };
  Promise.allSettled([readCount("", "visits-total"), readCount("?start=month", "visits-month")]).then(results => {
    status.textContent = results.some(result => result.status === "rejected")
      ? "Some counts are unavailable. You can still open the statistics dashboard above."
      : "Visit counts are cached and refresh periodically.";
  });
})();
