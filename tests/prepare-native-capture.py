"""Copy the current app to an isolated, inert screenshot harness.

Production files are read only. UI layouts are retained; only initial selection,
fixture state, storage and service side effects are changed in temporary copies.
"""
from pathlib import Path
import hashlib, json, sys, re
from datetime import datetime, timezone
repo = Path(__file__).resolve().parents[2]
work = Path(sys.argv[1])
source = work / 'source'
source.mkdir(parents=True, exist_ok=True)
manifest = {}
for f in (repo / 'TagalongMenuBar').rglob('*.swift'):
    if f.name == 'TagalongMenuBarApp.swift':
        continue
    name = f.relative_to(repo / 'TagalongMenuBar')
    content = f.read_text()
    manifest[str(name)] = hashlib.sha256(f.read_bytes()).hexdigest()
    content = content.replace('UserDefaults.standard', 'WebsiteCapture.defaults')
    content = content.replace('Image("BrandIcon")', 'Image(nsImage: WebsiteCapture.brandImage)')
    if f.name == 'CalendarService.swift':
        content = content.replace('let status = EKEventStore.authorizationStatus(for: .event)', 'if WebsiteCapture.enabled { return }\n        let status = EKEventStore.authorizationStatus(for: .event)', 1)
    elif f.name == 'AudioDeviceManager.swift':
        content = content.replace('        refreshDevices()\n        installDeviceChangeListener()', '''        if WebsiteCapture.enabled {
            availableInputDevices = [AudioInputDevice(id: 0, name: "Mac microphone", uid: "synthetic-microphone", isDefault: true)]
            selectedDeviceUID = "synthetic-microphone"
            return
        }
        refreshDevices()
        installDeviceChangeListener()''', 1)
    elif f.name == 'LiveTranscriptionService.swift':
        content = content.replace('static func requestAuthorization() async -> Bool {', 'static func requestAuthorization() async -> Bool {\n        if WebsiteCapture.enabled { return false }', 1)
    elif f.name == 'RootView.swift':
        content = content.replace('@State private var columnVisibility: NavigationSplitViewVisibility = .all', '@State private var columnVisibility: NavigationSplitViewVisibility = WebsiteCapture.width < 600 ? .detailOnly : .all')
        content = content.replace('@State private var selectedSidebarItem: SidebarItem? = .home', '@State private var selectedSidebarItem: SidebarItem? = WebsiteCapture.selection')
        content = content.replace('initialTab: taskSourceFolder == folder ? .tasks : .summary', 'initialTab: WebsiteCapture.reviewTab')
    elif f.name == 'MeetingDetailView.swift':
        content = content.replace('var initialTab: MeetingReviewTab = .summary', 'var initialTab: MeetingReviewTab = WebsiteCapture.reviewTab')
    elif f.name == 'InfographicSection.swift':
        content = content.replace('AsyncImage(url: url)', 'WebsiteCaptureImage(url: url)')
    elif f.name == 'SearchView.swift':
        content = content.replace('@State private var searchText: String = ""', '@State private var searchText: String = "onboarding"')
        content = content.replace('@State private var results: [SearchService.SearchResult] = []', '@State private var results: [SearchService.SearchResult] = WebsiteCapture.searchResults')
        content = content.replace('@State private var hasSearched: Bool = false', '@State private var hasSearched: Bool = true')
    elif f.name == 'KeychainService.swift':
        content = content.replace('static var credentialsNeedingAttention: [KeyType] {', 'static var credentialsNeedingAttention: [KeyType] {\n        if WebsiteCapture.enabled { return [] }')
    elif f.name == 'AppState.swift':
        content = content.replace('@Published private(set) var notesDocRevision', '@Published var notesDocRevision')
        content = content.replace('@Published private(set) var notesOriginalBlocks', '@Published var notesOriginalBlocks')
        content = content.replace('@Published private(set) var notesEnhanceChangedIDs', '@Published var notesEnhanceChangedIDs')
    # Do not run a capture against changed service code unless fixture isolation
    # still applies. A failed substitution must stop before the executable runs.
    required = {
        'CalendarService.swift': ['if WebsiteCapture.enabled { return }'],
        'AudioDeviceManager.swift': ['synthetic-microphone'],
        'LiveTranscriptionService.swift': ['if WebsiteCapture.enabled { return false }'],
        'KeychainService.swift': ['TAGALONG_UNIT_TESTS', 'com.tagalongai.tagalong.tests.'],
        'AppState.swift': ['TAGALONG_UNIT_TESTS'],
        'SubscriptionAuthService.swift': ['TAGALONG_UNIT_TESTS'],
        'RootView.swift': ['WebsiteCapture.selection', 'WebsiteCapture.reviewTab'],
    }
    for marker in required.get(f.name, []):
        if marker not in content:
            raise RuntimeError(f'Capture fixture no longer matches {f.name}; review the source before rendering.')
    target = source / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)
project = (repo / 'TagalongMenuBar.xcodeproj/project.pbxproj').read_text()
metadata = {
    'version': re.search(r'MARKETING_VERSION = ([^;]+)', project).group(1),
    'build': re.search(r'CURRENT_PROJECT_VERSION = ([^;]+)', project).group(1),
    'preparedUTC': datetime.now(timezone.utc).isoformat(),
    'content': 'Synthetic fixtures only; native SwiftUI/AppKit view captures.',
    'sourceHashes': manifest,
}
(work / 'source-hashes.json').write_text(json.dumps(metadata, indent=2))
print(f'Prepared {len(manifest)} read-only source copies; production files untouched.')
