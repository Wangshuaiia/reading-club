import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {localStart,sessionStart,reminderTime,calendarEvent,calendarLinks} from '../calendar.mjs';
export {localStart} from '../calendar.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const API = 'https://api.buttondown.com/v1/';
// Keep the legacy ownership marker so the old 30-minute schedule can be withdrawn.
const MARKER = 'Wangshuaiia/reading-club/30-minute-reminder-v1';
const EDITABLE = new Set(['draft', 'scheduled']);
const COMMITTED = new Set(['sent', 'about_to_send', 'in_flight', 'throttled', 'resending', 'partially_sent', 'paused', 'errored']);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest = value => createHash('sha256').update(value).digest('hex');
const usernameOK = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);

export function parseConfig(source) {
  // Parse JSON only; never execute content.js while API credentials are present.
  const prefix = 'window.READING_CLUB = ';
  const start = source.indexOf(prefix);
  if (start < 0) throw new Error('content.js has no READING_CLUB JSON assignment.');
  return JSON.parse(source.slice(start + prefix.length).trim().replace(/;$/, ''));
}

export function makePlan(club, html, now = new Date()) {
  const enabled = club.reminders?.enabled === true;
  const username = club.reminders?.buttondownUsername || '';
  if (enabled && !usernameOK(username)) throw new Error('A valid Buttondown username is required before enabling reminders.');
  if (!club.next) return {enabled, username, sessionId: null, payload: null, ready: false};
  const next = club.next;
  const start = sessionStart(next);
  const display = next.time;
  const remind = reminderTime(next);
  const sessionId = Number.isInteger(next.discussionIssue) ? `discussion-${next.discussionIssue}` : `date-${next.date}`;
  const zoom = html.match(/href="(https:\/\/dtudk\.zoom\.us\/j\/[^"<>\s]+)"/)?.[1]?.replaceAll('&amp;', '&');
  if (!zoom) throw new Error('A Zoom join link is required in index.html.');
  const event = calendarEvent(next,zoom);
  const links = calendarLinks(event);
  const body = `<h2>Save the date: AI Frontier Reading Club</h2>
<p><strong>${escape(next.title)}</strong></p>
<p><strong>When:</strong> ${escape(display)}<br><strong>Presenter:</strong> ${escape(next.speaker || 'Shuai Wang')}</p>
<p>Add the session to your calendar, review the details, and save:</p>
<p><a href="${escape(links.outlook)}">Add to Outlook (work or school)</a><br><a href="${escape(links.outlookPersonal)}">Add to Outlook.com (personal)</a><br><a href="${escape(links.google)}">Add to Google Calendar</a><br><a href="${escape(links.ics)}">Download calendar event (.ics) for Outlook, Apple Calendar, and other apps</a></p>
<p>The calendar slot is ${event.duration} minutes. The .ics file includes a reminder 30 minutes before the session. Check the reminder and notification settings in your calendar after saving.</p>
<p><a href="${escape(zoom)}">Join the Zoom meeting</a></p>
<p><a href="https://wangshuaiia.github.io/reading-club/#next">Session details and reading materials</a></p>
<p>You are receiving this invitation because you confirmed your reading club email subscription. Invitations are scheduled one week before each session at 15:00 Copenhagen time. You can unsubscribe using the link in the email footer.</p>`;
  const payload = {subject: `Next week: ${next.title}`, body, status:'scheduled', publish_date: remind.toISOString(), archival_mode:'disabled', commenting_mode:'disabled', metadata:{reading_club: MARKER, session_id: sessionId}};
  return {enabled, username, sessionId, start: start.toISOString(), remindAt: remind.toISOString(), ready: remind.getTime() > now.getTime() + 120000, payload};
}

function idempotencyKey(method, url, body, revision = '') {
  const hex = digest(JSON.stringify([method, url, body, revision]));
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

export function makeClient(key, fetcher = fetch) {
  return async function request(method, target, body, revision = '') {
    const url = new URL(target, API);
    if (url.origin !== 'https://api.buttondown.com' || !url.pathname.startsWith('/v1/')) throw new Error('Rejected an unexpected API URL.');
    const headers = {Authorization: `Token ${key}`, Accept:'application/json'};
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['X-Idempotency-Key'] = idempotencyKey(method, url.href, body, revision);
    }
    let response;
    try { response = await fetcher(url.href, {method, headers, body: body ? JSON.stringify(body) : undefined, redirect:'error', signal:AbortSignal.timeout(20000)}); }
    catch { throw new Error('Buttondown request failed or timed out; rerun the workflow to reconcile safely.'); }
    // Never log provider response bodies, keys, or subscriber addresses.
    if (!response.ok) throw new Error(`Buttondown API returned HTTP ${response.status}. Check account approval, key permissions and plan limits.`);
    if (response.status === 204) return null;
    try { return await response.json(); }
    catch { throw new Error('Buttondown returned an invalid JSON response.'); }
  };
}

