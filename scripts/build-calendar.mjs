import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseConfig} from './schedule-reminder.mjs';
import {calendarEvent,makeICS} from '../calendar.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const club=parseConfig(await readFile(path.join(root,'content.js'),'utf8'));
if (club.next) {
  const html=await readFile(path.join(root,'index.html'),'utf8');
  const zoom=html.match(/href="(https:\/\/dtudk\.zoom\.us\/j\/[^"<>\s]+)"/)?.[1]?.replaceAll('&amp;','&');
  const event=calendarEvent(club.next,zoom);
  const directory=path.join(root,'calendar');
  await mkdir(directory,{recursive:true});
  const target=path.join(directory,`${event.sessionId}.ics`);
  const expected=makeICS(event);
  const normalize=s=>s.replace(/^DTSTAMP:.*\r?\n/gm,'');
  if (process.argv.includes('--check')) {
    const actual=await readFile(target,'utf8').catch(()=> '');
    if (normalize(actual)!==normalize(expected)) throw new Error('Calendar file is missing or stale. Run node scripts/build-calendar.mjs and commit the calendar file.');
    console.log(`Calendar verified: ${event.sessionId}.ics`);
  } else {
    await writeFile(target,expected);
    console.log(`Calendar written: ${event.sessionId}.ics`);
  }
}
