import contextlib
from datetime import date
import importlib.util
import io
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
spec_check = importlib.util.spec_from_file_location('checker', ROOT / 'scripts/check_site.py')
checker = importlib.util.module_from_spec(spec_check)
spec_check.loader.exec_module(checker)

class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for name in builder.STATIC + builder.STYLES:
            shutil.copy2(ROOT / name, self.root / name)
        shutil.copytree(ROOT / 'content', self.root / 'content')
        # Symlink fixture assets to keep tests fast; build copies public assets.
        (self.root / 'assets').symlink_to(ROOT / 'assets')
        self.post = self.root / 'content/posts/meeting-data-on-your-mac.md'
    def tearDown(self):
        self.temp.cleanup()
    def build(self, **kwargs):
        with contextlib.redirect_stdout(io.StringIO()):
            return builder.build(root=self.root, today=date(2026, 9, 5), **kwargs)
    def edit(self, old, new):
        value = self.post.read_text()
        self.assertIn(old, value)
        self.post.write_text(value.replace(old, new))
    def test_complete_site_links_metadata_and_public_output(self):
        out = self.build()
        with contextlib.redirect_stdout(io.StringIO()):
            checker.check(out)
        home = (out / 'index.html').read_text()
        self.assertIn('AI Meeting Notes &amp; Transcription for Mac', home)
        self.assertIn('/blog/', home)
        self.assertIn('/collections/', home)
        self.assertNotIn('noindex', home)
        self.assertIn('noindex', (out / 'admin.html').read_text())
    def test_drafts_absent_from_pages_sitemap_feed_and_collection(self):
        self.edit('draft: false', 'draft: true')
        out = self.build()
        self.assertFalse((out / 'blog/meeting-data-on-your-mac').exists())
        for path in ['sitemap.xml', 'feed.xml']:
            self.assertNotIn('/blog/meeting-data-on-your-mac/', (out / path).read_text())
        collection = checker.Document((out / 'collections/meeting-notes/index.html').read_text())
        schema = next(s for s in collection.structured[0]['@graph'] if s['@type'] == 'CollectionPage')
        self.assertNotIn('meeting-data-on-your-mac', str(schema.get('mainEntity', {})))
        self.assertNotIn('meeting-data-on-your-mac', (out / 'blog/index.html').read_text())
        for post in self.post.parent.glob('*.md'):
            post.write_text(post.read_text().replace('draft: false', 'draft: true'))
        out = self.build()
        self.assertIn('noindex', (out / 'blog/index.html').read_text())
    def test_preview_includes_drafts_but_excludes_search_feeds(self):
        self.edit('draft: false', 'draft: true')
        out = self.build(preview=True)
        self.assertEqual(out.name, '.preview')
        html = (out / 'blog/meeting-data-on-your-mac/index.html').read_text()
        self.assertIn('Draft preview', html)
        self.assertIn('noindex, nofollow', html)
        self.assertNotIn('/blog/meeting-data-on-your-mac/', (out / 'sitemap.xml').read_text())
        self.assertEqual((out / 'robots.txt').read_text(), 'User-agent: *\nDisallow: /\n')
    def test_scheduled_article_waits_until_publication_date(self):
        self.edit('2026-09-05', '2026-10-01')
        out = self.build()
        self.assertFalse((out / 'blog/meeting-data-on-your-mac').exists())
    def test_unpublishing_removes_stale_output(self):
        out = self.build()
        self.assertTrue((out / 'blog/meeting-data-on-your-mac/index.html').is_file())
        self.edit('draft: false', 'draft: true')
        self.build()
        self.assertFalse((out / 'blog/meeting-data-on-your-mac').exists())
    def test_invalid_collection_preserves_last_good_build(self):
        out = self.build()
        old = (out / 'sitemap.xml').read_bytes()
        self.edit('  - meeting-notes', '  - nonexistent')
        with self.assertRaisesRegex(builder.ContentError, 'unknown collection'):
            self.build()
        self.assertEqual((out / 'sitemap.xml').read_bytes(), old)
    def test_unknown_author_and_duplicate_metadata_fail(self):
        self.edit('author: tagalong', 'author: invented')
        with self.assertRaisesRegex(builder.ContentError, 'unknown author'):
            self.build()
        self.edit('author: invented', 'author: tagalong\nauthor: tagalong')
        with self.assertRaisesRegex(builder.ContentError, 'Duplicate'):
            self.build()
    def test_markdown_is_safe_and_duplicate_headings_get_unique_ids(self):
        rendered, headings = builder.markdown('## Example\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n## Example\n')
        self.assertNotIn('<script>', rendered)
        self.assertNotIn('href="javascript:', rendered)
        self.assertEqual([h[0] for h in headings], ['section-example', 'section-example-2'])
    def test_date_order_and_missing_draft_flag_fail(self):
        self.edit('updated: 2026-09-05', 'updated: 2026-09-04')
        with self.assertRaisesRegex(builder.ContentError, 'before publication'):
            self.build()
        self.edit('updated: 2026-09-04', 'updated: 2026-09-05')
        self.edit('draft: false\n', '')
        with self.assertRaisesRegex(builder.ContentError, 'explicitly set draft'):
            self.build()
    def test_pagination_has_distinct_canonicals_and_crawlable_links(self):
        import json
        config = self.root / 'content/site.json'
        site = json.loads(config.read_text()); site['postsPerPage'] = 1
        config.write_text(json.dumps(site))
        (self.post.parent / 'second-article.md').write_text(self.post.read_text().replace('Your meeting files on your Mac:', 'A second article:').replace('Local Meeting Notes vs Cloud AI:', 'Second Article:').replace('See what Tagalong stores', 'Another guide to what Tagalong stores'))
        out = self.build()
        self.assertIn('href="https://tagalongai.com/blog/page/2/"', (out / 'blog/page/2/index.html').read_text())
        self.assertIn('href="/blog/page/2/"', (out / 'blog/index.html').read_text())
        with contextlib.redirect_stdout(io.StringIO()):
            checker.check(out)
    def test_output_cannot_replace_source(self):
        with self.assertRaisesRegex(builder.ContentError, 'Output must'):
            self.build(out=self.root / 'content')
    def test_unsafe_resource_urls_and_extra_h1_fail(self):
        with self.assertRaises(builder.ContentError):
            builder.safe_url('javascript:alert(1)')
        with self.assertRaises(builder.ContentError):
            builder.safe_url('//example.com')
        with self.assertRaises(builder.ContentError):
            builder.markdown('# Duplicate title\n')
    def test_schemas_match_visible_author_dates_and_answer(self):
        out = self.build()
        html = (out / 'blog/meeting-data-on-your-mac/index.html').read_text()
        doc = checker.Document(html)
        posting = next(s for s in doc.structured[0]['@graph'] if s['@type'] == 'BlogPosting')
        self.assertEqual(posting['author']['name'], 'Tagalong')
        self.assertEqual(posting['datePublished'], '2026-09-05')
        self.assertIn('AT A GLANCE', html)
        self.assertIn('Questions &amp; answers', html)
        self.assertNotIn('aggregateRating', html)

    def test_primary_navigation_reaches_guides_and_blog_across_site(self):
        out = self.build()
        for name in ['index.html', 'guide.html', 'privacy.html', 'terms.html', 'changelog.html', 'blog/index.html', 'collections/index.html']:
            nav = (out / name).read_text().split('<nav', 1)[1].split('</nav>', 1)[0]
            self.assertEqual(nav.count('href="/collections/"'), 1, name)
            self.assertEqual(nav.count('href="/blog/"'), 1, name)
    def test_pillar_and_cluster_links_are_bidirectional_with_matching_schema(self):
        out = self.build()
        pillar_url = '/collections/meeting-notes/'
        pillar = (out / 'collections/meeting-notes/index.html').read_text()
        hub = (out / 'collections/index.html').read_text()
        children = ['/collections/granola-alternatives/', '/collections/visual-meeting-notes/', '/blog/meeting-data-on-your-mac/', '/blog/meeting-action-items-apple-reminders/']
        for url in children:
            self.assertIn(f'href="{url}"', pillar)
            self.assertIn(f'href="{url}"', hub)
            child = (out / url.strip('/') / 'index.html').read_text()
            self.assertIn(f'Part of <a href="{pillar_url}"', child)
            schema = next(s for s in checker.Document(child).structured[0]['@graph'] if s['@type'] in ('BlogPosting', 'CollectionPage'))
            self.assertEqual(schema['isPartOf']['@id'], 'https://tagalongai.com' + pillar_url + '#content')
    def test_missing_or_cyclic_pillar_preserves_previous_build(self):
        out = self.build()
        old = (out / 'sitemap.xml').read_bytes()
        self.edit('pillar: meeting-notes', 'pillar: nonexistent')
        with self.assertRaisesRegex(builder.ContentError, 'published root collection'):
            self.build()
        self.assertEqual((out / 'sitemap.xml').read_bytes(), old)
        self.edit('pillar: nonexistent', 'pillar: meeting-notes')
        root = self.root / 'content/collections/meeting-notes.md'
        root.write_text(root.read_text().replace('draft: false', 'draft: false\npillar: granola-alternatives'))
        with self.assertRaisesRegex(builder.ContentError, 'published root collection'):
            self.build()

    def test_editorial_images_have_intrinsic_dimensions_and_safe_paths(self):
        rendered, _ = builder.markdown('![Synthetic visual](/assets/visual-notes/sketchnote.jpg)')
        self.assertIn('width="1536"', rendered)
        self.assertIn('height="1024"', rendered)
        self.assertIn('loading="lazy"', rendered)
        self.assertEqual(builder.image_dimensions('/assets/../../content/site.json'), {})
        self.assertEqual(builder.image_dimensions('https://example.com/remote.jpg'), {})
    def test_checker_rejects_duplicate_metadata_and_heading_ids(self):
        out = self.build()
        page = out / 'blog/meeting-data-on-your-mac/index.html'
        html = page.read_text().replace('</head>', '<meta name="description" content="duplicate"></head>')
        html = html.replace('</main>', '<p id="article-summary">Duplicate</p></main>')
        page.write_text(html)
        with self.assertRaisesRegex(ValueError, 'nonempty description|duplicate IDs'):
            checker.check(out)

    def test_collection_cover_can_be_omitted_without_losing_social_image(self):
        out = self.build()
        html = (out / 'collections/visual-meeting-notes/index.html').read_text()
        self.assertNotIn('class="content-cover"', html)
        self.assertIn('property="og:image"', html)
        self.assertIn('id="article-summary"', html)
        self.assertIn('By <a href="/">Tagalong</a>', html)

if __name__ == '__main__':
    unittest.main()
