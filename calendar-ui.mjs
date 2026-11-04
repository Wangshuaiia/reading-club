import {calendarEvent,calendarLinks} from './calendar.mjs';

function init() {
  const area=document.getElementById('session-calendar');
  const next=window.READING_CLUB?.next;
  if (!area || !next) return;
  try {
    const zoom=document.querySelector('.meeting-info a[href^="https://dtudk.zoom.us/j/"]')?.href;
    const event=calendarEvent(next,zoom);
    const links=calendarLinks(event);
    for (const [key,url] of Object.entries(links)) area.querySelector(`[data-calendar="${key}"]`).href=url;
    document.getElementById('calendar-slot').textContent=`Calendar slot: ${event.duration} minutes. Open a link, review the event, and save it. The .ics file requests a reminder 30 minutes before the session; check your calendar notification settings after saving.`;
    area.hidden=false;
  } catch { /* Leave the existing Zoom calendar download available. */ }
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
