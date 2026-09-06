# Publishing Tagalong content

The existing HTML/CSS/JS website remains the source for the product and support pages. A small Python build converts Markdown into static HTML and packages only public files into `dist/`. Cloudflare Pages serves that directory. There is no client-side content fetching, database, or CMS account.

For topic selection, fair comparisons, source review and measurement, use [DISCOVERY.md](DISCOVERY.md) and the [research brief template](content/templates/brief.md).

## Write and publish an article

1. Copy `content/templates/post.md` into `content/posts/your-article-slug.md`.
2. Set its title, description, actual publication date, author, and collections. Write the article using Markdown; start sections with `##` because the template supplies the page title.
3. Keep `draft: true` while editing. Preview drafts locally with the commands below.
4. Set `draft: false`, build and check, then commit to a branch and merge to `main`.
5. Cloudflare rebuilds the site. The article appears at `/blog/your-article-slug/`, in its collections, in the blog index, RSS feed, and sitemap.

The GitHub repository is public. Draft status excludes a page from the deployed site; it does not make committed Markdown private. Never put private meeting material in content or assets.

## Create a collection

Copy `content/templates/collection.md` into `content/collections/topic-slug.md`. A collection contains its own editorial introduction and optional curated resource links. Articles join it by listing `topic-slug` in their `collections` field. They appear automatically below its introduction. The collection lives at `/collections/topic-slug/` and is linked from `/collections/`.

Use collections for meaningful topics, workflows, or use cases. Write distinct, useful introductions; avoid publishing multiple near-identical pages just to target keyword variants.

## Pillars and topic clusters

The main navigation links to **Guides** (`/collections/`) and **Blog** (`/blog/`); **Setup** remains the app manual at `/guide`. Guides features root pillar pages and their supporting pages instead of a flat list of collection files.

The first pillar is `/collections/meeting-notes/`. Granola alternatives, local data handling, Apple Reminders export, and the visual-note gallery each declare `pillar: meeting-notes`. The pillar links to every supporting page, each supporting page links back near its heading, and related-topic cards connect siblings. Contextual links in the body remain editorial choices. New topics can introduce another root collection and their own supporting pages without renaming existing URLs.

## Front matter

| Field | Purpose |
| --- | --- |
| `title` | Required. Visible page heading and default search/social title. |
| `description` | Required. Visible introduction and default search/social description. |
| `seoTitle`, `seoDescription` | Optional search/social overrides; the visible heading and introduction stay separate. |
| `draft` | Required Boolean. `true` excludes the page from production. |
| `date` | Required for articles; actual publication date, `YYYY-MM-DD`. |
| `updated` | Article modification date; defaults to `date`. Required for collections. Change only after a material content update. |
| `author` | Required for articles. Registry key in `content/site.json`; `tagalong` is the organization byline. Add a real person only with their actual name and profile URL. |
| `layout` | Optional `pillar`, `comparison`, `gallery`, or `article` treatment, using the Tagalong palette and typography. |
| `takeaways` | Optional list of one to four concise, verified takeaways below the quick answer. |
| `pillar` | Optional collection slug for a supporting page. Generates a pillar backlink, topic breadcrumbs, related-topic cards, and matching schema. Must reference a published root collection; cycles fail the build. |
| `collections` | Article list of collection filenames without `.md`. Unknown or unpublished collections fail the build. |
| `answer` | Optional concise answer displayed in an “At a glance” block. |
| `image`, `imageAlt` | Optional representative image and required alternative text. Use a public HTTPS URL or `/assets/...` path. Images also populate article/social metadata. |
| `showCover` | Optional Boolean, default `true`. Use `false` to keep the image in social metadata without repeating it as a large cover. |
| `faqs` | Optional list of `{question, answer}` objects, rendered as accessible questions and answers. |
| `resources` | Optional list of `{title, url, description}` links, especially useful for collections. |

YAML keys must be unique; unknown fields are rejected to catch typos. Filenames use lowercase words separated by hyphens. Markdown supports headings, lists, links, images, quotes, fenced code, tables, and strikethrough. Raw HTML is escaped. Use root-relative internal links, such as `/guide`, `/blog/your-article-slug/`, and `/collections/meeting-notes/`.

Future-dated articles are excluded until a build runs on or after their publication date (UTC). There is no clock-triggered publishing job: merge or trigger a rebuild on publication day. Draft previews are local only, marked `noindex`, and have an empty sitemap/feed. Cloudflare branch previews use the production build and exclude drafts.

## Local commands

Run these inside the **website** repository:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/build.py
.venv/bin/python scripts/check_site.py
.venv/bin/python scripts/preview.py
```

Open `http://127.0.0.1:4173/blog/`. The preview serves clean URLs and a real 404 page. Stop it with Control-C. Rebuild after changing Markdown, templates, or source assets, then refresh the browser.

