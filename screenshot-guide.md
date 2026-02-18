# Tagalong Guide — Screenshot Capture List

24 screenshots needed. All app screenshots are taken of the Tagalong popover (420×580 window).
Save each file with the **exact filename** listed, then drop the folder into the chat.

---

## Format key

| Symbol | Meaning |
|--------|---------|
| 📱 Portrait | Tagalong popover window — resize to ~420×580, use `⌘+⇧+4` and click-drag |
| 🖥 Landscape | Full-screen or 16:9 crop — use `⌘+⇧+4` drag to capture |

---

## 1 · Getting Started

### `getting-started-onboarding.png` 📱 Portrait
**What to show:** The first-run onboarding screen asking you to choose a licensing mode (Subscription vs Private License).
**Steps:**
1. Delete `~/Library/Preferences/com.tagalongai.tagalong.plist` (resets onboarding)
2. Quit and relaunch Tagalong
3. The onboarding/license picker view should appear
4. Screenshot the popover

---

### `getting-started-permissions.png` 🖥 Landscape
**What to show:** macOS privacy permission dialog ("Tagalong would like to access the microphone").
**Steps:**
1. Reset microphone permission: `tccutil reset Microphone com.tagalongai.tagalong`
2. Relaunch Tagalong — the system permission sheet should appear
3. Screenshot the dialog (full screen or cropped around the dialog)
4. Click Allow to restore permission afterward

---

### `getting-started-settings-subscription.png` 📱 Portrait
**What to show:** Settings view with "Subscription" mode selected (showing Activate button or active status).
**Steps:**
1. Click the Tagalong menu bar icon → gear icon (Settings)
2. Select "Subscription" under Licensing Mode
3. Screenshot the full Settings view

---

### `getting-started-settings-private.png` 📱 Portrait
**What to show:** Settings view with "Private License" selected and API keys filled in.
**Steps:**
1. Click gear icon → Settings
2. Select "Private License" under Licensing Mode
3. Ensure OpenAI and AssemblyAI keys are entered (they can be real or placeholder)
4. Screenshot the full Settings view

---

### `getting-started-idle.png` 📱 Portrait
**What to show:** The main idle screen, ready to start recording. Meeting name field empty or with a name.
**Steps:**
1. Click the menu bar mic icon — popover opens
2. Ensure you're on the idle/home screen (not recording, not in results)
3. Screenshot the popover

---

## 2 · Recording a Meeting

### `recording-start-screen.png` 📱 Portrait
**What to show:** Idle screen showing the mode toggle (Microphone / Conference Mode), meeting name field, and Start Recording button.
**Steps:**
1. Open Tagalong popover from menu bar
2. Ensure you're on the idle screen
3. Screenshot — same as `getting-started-idle.png` but make sure the mode selector is visible
*(This can be the same screenshot as `getting-started-idle.png` if the UI is the same)*

---

### `recording-active.png` 📱 Portrait
**What to show:** Active recording state — pulsing red dot, timer counting up, animated waveform, "Last Heard" card showing a transcript snippet, word count.
**Steps:**
1. Start a recording (click menu bar icon → Start Recording or `⌘+⇧+R`)
2. Speak a sentence or two so "Last Heard" shows real text
3. Screenshot while recording is live

---

### `recording-notes.png` 📱 Portrait
**What to show:** Recording screen with the notes input area visible — text field and at least one saved timestamped note.
**Steps:**
1. Start a recording
2. Type a note (e.g., "Q3 budget confirmed at $50k") in the notes field and press `⌘+Return`
3. A timestamped note should appear in the list above
4. Screenshot with both the input field and the saved note visible

---

### `recording-chat.png` 📱 Portrait — PRO
**What to show:** Recording screen with the "Ask AI" panel expanded, showing a question and a streaming answer.
**Steps:**
1. Start a recording with a Pro license active
2. Scroll down to the "Ask AI" section or tap to expand it
3. Type "What has been discussed so far?" and send
4. Screenshot while the AI is responding (or after response completes)

---

### `recording-calendar-card.png` 📱 Portrait — PRO
**What to show:** Idle screen showing a calendar card for an upcoming meeting (e.g., "Team Standup in 15 min").
**Steps:**
1. Ensure Calendar access is granted (System Settings → Privacy → Calendars)
2. Have an upcoming calendar event in the next 24 hours
3. Open Tagalong — idle screen should show a meeting card
4. Screenshot

---

## 3 · Your Results

### `results-transcript.png` 📱 Portrait
**What to show:** Results view, Transcript tab — speaker-labeled entries with colored pills and timestamps.
**Steps:**
1. Complete a recording (or open a previous session)
2. In Results view, click the Transcript tab
3. Ensure at least 2 different speakers are labeled (Speaker A, Speaker B)
4. Screenshot

---

