import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {calendarEvent,calendarLinks,makeICS,reminderTime} from '../calendar.mjs';
import {localStart, makePlan, parseConfig, syncReminder, makeClient} from '../scripts/schedule-reminder.mjs';

const now = new Date('2026-10-28T12:00:00Z');
const html = '<a href="https://dtudk.zoom.us/j/12345?pwd=test&amp;x=1">Join Zoom meeting</a>';
const club = () => ({reminders:{enabled:true,buttondownUsername:'ai-frontier-reading-club'},next:{date:'2026-11-05',time:'5 November 2026 17:00 Copenhagen time',title:'RSI & agents',speaker:'Shuai Wang',discussionIssue:7}});
const plan = () => makePlan(club(), html, now);
const owned = (id, session, status = 'scheduled') => ({id,status,publish_date:'2026-10-29T14:00:00Z',modification_date:'revision-1',metadata:{reading_club:'Wangshuaiia/reading-club/30-minute-reminder-v1',session_id:session}});
function fakeProvider(initial = [], options = {}) {
  const emails = structuredClone(initial);
  const calls = [];
  const request = async (method, url, body) => {
    calls.push({method,url,body:structuredClone(body)});
    if (url === 'newsletters') return {results:options.newsletters || [{username:'ai-frontier-reading-club'}],next:null};
    if (method === 'GET') return {results:structuredClone(emails),next:null};
    if (method === 'POST') { const email={...structuredClone(body),id:`em-${emails.length+1}`,modification_date:'revision-1'};emails.push(email);return structuredClone(email); }
    const email=emails.find(e=>e.id===url.split('/').at(-1));
    assert.ok(email);
    Object.assign(email,structuredClone(body));
    email.modification_date+='-updated';
    return structuredClone(email);
  };
  return {emails,calls,request};
}

