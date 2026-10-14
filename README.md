# Reading Club

A simple website for a reading club that meets every two weeks. Browse the next session, search past discussions, download presentation slides, and open PDF materials. No npm, database, or build step is required.

**Website:** <https://wangshuaiia.github.io/reading-club/>

Meetings take place every other Thursday at 17:00 Copenhagen time (Europe/Copenhagen). The next session introduces Jev on Thursday, 22 October 2026 at 17:00 CEST (UTC+02:00). The archive contains five PDF presentations from August to October 2026. The dates, titles, and presenters in the editing examples below are placeholders; replace them with confirmed details.

## Files

```text
reading-club/
├── index.html       # Page structure and English interface text
├── style.css        # Styling and responsive layout
├── app.js           # Content rendering, English date formatting, and search
├── discussion.js    # Session discussions and public GitHub comments
├── analytics.js     # Private GoatCounter visit tracking
├── content.js       # Edit this file for regular content updates
├── .nojekyll        # Skip Jekyll processing
├── README.md
└── slides/          # Upload PPT, PPTX, and PDF files here
```

## Update the next session

Open `content.js` on GitHub and click the edit button. Replace `next: null,` with a session object, for example:

```js
next: {
  date: "2026-10-27",
  title: "Your book or paper title",
  speaker: "Presenter name",
  time: "19:00–20:00 (Europe/Stockholm)",
  location: "Online meeting URL or venue",
  summary: "Please read chapters 1–3. Discussion question: What is the author’s central argument?",
  readingUrl: "https://example.com/paper",
  slides: "",
  pdf: ""
},
```

Use your actual date, time, and time zone. Dates are displayed in English with the month written out, for example **27 October 2026**, to avoid ambiguity for international readers.

`location` appears as plain text; visitors can copy a meeting URL. `readingUrl` creates a clickable reading-material button. Use `next: null` when the next session has not been announced.

You can set `readingLabel: "Official blog"` to customize the reading-material button, and add a `references` array for further reading:

```js
references: [
  { title: "Related paper title", url: "https://arxiv.org/abs/example" }
],
```

## Add a past session

1. Upload your presentation to `slides/`, for example `2026-10-27-topic.pptx`. You can also export and upload a PDF for browser reading.
2. Add an object inside the `archive` array in `content.js`. For the first record, replace `archive: []` with:

```js
archive: [
  {
    date: "2026-10-27",
    title: "Your book or paper title",
    speaker: "Presenter name",
    summary: "Key points and takeaways from this discussion.",
    tags: ["Paper", "Methods"],
    readingUrl: "",
    slides: "slides/2026-10-27-topic.pptx",
    pdf: "slides/2026-10-27-topic.pdf"
  }
]
```

3. Add later records inside the same array, separated by commas. The site sorts sessions from newest to oldest.
4. Update `next` with the following session and keep `demo: false`.
5. Commit your changes. The website updates after GitHub Pages finishes deploying.

If a scheduled date has passed, the site displays a reminder. It does not automatically move records to the archive, add 14 days, or upload files.

## Session discussions

Each session has a permanent GitHub issue for questions, reading notes, requested topics, and feedback. Visitors can read comments on the website without signing in. To post, they click **Add a note or review on GitHub**, sign in to GitHub, and leave a comment. They can return and click **Refresh comments** to see the new comment on the website. Comments are public.

The website shows comments in chronological order, 20 at a time. **Load more comments** displays the next page. If GitHub's public API is unavailable or rate-limited, the direct GitHub discussion link still works.

For each new session, create a GitHub issue in this repository with a title such as `[Reading Club YYYY-MM-DD] Session title`. Include short prompts for pre-session questions and post-session feedback. Add the issue number as `discussionIssue` in the session's `content.js` object:

```js
discussionIssue: 7,
```

When moving a session from `next` to `archive`, preserve its `discussionIssue` so all questions, reviews, and replies remain together. The currently configured repository is `Wangshuaiia/reading-club`, stored in `discussionRepo`.

The presenter and organizer can reply and manage comments directly on GitHub. Enable GitHub notifications on the issues if you want alerts for new questions. You can hide or remove inappropriate comments using GitHub's normal moderation controls. No GitHub access token is stored in the website.

## Content guidelines

- Write session titles, summaries, and tags in English for the international audience.
- Use dates in `YYYY-MM-DD` format. Include a time zone whenever you list a meeting time.
- Leave unavailable links as `""`. Their buttons stay hidden; the site shows “Materials coming soon” when a listed session has no materials.
- Use relative paths such as `slides/filename.pptx`, without a leading `/`. File names and capitalization must match the uploaded files.
- Prefer file names made from English words, dates, and hyphens, without spaces.
- Wrap text in double quotes. Escape a double quote inside text as `\"`, and use `\n` for a line break. Preserve commas between objects and array entries.
- `slides`, `pdf`, and `readingUrl` also accept full `https://` URLs. External slide links may open a download page instead of starting a download.
- PPT/PPTX files are provided as downloads. Whether a PDF opens in the browser depends on the visitor’s browser settings.
- Visitors browse the site. Upload and edit content through GitHub.

GitHub browser uploads are limited to 25 MiB per file; ordinary Git pushes reject individual files over 100 MiB. Compress larger presentations or attach them to a GitHub Release and use the full download URL. See [GitHub’s file-size guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Local preview

Open `index.html` in a browser. Alternatively, run this command inside the website folder:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Keep the HTML, CSS, JavaScript, and materials in their original folder structure.

## GitHub Pages configuration

This repository publishes from **main / (root)**. Future commits trigger a new deployment.

For another repository:

1. Upload the website files to the repository root, with `index.html` at the top level. Keep `slides/` and `.nojekyll`.
2. If your upload tool hides `.nojekyll`, create that file using **Add file → Create new file**. A line such as `# Static website` is sufficient; the file just needs to exist.
3. Open **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**, select your source branch and **/ (root)**, and click **Save**.
5. Wait for deployment and use the URL shown in the Pages settings.

See [GitHub’s publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

The repository and website are public, so only upload materials you intend to share with the audience.

## Visitor statistics

Cookieless tracking remains enabled for `ai-frontier-reading-club.goatcounter.com`. The website does not display statistics, fetch public counters, or embed a dashboard.

View visits, countries/regions, referrals and trends at <https://ai-frontier-reading-club.goatcounter.com/> without signing in. GoatCounter's **Dashboard viewable by** is set to **Anyone**, **Allow adding visitor counts on your website** is disabled, and **Sites that can embed GoatCounter** is empty. These settings restrict display; they do not stop visit collection or delete existing data.

Tracking runs only on the published `https://wangshuaiia.github.io/reading-club/` website. Local/file previews and unrelated domains do not send pageviews. The tracked page path is normalized so query strings and section hashes do not create separate pages. The GoatCounter script may process query parameters for campaign attribution.

Keep `analytics.enabled: true` and `analytics.siteCode: "ai-frontier-reading-club"` in `content.js`. Never store passwords or API tokens in this public repository. Statistics began on 14 October 2026; earlier traffic cannot be reconstructed. Counts approximate visits rather than lifetime unique individuals. Geography is estimated from network location.

Official documentation: [Integration](https://www.goatcounter.com/help/start), [visit definitions](https://www.goatcounter.com/help/sessions), and [privacy](https://www.goatcounter.com/help/privacy).
