// Shared calendar data for the website, downloadable event, and reminder email.
export const ZONE = 'Europe/Copenhagen';
export const SITE = 'https://wangshuaiia.github.io/reading-club/';

export function localStart(date, clock, zone = ZONE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock || '')) throw new Error('Invalid session date or time.');
  const [y, m, d] = date.split('-').map(Number);
  const [h, minute] = clock.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, h, minute);
  const check = new Date(naive);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) throw new Error('Invalid calendar date.');
  const formatter = new Intl.DateTimeFormat('en-GB', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const parts = ms => Object.fromEntries(formatter.formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  const matches = new Set();
  for (const probe of [naive - 86400000, naive, naive + 86400000]) {
    const p = parts(probe);
    const offset = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-probe;
    const candidate = naive-offset;
    const c = parts(candidate);
    if (c.year===y && c.month===m && c.day===d && c.hour===h && c.minute===minute) matches.add(candidate);
  }
  if (matches.size !== 1) throw new Error('Session time is ambiguous or nonexistent due to daylight saving time.');
  return new Date([...matches][0]);
}

export function sessionStart(next) {
  const clocks = next.time?.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g) || [];
  if (clocks.length !== 1) throw new Error('next.time must contain exactly one 24-hour time.');
  const start = localStart(next.date,clocks[0]);
  const label = new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,day:'numeric',month:'long',year:'numeric'}).format(start);
  if (next.time !== `${label} ${clocks[0]} Copenhagen time`) throw new Error('next.date and next.time disagree. Use the full Copenhagen date and time.');
  return start;
}

export function reminderTime(next) {
  // Subtract calendar days, then resolve 15:00 locally. Subtracting 168 UTC hours
  // would be wrong when Copenhagen changes between summer and winter time.
  sessionStart(next);
  const day = new Date(`${next.date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate()-7);
  return localStart(day.toISOString().slice(0,10),'15:00');
}

export function calendarEvent(next, zoom) {
  const start = sessionStart(next);
  const duration = next.durationMinutes ?? 60;
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error('Invalid calendar duration.');
  const location = new URL(zoom);
  if (location.protocol !== 'https:' || location.hostname !== 'dtudk.zoom.us' || !location.pathname.startsWith('/j/')) throw new Error('Invalid Zoom meeting link.');
  const sessionId = Number.isInteger(next.discussionIssue) ? `session-${next.discussionIssue}` : `session-${next.date}`;
  const reading = next.readingUrl && /^https:\/\//.test(next.readingUrl) ? `\nReading: ${next.readingUrl}` : '';
  const description = `AI Frontier Reading Club\n${next.title}\nWhen: ${next.time}\nPresenter: ${next.speaker || 'Shuai Wang'}\nJoin Zoom: ${zoom}${reading}\nWebsite: ${SITE}\nCalendar slot: ${duration} minutes. Check your calendar notification settings after saving.`;
  return {sessionId,uid:`${sessionId}@wangshuaiia.github.io`,title:`AI Frontier Reading Club: ${next.title}`,start:start.toISOString(),end:new Date(start.getTime()+duration*60000).toISOString(),description,zoom,url:SITE,icsUrl:`${SITE}calendar/${sessionId}.ics`,duration};
}

export const utcStamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
const icalText = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line) {
  const encoder = new TextEncoder();
  let result='', part='', count=0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (count+size>75) { result+=`${part}\r\n`;part=' ';count=1; }
    part+=char;count+=size;
  }
  return result+part;
}
export function makeICS(event, stamp = new Date()) {
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AI Frontier Reading Club//Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${event.uid}`,`DTSTAMP:${utcStamp(stamp)}`,`DTSTART:${utcStamp(event.start)}`,`DTEND:${utcStamp(event.end)}`,`SUMMARY:${icalText(event.title)}`,`DESCRIPTION:${icalText(event.description)}`,`LOCATION:${icalText(event.zoom)}`,`URL:${event.url}`,'STATUS:CONFIRMED','TRANSP:OPAQUE','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT30M','DESCRIPTION:AI Frontier Reading Club starts in 30 minutes','END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
export function calendarLinks(event) {
  const outlookParams = new URLSearchParams({path:'/calendar/action/compose',rru:'addevent',subject:event.title,startdt:event.start,enddt:event.end,body:event.description,location:event.zoom,allday:'false'});
  const googleParams = new URLSearchParams({action:'TEMPLATE',text:event.title,dates:`${utcStamp(event.start)}/${utcStamp(event.end)}`,details:event.description,location:event.zoom,ctz:ZONE});
  return {outlook:`https://outlook.office.com/calendar/0/deeplink/compose?${outlookParams}`,outlookPersonal:`https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams}`,google:`https://calendar.google.com/calendar/render?${googleParams}`,ics:event.icsUrl};
}
