import SwiftUI
import CoreText
import Foundation

// All initial state and services in this executable are synthetic and isolated.
enum WebsiteCapture {
    static let enabled = true
    static let defaults = UserDefaults(suiteName: "com.tagalongai.website.capture.\(ProcessInfo.processInfo.processIdentifier)")!
    static var screen = "recording"
    static var width = 1100
    static var brandImage = NSImage()
    static var fixtureFolder = URL(fileURLWithPath: "/private/tmp/tagalong-website-fixture")
    static var selection: SidebarItem? {
        switch screen {
        case "recording", "recording-start", "recording-mid", "live-ai", "live-ai-start": return nil
        case "meetings": return .library
        case "all-tasks": return .followUps
        case "search": return .search
        default: return .meeting(fixtureFolder)
        }
    }
    static var searchResults: [SearchService.SearchResult] { [SearchService.SearchResult(meetingName: "Product weekly", folderURL: fixtureFolder, date: Date(), matchedLine: "Start with one clear onboarding path. Prototype before expanding.", contextBefore: nil, contextAfter: "Review the wireframes on Friday.", speaker: "Alex", sourceFile: "transcript")] }
    static var reviewTab: MeetingReviewTab {
        switch screen {
        case "notes", "enhanced": return .notes
        case "transcript": return .transcript
        case "tasks": return .tasks
        case "visual": return .visuals
        default: return .summary
        }
    }
}
// Resolve the known local fixture synchronously. The production view still renders
// its unmodified AsyncImage success branch; no remote image request is made.
struct WebsiteCaptureImage<Content: View>: View {
    let url: URL?
    let content: (AsyncImagePhase) -> Content
    init(url: URL?, @ViewBuilder content: @escaping (AsyncImagePhase) -> Content) { self.url = url; self.content = content }
    var body: some View {
        if let url, url.isFileURL, let image = NSImage(contentsOf: url) { content(.success(Image(nsImage: image))) }
        else { content(.failure(URLError(.fileDoesNotExist))) }
    }
}
final class RejectCaptureNetwork: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { ["http", "https"].contains(request.url?.scheme ?? "") }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() { client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet)) }
    override func stopLoading() {}
}