test('Copenhagen winter and summer convert to different UTC offsets', () => {
  assert.equal(localStart('2026-11-05','17:00').toISOString(),'2026-11-05T16:00:00.000Z');
  assert.equal(localStart('2026-07-02','17:00').toISOString(),'2026-07-02T15:00:00.000Z');
  assert.throws(()=>localStart('2026-03-29','02:30'),/nonexistent/);
  assert.throws(()=>localStart('2026-10-25','02:30'),/ambiguous/);
  assert.throws(()=>localStart('2026-02-30','17:00'),/calendar/);
});
test('invitation is scheduled for the preceding Thursday at 15:00 Copenhagen', () => {
  const p=plan();
  assert.equal(p.remindAt,'2026-10-29T14:00:00.000Z');
  assert.equal(Date.parse(p.start)-Date.parse(p.remindAt),7*86400000+2*3600000);
  assert.match(p.payload.subject,/^Next week:/);
  assert.match(p.payload.body,/Add to Outlook/);
  assert.match(p.payload.body,/session-7\.ics/);
  assert.equal(p.payload.archival_mode,'disabled');
  assert.match(p.payload.body,/Zoom meeting/);
  assert.match(p.payload.body,/RSI &amp; agents/);
  assert.match(p.payload.body,/unsubscribe/);
});
test('invitation uses 15:00 a week earlier regardless of the session clock', () => {
  const c=club();c.next.time='5 November 2026 00:15 Copenhagen time';
  assert.equal(makePlan(c,html,now).remindAt,'2026-10-29T14:00:00.000Z');
});
test('conflicting date text and unsafe newsletter usernames fail closed', () => {
  const c=club();c.next.time='6 November 2026 17:00 Copenhagen time';
  assert.throws(()=>makePlan(c,html,now),/disagree/);
  const d=club();d.reminders.buttondownUsername='bad.example/other';
  assert.throws(()=>makePlan(d,html,now),/username/);
});
test('JSON configuration is parsed without executing code', () => {
  assert.deepEqual(parseConfig('// comment\nwindow.READING_CLUB = {"next":null};'),{next:null});
  assert.throws(()=>parseConfig('window.READING_CLUB = (()=>{throw Error("executed")})()'),SyntaxError);
});
test('new reminder is drafted then scheduled; a repeated run creates no duplicate', async () => {
  const p=fakeProvider();
  assert.equal((await syncReminder(plan(),p.request,now)).state,'scheduled');
  assert.equal(p.calls.find(c=>c.method==='POST').body.status,'draft');
  assert.equal(p.emails[0].status,'scheduled');
  assert.equal((await syncReminder(plan(),p.request,now)).state,'unchanged');
  assert.equal(p.calls.filter(c=>c.method==='POST').length,1);
  assert.equal(p.calls.filter(c=>c.method==='PATCH').length,1);
});
test('rescheduling the same session updates the existing reminder', async () => {
  const p=fakeProvider();await syncReminder(plan(),p.request,now);
  const c=club();c.next.date='2026-11-12';c.next.time='12 November 2026 17:00 Copenhagen time';
  await syncReminder(makePlan(c,html,now),p.request,now);
  assert.equal(p.emails.length,1);
  assert.equal(p.emails[0].publish_date,'2026-11-05T14:00:00.000Z');
});
test('superseded reminder is withdrawn while unrelated messages are untouched', async () => {
  const old=owned('old','discussion-6');const unrelated={id:'personal',status:'scheduled',metadata:{},subject:'Other newsletter'};
  const p=fakeProvider([old,unrelated]);await syncReminder(plan(),p.request,now);
  assert.equal(p.emails.find(e=>e.id==='old').status,'draft');
  assert.equal(p.emails.find(e=>e.id==='personal').status,'scheduled');
});
test('disabling reminders cancels owned schedules without deleting history', async () => {
  const p=fakeProvider([owned('one','discussion-7')]);const c=club();c.reminders.enabled=false;
  await syncReminder(makePlan(c,html,now),p.request,now);
  assert.equal(p.emails[0].status,'draft');
  assert.equal(p.calls.some(c=>c.method==='DELETE'),false);
});
test('removing next session cancels owned schedules', async () => {
  const p=fakeProvider([owned('one','discussion-7')]);const c=club();c.next=null;
  await syncReminder(makePlan(c,html,now),p.request,now);
  assert.equal(p.emails[0].status,'draft');
});
test('a sent or queued reminder cannot be resent', async () => {
  for(const status of ['sent','about_to_send','in_flight','errored']) {
    const p=fakeProvider([owned('one','discussion-7',status)]);
    assert.equal((await syncReminder(plan(),p.request,now)).state,'already_sent_or_requires_review');
    assert.equal(p.calls.some(c=>c.method==='POST'),false);
  }
});
test('duplicate pending reminders fail instead of sending another', async () => {
  const p=fakeProvider([owned('a','discussion-7'),owned('b','discussion-7')]);
  await assert.rejects(syncReminder(plan(),p.request,now),/Multiple reminders/);
  assert.equal(p.calls.some(c=>c.method==='POST'),false);
});
test('missed deadlines do not cause a late reminder', async () => {
  const p=fakeProvider();const late=new Date('2026-10-29T14:01:00Z');
  assert.equal((await syncReminder(makePlan(club(),html,late),p.request,late)).state,'deadline_passed_or_too_close');
  assert.equal(p.calls.some(c=>c.method==='POST'||c.method==='PATCH'),false);
});
test('a matching due schedule is left to the email provider', async () => {
  const p=fakeProvider([owned('one','discussion-7')]);const late=new Date('2026-10-29T14:01:00Z');
  await syncReminder(makePlan(club(),html,late),p.request,late);
  assert.equal(p.emails[0].status,'scheduled');
});
test('a slow provider response cannot turn a draft into a late scheduled send', async () => {
  const p=fakeProvider();let current=new Date('2026-10-29T13:55:00Z');
  const request=async(...args)=>{const r=await p.request(...args);if(args[0]==='POST')current=new Date('2026-10-29T14:01:00Z');return r;};
  assert.equal((await syncReminder(plan(),request,()=>current)).state,'deadline_passed_or_too_close');
  assert.equal(p.emails[0].status,'draft');
  assert.equal(p.calls.some(c=>c.method==='PATCH'),false);
});
test('wrong newsletter key is rejected before changing messages', async () => {
  const p=fakeProvider([],{newsletters:[{username:'different-account'}]});
  await assert.rejects(syncReminder(plan(),p.request,now),/does not match/);
  assert.equal(p.calls.length,1);
});
test('pagination cannot forward the API key to another host', async () => {
  let count=0;const request=makeClient('not-a-real-key',async()=>{count++;return{ok:true,status:200,json:async()=>({results:[{username:'ai-frontier-reading-club'}],next:'https://evil.invalid/steal'})}});
  await assert.rejects(syncReminder(plan(),request,now),/unexpected API URL/);
  assert.equal(count,1);
});
test('provider errors are sanitized and mutations have idempotency keys', async () => {
  const captured=[];const client=makeClient('test-key',async(url,opts)=>{captured.push(opts);return{ok:true,status:200,json:async()=>({id:'one'})}});
  await client('POST','emails',{status:'draft'});await client('POST','emails',{status:'draft'});
  assert.equal(captured[0].headers['X-Idempotency-Key'],captured[1].headers['X-Idempotency-Key']);
  const failure=makeClient('test-key',async()=>({ok:false,status:403,json:async()=>({secret:'must not leak'})}));
  await assert.rejects(failure('GET','emails'),e=>!e.message.includes('must not leak')&&/403/.test(e.message));
});
test('subscription stays disabled before setup and uses a native provider POST after setup', async () => {
  const source=await readFile(new URL('../subscription.js',import.meta.url),'utf8');
  function render(settings) {
    const elements=new Map(['reminder-form','reminder-fields','reminder-badge','reminder-status'].map(id=>[id,{disabled:true,hidden:false,addEventListener(type,listener){this[type]=listener}}]));
    vm.runInNewContext(source,{window:{READING_CLUB:{reminders:settings}},document:{getElementById:id=>elements.get(id)}});
    return elements;
  }
  const off=render({enabled:false,buttondownUsername:''});
  assert.equal(off.get('reminder-fields').disabled,true);
  assert.equal(off.get('reminder-form').action,undefined);
  let prevented=false;off.get('reminder-form').submit({preventDefault(){prevented=true}});assert.equal(prevented,true);
  const on=render({enabled:true,buttondownUsername:'ai-frontier-reading-club'});
  assert.equal(on.get('reminder-fields').disabled,false);
  assert.equal(on.get('reminder-form').action,'https://buttondown.com/api/emails/embed-subscribe/ai-frontier-reading-club');
  assert.equal(on.get('reminder-badge').hidden,true);
});


