// Private GoatCounter analytics. No dashboard or counters are displayed here.
// Never put an API key or password in this public repository.
(() => {
  "use strict";
  const config = window.READING_CLUB?.analytics;
  if (config?.enabled !== true || !/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/.test(config.siteCode || "")) return;

  // File/local previews and unrelated forks do not count.
  if (location.protocol !== "https:" || location.hostname !== "wangshuaiia.github.io" || !location.pathname.startsWith("/reading-club/")) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.setAttribute("data-goatcounter", `https://${config.siteCode}.goatcounter.com/count`);
  script.setAttribute("data-goatcounter-settings", JSON.stringify({path: "/reading-club/", title: "AI Frontier Reading Club", no_events: true}));
  document.head.appendChild(script);
})();