@main struct NativeAppCapture {
    @MainActor static func main() throws {
        setenv("TAGALONG_UNIT_TESTS", "1", 1)
        URLProtocol.registerClass(RejectCaptureNetwork.self)
        _ = NSApplication.shared
        NSApplication.shared.setActivationPolicy(.regular)
        NSApplication.shared.finishLaunching()
        let repo = URL(fileURLWithPath: CommandLine.arguments[1])
        let output = URL(fileURLWithPath: CommandLine.arguments[2])
        let fixture = URL(fileURLWithPath: CommandLine.arguments[3])
        try FileManager.default.createDirectory(at: fixture, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        let meeting = fixture.appendingPathComponent("Product weekly")
        try FileManager.default.createDirectory(at: meeting, withIntermediateDirectories: true)
        WebsiteCapture.fixtureFolder = URL(fileURLWithPath: meeting.path, isDirectory: true)
        CTFontManagerRegisterFontsForURL(repo.appendingPathComponent("TagalongMenuBar/Resources/Fonts/DMSans-VariableFont.ttf") as CFURL, .process, nil)
        WebsiteCapture.brandImage = NSImage(contentsOf: repo.appendingPathComponent("TagalongMenuBar/Resources/Assets.xcassets/BrandIcon.imageset/brand-icon@3x.png"))!
        let text = """
        # Product weekly
        ## Summary
        The team agreed to simplify onboarding to one clear path.
        ## Decisions
        Prototype one onboarding path before expanding. Review wireframes on Friday.
        ## Transcript
        [00:12] Maya: I’ll sketch a simpler flow. We can review the wireframes on Friday.
        [00:24] Alex: Let’s prototype that before we expand the rest.
        [00:36] Sam: I’ll bring a review plan so we know what to look for.
        """
        let document = meeting.appendingPathComponent("Product weekly.md")
        try text.write(to: document, atomically: true, encoding: .utf8)
        for screen in ["recording-start", "recording-mid", "recording", "live-ai-start", "live-ai", "notes", "enhanced", "summary", "transcript", "tasks", "visual", "search"] {
        WebsiteCapture.screen = screen
        let manager = SessionManager()
        manager.outputDirectory = fixture
        manager.apiKeyMode = .privateLicense
        manager.userTier = .pro
        manager.meetingName = "Product weekly"
        manager.outputFilePath = document.path
        manager.elapsedSeconds = 754
        manager.audioMode = .conference
        manager.currentAudioLevel = 0.25
        manager.currentSystemAudioLevel = 0.18
        manager.lastSystemAudioAt = Date().addingTimeInterval(3600)
        manager.lastHeardSnippet = "Let’s prototype that before we expand the rest."
        manager.lastHeardTime = Date()
        manager.liveTranscriptText = "I’ll sketch a simpler flow. We can review the wireframes on Friday."
        manager.transcriptEntries = [
            TranscriptEntry(speaker: "Speaker A", text: "I’ll sketch a simpler flow. We can review the wireframes on Friday.", startTime: 12, endTime: 22),
            TranscriptEntry(speaker: "Speaker B", text: "Let’s prototype that before we expand the rest.", startTime: 24, endTime: 34),
            TranscriptEntry(speaker: "Speaker C", text: "I’ll bring a review plan so we know what to look for.", startTime: 36, endTime: 46)
        ]
        manager.speakers = ["Speaker A", "Speaker B", "Speaker C"]
        manager.speakerNames = ["Speaker A": "Maya", "Speaker B": "Alex", "Speaker C": "Sam"]
        manager.quickSummaryText = "## TL;DR\nSimplify onboarding to one clear starting path.\n\n## Decisions\nPrototype before expanding. Review the wireframes on Friday.\n\n## Next steps\n- Maya: draft wireframes.\n- Alex: build the prototype.\n- Sam: prepare the review plan."
        manager.summaryText = manager.quickSummaryText
        manager.extractedActionItems = [ActionItem(title: "Draft onboarding wireframes", assignee: "Maya", dueHint: "Friday"), ActionItem(title: "Build the first-run prototype", assignee: "Alex"), ActionItem(title: "Prepare the review plan", assignee: "Sam")]
        manager.infographicPath = repo.appendingPathComponent("website/assets/visual-notes/sketchnote.jpg").path
        let original = [NoteBlock(text: "onboarding — too many choices", timestamp: 728), NoteBlock(text: "one clear starting path", timestamp: 731), NoteBlock(text: "maya wires fri / alex prototype", timestamp: 732), NoteBlock(text: "sam review plan. test one path first.", timestamp: 734)]

            WebsiteCapture.screen = screen
            manager.appState = (screen.hasPrefix("recording") || screen.hasPrefix("live-ai")) ? .recording : .results(.diarized)
            manager.noteBlocks = original
            if screen == "recording-start" { manager.noteBlocks = Array(original.prefix(1)); manager.elapsedSeconds = 728 }
            if screen == "recording-mid" { manager.noteBlocks = Array(original.prefix(3)); manager.elapsedSeconds = 732 }
            manager.notesOriginalBlocks = nil
            manager.liveChatMessages = screen == "live-ai" ? [ChatMessage(role: .user, content: "What should I ask next?"), ChatMessage(role: .assistant, content: "Ask what would tell us the first-run experience is clearer. That will give Friday’s review a useful focus.")] : []
            if screen == "live-ai-start" { manager.liveChatMessages = [ChatMessage(role: .user, content: "What should I ask next?")] }
            if screen == "enhanced" {
                manager.notesOriginalBlocks = original
                manager.noteBlocks = [NoteBlock(kind: .heading, text: "A simpler first five minutes"), NoteBlock(kind: .bullet, text: "Start with one clear onboarding path."), NoteBlock(kind: .bullet, text: "Maya will draft wireframes for Friday. Alex will build the prototype. Sam will prepare the review plan."), NoteBlock(kind: .bullet, text: "Test that path before expanding the flow.")]
                manager.notesEnhanceChangedIDs = Set(manager.noteBlocks.map(\.id))
            }
            for width in [1100] {
                WebsiteCapture.width = width
                let root = RootView(sessionManager: manager).environment(\.colorScheme, .light).defaultAppStorage(WebsiteCapture.defaults).frame(width: CGFloat(width), height: 760)
                let host = NSHostingView(rootView: root)
                host.frame = NSRect(x: 0, y: 0, width: width, height: 760)
                let window = NSWindow(contentRect: host.frame, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
                window.title = "Tagalong"
                window.titleVisibility = .hidden
                window.titlebarAppearsTransparent = true
                window.backgroundColor = NSColor(red: 0.98, green: 0.98, blue: 0.97, alpha: 1)
                window.contentView = host
                window.makeKeyAndOrderFront(nil)
                NSApplication.shared.activate(ignoringOtherApps: true)
                window.displayIfNeeded()
                host.layoutSubtreeIfNeeded()
                RunLoop.main.run(until: Date().addingTimeInterval(1.0))
                host.layoutSubtreeIfNeeded()
                let captureView = window.contentView!.superview!
                func captureFrame() -> NSBitmapImageRep {
                guard let bitmap = captureView.bitmapImageRepForCachingDisplay(in: captureView.bounds) else { fatalError("No native bitmap") }
                captureView.cacheDisplay(in: captureView.bounds, to: bitmap)
                // AppKit's glass sidebar omits its hosted content from a parent
                // cacheDisplay. Draw that SAME native child at its measured position.
                // This changes neither the SwiftUI view nor its layout.
                NSGraphicsContext.saveGraphicsState()
                NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
                func drawGlassContent(_ view: NSView) {
                    let typeName = String(describing: type(of: view))
                    if typeName.contains("NSHostingView") && typeName.contains("SidebarStyleContext"),
                       let child = view.bitmapImageRepForCachingDisplay(in: view.bounds) {
                        view.cacheDisplay(in: view.bounds, to: child)
                        let target = captureView.convert(view.bounds, from: view)
                        // The detached glass backdrop has no desktop to sample in an
                        // isolated renderer. Use this native window's own background.
                        var parent = view.superview
                        while let current = parent, !String(describing: type(of: current)).contains("NSSplitViewItemViewWrapper") { parent = current.superview }
                        if let parent {
                            window.backgroundColor.setFill()
                            captureView.convert(parent.bounds, from: parent).fill()
                        }
                        child.draw(in: target)
                        return
                    }
                    for sub in view.subviews { drawGlassContent(sub) }
                }
                drawGlassContent(captureView)
                NSGraphicsContext.restoreGraphicsState()
                    return bitmap
                }
                let bitmap = captureFrame()
                try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent("app-\(screen)-\(width).png"))
                if ["recording", "live-ai", "enhanced"].contains(screen) {
                    let framesFolder = fixture.deletingLastPathComponent().appendingPathComponent("motion-frames/" + screen)
                    try FileManager.default.createDirectory(at: framesFolder, withIntermediateDirectories: true)
                    let enhanced = manager.noteBlocks
                    let answer = "Ask what would tell us the first-run experience is clearer. That will give Friday’s review a useful focus."
                    var aiAnswer = ChatMessage(role: .assistant, content: "")
                    let aiQuestion = ChatMessage(role: .user, content: "What should I ask next?")
                    for frame in 0..<192 {
                        let t = Double(frame) / 24.0
                        if screen == "recording" || screen == "live-ai" {
                            manager.currentAudioLevel = Float(0.008 + 0.27 * pow(abs(sin(t * 4.7) * cos(t * 1.3)), 2))
                            manager.currentSystemAudioLevel = Float(0.012 + 0.30 * pow(abs(cos(t * 3.1) * sin(t * 1.7 + 1)), 2))
                            manager.elapsedSeconds = 748 + Int(t)
                            manager.lastSystemAudioAt = Date()
                        }
                        if screen == "recording" {
                            var remaining = Int(max(0, t - 0.3) * 24)
                            manager.noteBlocks = original.compactMap { block in
                                guard remaining > 0 else { return nil }
                                var partial = block
                                partial.text = String(block.text.prefix(remaining))
                                remaining -= block.text.count + 6
                                return partial
                            }
                            manager.notesDocRevision += 1
                            let snippet = "I’ll sketch a simpler flow. We can review the wireframes on Friday."
                            manager.lastHeardSnippet = String(snippet.prefix(Int(t * 16) + 1))
                        } else if screen == "live-ai" {
                            aiAnswer.content = String(answer.prefix(Int(max(0, t - 1.4) * 30)))
                            manager.liveChatMessages = t < 1.4 ? [aiQuestion] : [aiQuestion, aiAnswer]
                            manager.isLiveChatStreaming = t >= 0.5 && t < 5.0
                        } else if screen == "enhanced" {
                            if frame == 0 {
                                manager.noteBlocks = original
                                manager.notesOriginalBlocks = nil
                                manager.notesEnhanceChangedIDs = []
                                manager.notesDocRevision += 1
                            }
                            if frame == 30 { manager.isEnhancingNotes = true }
                            if frame == 78 {
                                manager.isEnhancingNotes = false
                                manager.notesOriginalBlocks = original
                                manager.noteBlocks = enhanced
                                manager.notesEnhanceChangedIDs = Set(enhanced.map(\.id))
                                manager.notesDocRevision += 1
                                manager.replayNotesReveal()
                            }
                        }
                        RunLoop.main.run(until: Date().addingTimeInterval(1.0 / 24.0))
                        host.layoutSubtreeIfNeeded()
                        let frameBitmap = captureFrame()
                        try frameBitmap.representation(using: .png, properties: [:])!.write(to: framesFolder.appendingPathComponent(String(format: "%04d.png", frame)))
                    }
                    print("Animated native sequence: \(screen), 192 frames")
                }
                window.orderOut(nil)
                window.contentView = nil
                print("Captured \(screen) at \(width)")
            }
        }
    }
}