test('the invitation clock stays at 15:00 across Copenhagen DST and year boundaries', () => {
  for (const [date,time,expected] of [
    ['2026-10-29','29 October 2026 17:00 Copenhagen time','2026-10-22T13:00:00.000Z'],
    ['2026-04-02','2 April 2026 17:00 Copenhagen time','2026-03-26T14:00:00.000Z'],
    ['2027-01-07','7 January 2027 17:00 Copenhagen time','2026-12-31T14:00:00.000Z'],
  ]) assert.equal(reminderTime({date,time}).toISOString(),expected);
});
test('changing to the weekly policy withdraws the old 30-minute reminder without catch-up', async () => {
  const old=owned('legacy','discussion-7'); old.publish_date='2026-11-05T15:30:00Z';
  const provider=fakeProvider([old]); const today=new Date('2026-11-04T12:00:00Z');
  const result=await syncReminder(makePlan(club(),html,today),provider.request,today);
  assert.equal(result.state,'deadline_passed_or_too_close');
  assert.equal(result.withdrawn,1);
  assert.equal(provider.emails[0].status,'draft');
  assert.equal(provider.calls.some(c=>c.method==='POST'),false);
});
test('calendar links preserve the title, UTC start/end, Zoom URL and stable per-session ICS', () => {
  const c=club(); const event=calendarEvent(c.next,'https://dtudk.zoom.us/j/123?pwd=x&other=y');
  const links=calendarLinks(event);
  for (const key of ['outlook','outlookPersonal']) {
    const u=new URL(links[key]);
    assert.equal(u.searchParams.get('startdt'),'2026-11-05T16:00:00.000Z');
    assert.equal(u.searchParams.get('enddt'),'2026-11-05T17:00:00.000Z');
    assert.equal(u.searchParams.get('subject'),'AI Frontier Reading Club: RSI & agents');
    assert.equal(u.searchParams.get('location'),event.zoom);
  }
  assert.equal(new URL(links.google).searchParams.get('dates'),'20261105T160000Z/20261105T170000Z');
  assert.equal(links.ics,'https://wangshuaiia.github.io/reading-club/calendar/session-7.ics');
  assert.throws(()=>calendarEvent({...c.next,durationMinutes:0},event.zoom),/duration/);
  assert.throws(()=>calendarEvent(c.next,'javascript:alert(1)'),/Zoom/);
});
test('ICS is a single UTC event with a 30-minute alarm, escaped text and UTF-8-safe folding', () => {
  const next={...club().next,title:'AI, research; 中文'.repeat(12)+'\nEND:VEVENT'};
  const event=calendarEvent(next,'https://dtudk.zoom.us/j/123?pwd=test');
  const ics=makeICS(event,new Date('2026-11-04T10:00:00Z'));
  const unfolded=ics.replace(/\r\n /g,'');
  assert.equal((ics.match(/^BEGIN:VEVENT\r?$/gm)||[]).length,1);
  assert.equal((ics.match(/^END:VEVENT\r?$/gm)||[]).length,1);
  assert.match(unfolded,/DTSTART:20261105T160000Z/);
  assert.match(unfolded,/DTEND:20261105T170000Z/);
  assert.match(unfolded,/UID:session-7@wangshuaiia.github.io/);
  assert.match(unfolded,/TRIGGER:-PT30M/);
  assert.ok(unfolded.includes('AI\\, research\\; 中文'));
  assert.ok(unfolded.includes('\\nEND:VEVENT'));
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line)<=75);
  assert.equal(ics.replace(/\r\n/g,'').includes('\n'),false);
});
