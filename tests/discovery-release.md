# Discovery content release — September 5, 2026

## Scope and status

Website-only source changes. Built locally; browser review, production deployment, and submission of the new content URLs are pending. Do not interpret the existing homepage's indexed status as indexing of these new pages.

The approved animated app demo, logo assets, Free tier, and repository architecture are preserved. The footage is accurately labeled as captured from the v3.4 preview. Product availability copy is updated to the verified public 3.4.1 release. No app/backend files, credentials, private recordings, grounding captures, or customer data are part of this release.

## Five connected destinations

- `/collections/granola-alternatives/`: sourced, publisher-disclosed comparison including Tagalong, Granola, MacWhisper, Muesli, and Fathom; criteria and limitations, without invented testing or rankings.
- `/collections/meeting-notes/`: expanded existing canonical Mac buying/workflow guide. No competing duplicate hub.
- `/blog/meeting-data-on-your-mac/`: expanded existing data-flow explanation, automatic processing, provider routing, explicit folder permissions including future files, and revocation boundaries.
- `/blog/meeting-action-items-apple-reminders/`: synthetic example, actual list/permission controls, exported fields, due-hint versus structured-date distinction, and destination limits.
- `/collections/visual-meeting-notes/`: three existing synthetic public images, source context, text equivalents, useful format choices, and review requirements.

Homepage links lead directly to all three collections. The collection and blog indexes, related articles, topic links, and contextual body links connect the full set.

## Claim evidence

Verified against the current local app implementation and the public release, not inferred from old website text:

- [Tagalong 3.4.1 release](https://github.com/tagalong-ai/releases/releases/tag/v3.4.1), build 76. Current release validation records native Claude 0.4.2 rendering and local open; ChatGPT interactive rendering remains unvalidated.
- `TagalongMenuBar/Models/FeatureGate.swift`: Free meeting limit and paid feature boundaries.
- `TagalongMenuBar/Views/OnboardingView.swift`, `UpgradePromptView.swift`: $9.99/month Pro and $199 one-time Private License; provider usage separate for Private.
- `Services/ActionItemService.swift`, `Services/TaskDestinationService.swift`, and `Views/Meeting/TaskDestinationSheet.swift`: explicit one-way creation and actual supported fields; this release report does not assert live endpoint tests for every task destination.
- `connectors/tagalong/README.md`, `MCP_APP_QA.md`, and `release-plans/validation-3.4.1.md`: current versus legacy permissions, Claude installation/runtime, folder restrictions, read-only/media boundaries, ChatGPT prerequisites and unvalidated experience.
- Transcription, notes, search, and provider-routing source checks underpin the data-flow copy. The privacy policy is linked from all relevant public explanations.

Competitor documentation checked September 5, 2026:

- [Granola pricing](https://www.granola.ai/pricing), [Granola security](https://www.granola.ai/security).
- [MacWhisper](https://www.macwhisper.com/).
- [Muesli product explanation](https://muesli.works/granola-alternative).
- [Fathom pricing and feature matrix](https://www.fathom.ai/pricing), including the explicit bot-free Mac beta status.

## Completed verification

- Production build: **15 HTML pages, 12 sitemap URLs, 2 articles**.
- Full generated-site checker passes: exactly one nonempty title/description/robots directive, unique indexable metadata, canonical URLs, JSON-LD syntax, internal targets and anchors, duplicate IDs, sitemap canonicals and indexability, RSS XML, and authoring-file exclusion.
- **16 Python publishing tests pass**, including draft/date handling, pagination, invalid metadata, HTML safety, image dimensions, and checker regressions.
- **15 native-tour behavior tests pass**, including autoplay, pause/replay, keyboard navigation, reduced motion, media failures, offscreen suspension, and pricing/release boundaries.
- Local PNG/JPEG editorial images receive intrinsic dimensions; inline images lazy-load. The visual collection's social image does not repeat as an oversized hero.
- Answers precede the mobile table of contents; comparison tables have keyboard-focusable horizontal scrolling and a mobile hint. Related cards use h3 beneath their h2 section.
- Generated public HTML/XML contains no personal Gmail contact or Elisity material.
- IndexNow dry-run validates the five canonical URLs; **no submission was sent**.

## Remaining browser and deployment checks

The tool sandbox denies localhost server binding with `PermissionError: Operation not permitted`; Chrome reports `ERR_CONNECTION_REFUSED` on port 4173. GitHub shell DNS is blocked and the GitHub connector is not signed in. These are environment limitations, not test passes.

From the website directory, start `python3 scripts/preview.py --port 4173`. Then review desktop and mobile widths: typography, page overflow, table scrolling, gallery readability, menu, keyboard focus, FAQ controls, section links, downloads, and console/resource errors. The content must remain useful with JavaScript disabled.

After browser fixes and publication, verify Cloudflare's production build and live routes, sitemap, robots, feed, key file, HTTP 404 behavior, and download destination. Submit the sitemap and five canonical content URLs in the separate **Tagalong** Google Search Console and Bing Webmaster Tools properties. Record accepted submissions separately from actual indexed status. Search engines determine crawl timing, indexing, rankings, and AI citations.
