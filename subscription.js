// Only a public newsletter username belongs here. API keys stay in Actions secrets.
(() => {
  "use strict";
  const form = document.getElementById("reminder-form");
  if (!form) return;
  const settings = window.READING_CLUB?.reminders;
  const ready = settings?.enabled === true && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(settings.buttondownUsername || "");
  if (!ready) {
    // Do not accept or store addresses before the email account is connected.
    form.addEventListener("submit", event => event.preventDefault());
    return;
  }
  form.action = `https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(settings.buttondownUsername)}`;
  document.getElementById("reminder-fields").disabled = false;
  document.getElementById("reminder-badge").hidden = true;
  document.getElementById("reminder-status").textContent = "After subscribing, check your inbox and confirm your email. Reminders are scheduled for 30 minutes before each announced session; delivery times can vary.";
  // A native POST lets Buttondown handle confirmation, validation and CAPTCHA.
  // Never report success here: only Buttondown can confirm a subscription.
})();