### `results-speaker-edit.png` 📱 Portrait
**What to show:** Speaker name editing — the edit field open next to a speaker label, replacing "Speaker A" with a real name.
**Steps:**
1. In Results → Transcript tab
2. Click the pencil/edit icon next to a speaker label
3. The name field should be open/editable
4. Screenshot while editing

---

### `results-summary.png` 📱 Portrait
**What to show:** Results view, Summary tab — AI-generated summary with structured sections (decisions, action items, takeaways).
**Steps:**
1. Complete a recording — summary generates automatically after processing
2. Click the Summary tab in Results
3. Screenshot showing the formatted summary text

---

### `results-recipes.png` 📱 Portrait — PRO
**What to show:** Summary recipe picker — showing the 4 built-in recipes (Standard Summary, Executive Brief, Action Items Only, Detailed Notes).
**Steps:**
1. In Results → Summary tab (Pro license required)
2. Click the recipe/template picker dropdown or button
3. Screenshot showing the recipe list open

---

### `results-infographic.png` 📱 Portrait — PRO
**What to show:** Results view, Infographic tab — showing the generated 4K infographic image (or a placeholder with Regenerate button).
**Steps:**
1. In Results → Infographic tab (Pro license required)
2. If no infographic generated yet, click Generate
3. Screenshot once the image is displayed

---

### `results-infographic-sample.png` 🖥 Landscape — PRO
**What to show:** The generated infographic at full resolution — open the saved `_infographic.jpg` file in Preview and screenshot it.
**Steps:**
1. After generating an infographic, find the file at `~/Documents/Tagalong/{meeting-name}/{meeting-name}_infographic.jpg`
2. Open in Preview
3. Fit the window to the image
4. Screenshot (16:9 crop preferred)

---

### `results-notes.png` 📱 Portrait
**What to show:** Results view, Notes tab — showing timestamped notes taken during the recording.
**Steps:**
1. Complete a recording where you added at least 2 notes
2. In Results → Notes tab
3. Screenshot showing the timestamped note list

---

### `results-chat.png` 📱 Portrait — PRO
**What to show:** Results view, AI Chat tab — showing a question asked and the AI's answer about the meeting.
**Steps:**
1. In Results → Chat tab (Pro license required)
2. Type "What were the key decisions made?" and send
3. Screenshot after the AI responds

---

## 4 · Managing Sessions

### `sessions-history.png` 📱 Portrait — PRO
**What to show:** Session History view — a list of past meetings sorted by date.
**Steps:**
1. Have at least 2–3 previous recordings in `~/Documents/Tagalong/`
2. Click "Session History" on the idle screen (Pro required)
3. Screenshot the list view

---

### `sessions-search.png` 📱 Portrait — PRO
**What to show:** Cross-Meeting Search — search results showing matched lines from multiple sessions.
**Steps:**
1. Click "Search" on the idle screen (Pro required)
2. Type a keyword that appears in past transcripts (e.g., "budget" or a person's name)
3. Screenshot showing at least 2–3 results with highlighted matches

---

### `sessions-import.png` 📱 Portrait — PRO
**What to show:** The Processing view while an imported file is being diarized, showing the progress steps.
**Steps:**
1. Click "Import File" on the idle screen (Pro required)
2. Select an audio file (mp3, wav, m4a)
3. Screenshot the processing/progress view that appears

---

## 5 · Settings

### `settings-main.png` 📱 Portrait
**What to show:** The full Settings view — showing all sections (Licensing Mode, Summary Model, Custom Vocabulary, Infographic, Integrations, Launch at Login).
**Steps:**
1. Click the gear icon in the Tagalong popover
2. Scroll to show the most settings possible
3. Screenshot

---

### `settings-private-license.png` 📱 Portrait
**What to show:** Settings with Private License mode selected and API key fields filled in.
**Steps:**
1. Settings → Licensing Mode → Private License
2. Ensure OpenAI and AssemblyAI key fields show entered keys (masked with dots is fine)
3. Screenshot
*(Can reuse `getting-started-settings-private.png` if identical)*

---

### `settings-integrations.png` 📱 Portrait — PRO
**What to show:** Settings view scrolled to the Integrations section — showing Slack webhook URL field and Notion API key/database ID fields.
**Steps:**
1. Settings → scroll down to Integrations section
2. The Slack and Notion fields should be visible (filled or empty)
3. Screenshot

---

## Delivery instructions

1. Capture each screenshot at the highest resolution your display allows (Retina is ideal)
2. Name files **exactly** as listed above (lowercase, hyphens, `.png`)
3. Put all files in a single folder called `screenshots/`
4. Drop the folder into the chat — I'll update the guide automatically

**Tip:** Use `⌘+⇧+4` then `Space` to screenshot a specific window (like the Tagalong popover) without the shadow/background.
