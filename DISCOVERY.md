# Tagalong discovery playbook

Last reviewed: September 5, 2026. This is an authoring document, excluded from the deployed site. The GitHub repository is public: never add private transcripts, analytics exports, credentials, customer details or internal third-party research here.

## Objective

Help suitable buyers discover, understand and accurately choose Tagalong through Google, Bing and AI answers. Track recommendations separately from citations, and both separately from visits or downloads.

Start with buying needs where the product has useful evidence: Mac meeting workflows, local meeting files, enhanced personal notes, visual notes and selected task exports. Explain local storage separately from cloud transcription/AI processing. Some processing starts automatically after recording stops; do not imply every transmission requires a separate click.

## Content architecture

Use the existing Markdown collection and article types. The name `/collections/` carries no special ranking guarantee. A collection must help a reader decide or complete a workflow, rather than serve as an empty tag archive.

| Priority | Canonical destination | Job |
| --- | --- | --- |
| First | `/collections/granola-alternatives/` (built; deployment pending) | Fair, sourced comparison for people considering a Mac alternative. Include Tagalong in the actual comparison, with the same criteria as other entries. |
| First | `/collections/meeting-notes/` (existing source) | Strengthen in place into the main Mac meeting-notes hub. Keep its URL; avoid a duplicate Mac-notes hub. |
| First | `/blog/meeting-data-on-your-mac/` (existing source) | Explain files, local search, cloud processing, backups and selected sharing using a data-flow table and concrete examples. |
| Next | `/blog/meeting-action-items-apple-reminders/` (built; deployment pending) | Demonstrate reviewing and exporting selected tasks, with a synthetic meeting and an honest one-way export boundary. |
| Next | `/collections/visual-meeting-notes/` (built; deployment pending) | A useful gallery with source context, output, plain-text explanation and limitations. |
| After comparison research | `/blog/tagalong-vs-granola/` (proposed) | Detailed two-product evaluation if it adds enough depth beyond the shortlist. Otherwise keep it a section in the shortlist. |
| Release-gated | `/collections/meeting-ai-connections/` (proposed) | Document released Claude/ChatGPT experiences, setup, requirements and explicit folder access, including future meeting text. Claude is released in 3.4.1; ChatGPT interactive rendering is unvalidated. Publish only claims supported by release and client evidence. |

Do not create separate URLs for spelling variants such as notetaker/note taker, Mac/macOS or several phrasings of the same Granola-alternative question. Use those words naturally within a strong canonical page. Persona pages require a genuinely different workflow and evidence, not a swapped job title.

## Current pillar and cluster map

Main navigation → Guides (`/collections/`) → AI meeting notes for Mac (`/collections/meeting-notes/`). Its supporting pages are Granola alternatives, local data handling, Apple Reminders export, and visual meeting notes. Blog is a chronological route to articles, not the topic hierarchy. Setup is the product manual.

Use `pillar: meeting-notes` on those supporting entries. The build makes pillar-to-child links, child-to-pillar links, sibling suggestions, and aligned breadcrumb/schema relationships explicit. Continue adding contextual links where they answer the reader’s next question; avoid unrelated sitewide keyword links. Keep one authoritative pillar per distinct intent.

## Collection anatomy

1. A clear H1 and concise answer to the buying question, naming its subject.
2. A decision aid: comparison table, workflow choices or gallery with explanations.
3. Original product evidence using public assets or synthetic meeting material, including the released app version.
4. Practical requirements, plan boundaries and real tradeoffs.
5. Follow-up questions with answers that remain understandable outside the page context.
6. Links to supporting tutorials, relevant product sections, pricing and download.

Keep the useful answer near the top. Longer supporting material can follow it; do not bury the only answer under a long introduction. Use length needed to resolve the question, not a mandatory word count.

## Research and claims

Use `content/templates/brief.md` before drafting a substantial page. Keep filled briefs outside the publishable `content/posts/` and `content/collections/` directories. Keep confidential research outside this public repository entirely.

For every factual comparison, record the exact claim, source, checked date, version/plan, and whether it is confirmed, corrected or unverified. Official documentation can establish documented features. Only actual recorded testing can establish what we personally tested. Remove unverified performance, adoption and superiority claims.

A vendor-authored comparison should identify its publisher and criteria. Give every app the same columns and describe when another app is a better fit. Tagalong should be a named row/entry, not just an introductory mention or closing CTA. Do not award ourselves an unsupported universal “best” ranking.

Separate four product states: public release, implemented candidate, tested candidate and planned. Check the downloadable build and release evidence before changing a candidate into an available feature. The connector README and its QA report must both be read because a separately tested extension can be newer than the one bundled in the Mac app.

Verify Free/Pro/Private pricing and limitations at publication. Preserve the Free tier. Distinguish one-way task creation from two-way synchronization. Describe actual ChatGPT workspace/tunnel prerequisites. Do not describe local storage as all processing being offline, a certification, or proof that data never leaves the Mac.

## Linking and publication

Every collection links to its published articles; every article links to its parent collection. Add relevant sibling links within the body where they help the next question. Links should describe their destination. Keep existing URLs stable and arrange redirects before any rename.

Use existing build metadata, visible authors/dates, answer blocks and truthful structured data. Raw generated HTML is the source of truth for metadata. JSON-LD must describe visible content. No fabricated reviews, ratings or author credentials. FAQ and speakable markup are not substitutes for useful answers or guaranteed AI inclusion.

Follow [CONTENT.md](CONTENT.md) for production builds, draft handling and search submission. Before release, review desktop/mobile readability, table overflow, navigation, source links, canonical/indexing directives, and the current feature/download claims. Do not add tracking vendors or change analytics/privacy configuration as part of writing an article.

## Measurement

The initial [prompt panel](discovery-targets.csv) is a set of proposed research prompts based on product fit and user objectives. It is not a harvested query dataset. Search volume, ranking and AI winnability are UNMEASURED/UNKNOWN until recorded observations exist.

For each observation, store privately: target ID, exact prompt, engine/product, model if exposed, date, locale, account/context notes, response/capture reference, citations, mention tier, first-mention depth and claim accuracy. Record whether the engine exposed a retrieved set. Never label a page NOT-RETRIEVED when that set is unavailable; use RETRIEVAL-UNRESOLVED. An unavailable instrument is not a measured zero.

Use separate columns for source cited, brand named, brand recommended and description accurate. An internal mention scale can help comparisons: 0 absent, 1 prose mention, 2 list/table entry, 3 heading or recommendation. These are chosen operating categories, not an industry ranking formula. Check recommendation and accuracy directly even when a tier is high.

A citation without a named entry calls for attribution/comparison review. Known retrieval without citation calls for a better answer. Confirmed retrieval absence calls for coverage, indexing or relevance work. When observed answers draw their shortlist from outside reviews or roundups, credible third-party evaluation may be the missing work. Do not assume another article fixes every absence.

Freeze the initial panel for comparison and label later additions. Keep proposed prompts separate from observed user queries and engine-issued searches. Review actual Google/Bing data in complete comparable windows, annotate material changes, and collect repeated dated answer observations before claiming a trend. Google Web search performance includes its AI experiences; it is not a clean AI-only traffic report.

No automated posting, outreach or review solicitation is configured here. Third-party coverage should involve real evaluation, transparent affiliation where relevant and genuine user feedback.

## Sources

- [Google AI features and eligibility](https://developers.google.com/search/docs/appearance/ai-features): indexed, snippet-eligible content; no special AI file or schema required.
- [Google helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): useful original contribution and people-first content.
- [Google navigation and site structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure): reachable pages and meaningful internal links.
