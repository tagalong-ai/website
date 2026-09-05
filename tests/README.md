# Tagalong website preview — September 5, 2026

## Preview

This is the existing static site. No deployment or app/backend changes were made.

```sh
python3 '/Users/charlie/Library/Mobile Documents/com~apple~CloudDocs/Documents/GitHub/tagalong/website/tests/preview-server.py'
```

Open http://127.0.0.1:4173/ . The server maps `/guide`, `/privacy`, `/terms`, and `/changelog` to the existing HTML files. Stop with Control-C.

**Browser review is pending.** This session cannot bind a localhost port (`PermissionError: Operation not permitted`). Browser policy also rejected direct `file://` access. The user has been asked to start the server; the last localhost check still returned no response. Desktop/mobile browser screenshots, real interactions, console errors, zoom, and accessibility inspection have not been completed. Unit tests are not a substitute for these checks. Nothing should be published yet.

## Latest correction: native app fidelity

The invented web app layout has been removed. The tour now shows native SwiftUI/AppKit views rendered from the current repository's v3.4 source, with the actual app asset-catalog logo and font. See `native-capture-provenance.json` for the precise version, build, and hashes. This is a release-candidate interface; the download continues to point to the verified public release.

Eight chapters cover recording, live AI, enhanced notes, summary, speakers/transcript, tasks, visual notes, and search. Recording, live AI and enhancement now use silent 24 fps H.264 motion clips rendered from the native views. Microphone and meeting-audio meters fluctuate independently, the live transcript advances, AI replies stream, and notes move from the original through the enhancing state into the native green reveal. The other chapters use completed native captures.

The chapter controls are prominent and ABOVE the preview. Clicking a chapter preserves automatic playback; Pause explicitly stops it. Arrow keys and Home/End pause for keyboard navigation. Replay restarts the first clip. Reduced motion uses complete static captures, and offscreen/background playback pauses. Buffering, failed media and browser autoplay rejection have explicit fallbacks. The enlarged viewer plays the same native motion clips with media controls.

The desktop preview is capped at **880px**, down from 1100px, so the encoded clips display below their native dimensions. Desktop playback controls share the heading row to reduce height. Mobile uses four columns of chapter buttons and the same scaled Mac app view, without inventing a mobile app interface. With JavaScript disabled, every completed chapter remains visible.

### Reproducing native captures

```sh
sh tests/capture-native-app.sh
```

Requires the local Swift compiler and FFmpeg. This reads production Swift files into a unique temporary build directory and compiles a separate screenshot executable. It never edits the app, uses its credentials, records audio, calls an AI provider, or opens private meeting files. The fixture is a fictional Product weekly conversation involving Maya, Alex, and Sam. API/network requests are rejected; defaults and test credentials are isolated; calendar, speech authorization, and device discovery are disabled. Only the fixture output folder is used.

Temporary-copy substitutions provide initial navigation, note-enhancement state, a local visual-image success state, synthetic search results, and the actual logo outside an app bundle. The native controls and view layouts remain in the production source. macOS glass omits its sidebar child from parent `cacheDisplay`, so that same hosted native child is drawn into the capture at its measured bounds. The isolated glass backdrop uses the native window background because there is no desktop behind it. No HTML app controls or AI-generated app UI are used.

Visual-note artwork is a separately generated synthetic website illustration loaded into the native view. It is labeled illustrative and is not evidence of a real meeting or guaranteed app output.

## Verification

- `node --check homepage.js` passes.
- `node --test tests/homepage.test.cjs`: 15 passing tests for native video playback, click-to-jump with continued cycling, pause/resume, keyboard navigation, buffering, failed media, autoplay rejection, reduced motion, background/offscreen suspension, above-preview controls, static fallbacks, assets, brand isolation and pricing.
- Three motion files were verified as H.264, 1100×812, 24 fps, 192 frames / 8 seconds each, with no audio track. Frame comparisons confirm moving meters, streaming AI and changing enhancement states. The user confirmed that the animations look good and requested the subsequent scale reduction.
- Native capture images are reviewed directly for the actual current navigation, logo, typography, notes editor, meeting tabs, transcript, tasks, visual and search controls. These are asset reviews, not website browser screenshots.
- Original Tagalong green/gold branding and logos are restored. Free remains $0 with five meetings/month, alongside Pro at $9.99/month and Private at $199 once.
- Support contact is `support@tagalongai.com`; no personal Gmail address is published.
- Public GitHub latest release was checked in Chrome: v3.3.2, July 28, 2026, with DMG/ZIP assets. The download redirects correctly to GitHub's asset host; Chrome returned `ERR_BLOCKED_BY_CLIENT` there, so completed binary download was not verified.