For unpublished content:

```sh
.venv/bin/python scripts/build.py --preview
.venv/bin/python scripts/preview.py --drafts
```

Use `--port 4174` if the preview port is occupied. Never publish `.preview/`.

Validation:

```sh
.venv/bin/python -m unittest discover -s tests -p 'test_content.py'
node --test tests/homepage.test.cjs
.venv/bin/python scripts/build.py
.venv/bin/python scripts/check_site.py
```

The GitHub `Website checks` workflow runs these checks for pushes and pull requests. The build checker validates internal links and anchors, canonical URLs, JSON-LD syntax, sitemap targets, RSS XML, and exclusion of authoring files. It does not prove search rankings, rich-result eligibility, or visual browser quality.

## Cloudflare Pages configuration

Project: `website`; GitHub: `tagalong-ai/website`; production branch: `main`.

- Build command: `python3 -m pip install -r requirements.txt && python3 scripts/build.py && python3 scripts/check_site.py`
- Build output directory: `dist`
- Root directory: leave blank (the website has its own repository)
- Build system: version 3; Python 3.12 or later

The approved native tour remains intact. This is a static build; it does not deploy app/backend code. `dist/` and `.preview/` are ignored by Git. Do not switch Cloudflare back to publishing the repository root: that would expose source Markdown and skip generated pages.

## Search and answer-engine foundations

The build emits:

- One production canonical and distinct title/description per page.
- `Organization`, `WebSite`, and `SoftwareApplication` identity on the homepage; `BlogPosting`, `CollectionPage`, `ItemList`, and breadcrumb markup where applicable.
- Visible author and publication/update dates, answer blocks, section links, and optional FAQ content from the same source as the rendered article.
- `/sitemap.xml` containing indexable canonical pages, accurate content update dates, and no drafts, admin, checkout, or error URLs.
- `/feed.xml` with published articles and `/robots.txt` advertising the sitemap.
- A real `/404.html`, noindex metadata/headers for administrative and checkout pages, and noindex headers for Cloudflare preview hostnames.
- A `www` to apex redirect. Keep existing canonical slugs stable; coordinate redirects before renaming published files.

Google states that its AI search experiences use the same core eligibility requirements as Search. There is no special AI schema or mandatory `llms.txt`. This implementation focuses on crawlable HTML and clear, attributable content, without promising rankings, citations, or FAQ rich results.

## Search-engine setup and launch checks

Google Search Console now has a **separate verified domain property for `tagalongai.com`**. Keep the Google verification TXT record in Cloudflare DNS. Google confirmed the homepage was already indexed, and a fresh crawl of the redesigned homepage was requested on September 5, 2026. Search visibility for the app name still needs measurement and content work.

Bing Webmaster Tools also has a verified `https://tagalongai.com/` property, verified with its dedicated DNS-only CNAME. The homepage, guide, and changelog were submitted on September 5, 2026. No Elisity properties were imported or modified.

Cloudflare production and preview builds have been configured with the build command and `dist` output above. The content release and sitemap submission are pending the next Git push.

After this build is deployed:

1. Check `/blog/`, a post, a collection, `/sitemap.xml`, `/robots.txt`, `/feed.xml`, and an intentionally missing URL in the browser. The missing URL must return 404, not the homepage.
2. Submit `https://tagalongai.com/sitemap.xml` in the **Tagalong** properties in Google Search Console and Bing Webmaster Tools.
3. Inspect representative new URLs. Submit them for indexing once; repeating the request does not improve queue priority.
4. Use Google's Rich Results Test for the homepage and a published article. Read the result as markup validation, not an indexing guarantee.
5. Review Search Console/Bing reports after they have collected data. Separate “indexed” from ranking or appearing for a particular query.

The verification status and submission results should be recorded in the release handoff; do not mark sitemap submission complete before the endpoint is live.

## Optional IndexNow submission

A public ownership key is stored in `content/verification/` and copied to the site root. This is the published IndexNow proof file, not an API credential. The script verifies that it is live before submitting.

```sh
# Dry run, no requests:
python3 scripts/indexnow.py https://tagalongai.com/blog/your-article-slug/
# After deployment, submit only URLs actually added, changed, or removed:
python3 scripts/indexnow.py --submit https://tagalongai.com/blog/your-article-slug/ https://tagalongai.com/collections/meeting-notes/
```

IndexNow notifies participating engines such as Bing; it does not submit to Google or guarantee indexing. The script is deliberately run after deployment so engines receive live URLs, not unfinished changes.

## Reference documentation

- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google AI features and websites](https://developers.google.com/search/docs/appearance/ai-features)
- [Google article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Bing sitemap submission](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed)
- [IndexNow protocol](https://www.indexnow.org/documentation)
- [Cloudflare Pages headers and preview indexing](https://developers.cloudflare.com/pages/configuration/headers/)