async function listPages(request, endpoint) {
  const items = [];
  const seen = new Set();
  let url = endpoint;
  for (let page = 0; url && page < 200; page++) {
    if (seen.has(url)) throw new Error('API pagination loop. No messages were changed.');
    seen.add(url);
    const data = await request('GET', url);
    if (!Array.isArray(data.results)) throw new Error('Unexpected Buttondown list response.');
    items.push(...data.results);
    url = data.next || null;
  }
  if (url) throw new Error('Too many API pages. No messages were changed.');
  return items;
}

export async function syncReminder(plan, request, clock = () => new Date()) {
  const timeNow = () => (clock instanceof Date ? clock : clock()).getTime();
  const tooLate = () => !plan.ready || Date.parse(plan.remindAt) <= timeNow() + 120000;
  // Check the newsletter identity before touching any emails. No subscriber API is used.
  const newsletters = await listPages(request, 'newsletters');
  if (!newsletters.some(n => n.username === plan.username)) throw new Error('The API key does not match the configured newsletter username.');
  if (newsletters.length !== 1) throw new Error('Use a dedicated single-newsletter account/key for reading club reminders.');
  const emails = await listPages(request, 'emails?source=api');
  const owned = emails.filter(e => e.metadata?.reading_club === MARKER);
  const current = owned.filter(e => e.metadata.session_id === plan.sessionId && e.status !== 'deleted');
  let withdrawn=0;
  const cancel = async email => {
    if (!/^[\w-]+$/.test(email.id || '')) throw new Error('Invalid email ID.');
    const result=await request('PATCH', `emails/${email.id}`, {status:'draft'}, email.modification_date || email.status);
    if (result?.status !== 'draft') throw new Error('The provider did not confirm withdrawal of a scheduled reminder.');
    withdrawn++;
  };
  // Withdraw superseded schedules, but never alter unrelated newsletter messages.
  for (const email of owned) if (email.status === 'scheduled' && (!plan.enabled || email.metadata.session_id !== plan.sessionId)) await cancel(email);
  if (!plan.enabled || !plan.payload) return {state:'disabled', scheduledAt:null};
  if (current.some(e => COMMITTED.has(e.status))) {
    for (const email of current) if (email.status === 'scheduled') await cancel(email);
    return {state:'already_sent_or_requires_review', scheduledAt:null};
  }
  const pending = current.filter(e => EDITABLE.has(e.status));
  if (pending.length > 1) throw new Error('Multiple reminders exist for this session. Review them in Buttondown before proceeding.');
  if (tooLate()) {
    // Leave a matching due schedule to Buttondown. Never create a late reminder.
    for (const email of pending) {
      if (email.status === 'scheduled' && Date.parse(email.publish_date) > timeNow() && Date.parse(email.publish_date) !== Date.parse(plan.remindAt)) await cancel(email);
    }
    return {state:'deadline_passed_or_too_close', scheduledAt:null, withdrawn};
  }
  let email = pending[0];
  if (!email) {
    // Create a harmless draft first. An interrupted run can find and resume it.
    email = await request('POST', 'emails', {...plan.payload, status:'draft'});
  }
  if (!/^[\w-]+$/.test(email?.id || '')) throw new Error('Buttondown did not return a valid email ID.');
  // API reads/creation may have taken time. Recheck before enabling a real send.
  if (tooLate()) return {state:'deadline_passed_or_too_close', scheduledAt:null, withdrawn};
  const unchanged = email.status === 'scheduled' && email.subject === plan.payload.subject && email.body === plan.payload.body && Date.parse(email.publish_date) === Date.parse(plan.remindAt);
  if (!unchanged) await request('PATCH', `emails/${email.id}`, plan.payload, email.modification_date || email.status);
  return {state:unchanged ? 'unchanged' : 'scheduled', scheduledAt:plan.remindAt};
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--apply', '--check'].includes(arg))) throw new Error('Usage: node scripts/schedule-reminder.mjs [--check|--apply]');
  const club = parseConfig(await readFile(path.join(ROOT, 'content.js'), 'utf8'));
  const plan = makePlan(club, await readFile(path.join(ROOT, 'index.html'), 'utf8'));
  // Default is a local preview with zero API calls, even if a key is available.
  if (!args.includes('--apply')) {
    console.log(JSON.stringify({mode:'preview',enabled:plan.enabled,session:plan.sessionId,start:plan.start,reminder:plan.remindAt,ready:plan.ready,subject:plan.payload?.subject}, null, 2));
    return;
  }
  if (!process.env.BUTTONDOWN_API_KEY) {
    if (plan.enabled) throw new Error('BUTTONDOWN_API_KEY is not configured. No reminder was scheduled.');
    console.log('Email reminders are not enabled. Connect the Buttondown account before activation.');
    return;
  }
  if (!usernameOK(plan.username)) throw new Error('Configure the Buttondown username before synchronizing.');
  const result = await syncReminder(plan, makeClient(process.env.BUTTONDOWN_API_KEY));
  console.log(JSON.stringify(result));
  if (result.state === 'deadline_passed_or_too_close') console.warn('::warning::The one-week 15:00 Copenhagen invitation deadline has passed or is less than two minutes away. No catch-up email was scheduled; obsolete future reminders were withdrawn.');
  if (result.state === 'already_sent_or_requires_review') console.warn('::warning::A reminder was already sent, queued, paused, or errored. Review Buttondown; no repeat was sent.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