Browser checks to finish once the preview server is running:

- 1440×1000 and 1024×900 desktop; 390×844 and 320×700 mobile, with no page overflow.
- Every tour chapter, automatic frame sequence, pause/replay, keyboard focus, and enlarged-image dialog.
- Gallery and mobile menu: open/close, Escape, focus return.
- Pricing, download, support, guide, privacy, terms, changelog, and anchor navigation.
- Reduced motion, JavaScript disabled, 200% zoom, console/resource errors.

## Claim evidence and release boundary

Read-only implementation review used these repository sources:

| Website claim | Source |
| --- | --- |
| Free: 5 meetings/month, microphone recording, basic summary, Markdown export, speaker editing | `TagalongMenuBar/Models/FeatureGate.swift` in shipping source commit `1224c32`, current feature model, and product-owner correction |
| Local output folder; activation inconsistency requiring app-session investigation | `TagalongMenuBar/Models/AppState.swift` (`isReadyToRecord`, `outputDirectory`) |
| $9.99/month subscription; $199 private license | `TagalongMenuBar/Views/UpgradePromptView.swift`; existing terms and app configuration |
| macOS 15+, universal Apple silicon/Intel build | `TagalongMenuBar.xcodeproj/project.pbxproj`; `build.sh`; `CLAUDE.md` distribution instructions |
| On-device live speech with cloud fallback; cloud processing after recording | `Services/LiveTranscriptionService.swift`, `Models/AppState.swift`, `Services/BackgroundProcessingService.swift` |
| Editable identified speakers | `Views/SpeakerEditView.swift` |
| Live/post AI, summary and personal-note enhancement | `Services/ChatService.swift`, `Services/QuickSummaryService.swift`, `Services/SummaryService.swift`, `Services/NotesEnhanceService.swift` |
| Local cross-meeting search | `Services/SearchService.swift` |
| Visual-note generation and style/aspect options | `Services/InfographicService.swift` |
| Explicit one-way task creation, with Asana/monday.com still in QA | `Services/TaskDestinationService.swift`, `Views/Meeting/ActionItemsSection.swift`, `release-plans/3.4.0-release-notes.md` |
| Claude Desktop extension and ChatGPT private tunnel are candidates, selected documents only | `connectors/tagalong/README.md` |
| Managed proxy versus direct provider requests | `Services/SubscriptionRouter.swift`, `Services/PrivateLicenseRouter.swift` |

Service paths in this table are under `TagalongMenuBar/`. Release notes explicitly identify v3.4 as unpublished. The current public download stays on the official `tagalong-ai/releases` latest-DMG URL. No v3.4 download or universally one-click ChatGPT connection is advertised.

Before production review, reconfirm the latest release and checkout totals because another session is actively changing the product. Asana/monday.com and Claude/ChatGPT must retain QA labels until the release gates actually pass. The expanded in-app visual gallery is also labeled separately from already-available visual-note generation.

## Changed files

- `index.html`, `homepage.css`, `product-demo.css`, `homepage.js`: branded homepage, native animated tour, gallery, feature and privacy explanations, Free/Pro/Private pricing, responsive navigation and controls.
- `guide.html`, `privacy.html`, `terms.html`, `changelog.html`: targeted plan, provider/data-flow, support and release-availability corrections; pre-existing edits preserved.
- `assets/app-captures/`: native synthetic app captures and three optimized MP4 motion clips used by the tour.
- `assets/fonts/`: existing repository DM Sans font and license.
- `assets/visual-notes/`: three synthetic visual-note illustrations.
- `tests/homepage.test.cjs`, `tests/preview-server.py`, `tests/README.md`: behavior checks, local preview and review notes.
- `tests/NativeAppCapture.swift`, `tests/prepare-native-capture.py`, `tests/capture-native-app.sh`, `tests/native-capture-provenance.json`: isolated native renderer and source provenance.

The pre-edit state, including existing uncommitted and untracked website work, is preserved in `/private/tmp/tagalong-website-before-redesign/`. Shared `styles.css`, app/backend source and project/deployment configuration have not been edited by this session.

## Remaining release blockers

Browser QA and completed download verification remain outstanding. Reconfirm current release and checkout totals before publication because the other session is changing the product. Keep Asana/monday.com, expanded visual-library and connector QA labels until their release gates pass. The connector README requires real client tests; ChatGPT is not universally one-click.

The app's `isReadyToRecord` activation condition conflicts with its Free feature model and the owner's confirmed Free tier. The app session must verify/fix the new-user Free activation path. The website preserves Free; no retirement was authorized.
