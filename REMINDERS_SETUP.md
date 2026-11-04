# Activate email reminders

Status: subscriptions are configured for [AI Frontier Reading Club](https://buttondown.com/ShuaiWang), with `reminders.enabled` set to `true`. The owner has saved `BUTTONDOWN_API_KEY` in GitHub Actions secrets. Check the activation commit's workflow result and complete the inbox confirmation check below before announcing the feature.

## One-time account setup

1. Register a dedicated newsletter at [Buttondown](https://buttondown.com/). Suggested name: **AI Frontier Reading Club**. The configured public username is **ShuaiWang**. Use the Free plan; do not add paid features. The current [pricing page](https://buttondown.com/pricing) lists the first 100 active subscribers as free. Review the plan if the audience grows beyond that limit.
2. Complete the account's email/sender verification and any required newsletter approval. Set the sender name to **AI Frontier Reading Club** and the description to “Email reminders 30 minutes before our reading club sessions.” Keep double opt-in enabled. Keep Buttondown's default unsubscribe footer.
3. Create an API key for this dedicated newsletter. Prefer a separate key with email read/write, sending access, and newsletter settings read access; subscriber access is not needed. The script checks the newsletter username before changing messages. See [API authentication and key permissions](https://docs.buttondown.com/api-authentication).
4. In this repository's [Actions secrets](https://github.com/Wangshuaiia/reading-club/settings/secrets/actions), create a repository secret named `BUTTONDOWN_API_KEY`. Paste the key directly into GitHub. Do not put it in chat, `content.js`, an issue, a screenshot, or any other public file.
5. In `content.js`, set `reminders.buttondownUsername` to the actual public username. After the account, sender and secret are ready, set `reminders.enabled` to `true`. Commit the change. The form activates and the workflow schedules the next reminder. You can also run **Actions → Schedule reading club reminders → Run workflow**, with **apply** enabled. Adding a secret alone does not trigger a workflow run.

## Verify before announcing subscriptions

- Confirm that the workflow's preview displays the correct session and reminder time. The 5 November 2026 session starts at 17:00 Copenhagen time (16:00 UTC); its reminder target is **16:30 Copenhagen time (15:30 UTC)**.
- Check **Emails** in Buttondown: exactly one matching reminder should have status **Scheduled** and the correct publish date. Inspect the email preview, title, start time, Zoom link and unsubscribe footer. Do not use **Send now** for this reminder.
- Submit your own email through the website, follow the confirmation email, and verify that Buttondown lists it as an active subscriber. People who do not confirm do not receive reminders. This end-to-end check requires the owner's account and mailbox and has not been completed yet.
- Rerun the workflow and confirm it reports `unchanged`, with no duplicate email. The automated tests use a simulated provider, not a live inbox.

## Routine session updates

Update `next.date` and `next.time` in `content.js`. Keep `next.time` in this exact format: `5 November 2026 17:00 Copenhagen time`. Keep a session's `discussionIssue` stable if it is rescheduled. When announcing a new session, give it a different issue number. The scheduler checks that the date and displayed time agree and converts Europe/Copenhagen to UTC, including summer/winter time.

The workflow reads the latest `main`, runs tests and reconciles schedules on relevant pushes and twice daily. Buttondown's own scheduler performs the timed send, so the GitHub cron is not relied on to start at the exact send minute. Announce or reschedule at least several minutes before the reminder deadline. A missed deadline produces a workflow warning rather than a late “starts in 30 minutes” email. Delivery to inboxes may still be delayed by email providers.

If a reminder was already sent or queued, the script will not send it again automatically. If the provider reports an error or a paused message, review it in Buttondown. For emergency changes after a reminder went out, review any follow-up email manually.

Set `reminders.enabled` to `false` (keep the username) to disable signups and withdraw owned future schedules on the next workflow run. Set `next` to `null` when there is no announced session. Never merely delete the secret to cancel an already scheduled email: a provider schedule persists until it is explicitly withdrawn.

Keep GitHub Actions enabled and watch failed workflow notifications. Public-repository cron schedules may stop after 60 days without activity; normal session commits reactivate/synchronize the workflow. Already scheduled Buttondown emails do not depend on the laptop being on.

## Local checks

```sh
node --test tests/reminders.test.mjs
node scripts/schedule-reminder.mjs --check
```

`--check` is the default and makes no network calls or sends. `--apply` reconciles the real provider using `BUTTONDOWN_API_KEY` from the environment. Never run it against a test newsletter with someone else's subscribers. Request errors are sanitized; no subscriber API is used and no email list is copied to GitHub.

## References

- [Embedding the subscription form](https://docs.buttondown.com/building-your-subscriber-base): native HTML POST, including validation/CAPTCHA flow.
- [Double opt-in](https://docs.buttondown.com/double-opt-in): subscribers must confirm ownership of their address.
- [Scheduling emails via the API](https://docs.buttondown.com/scheduling-emails-via-the-api): supported on the Free plan.
- [API idempotency](https://docs.buttondown.com/api-idempotency-keys): repeated mutations use idempotency keys.
- [GitHub scheduled workflow limitations](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows): cron can be delayed; provider-side scheduling avoids using cron for precise delivery.
