---
title: "Your meeting files on your Mac: how Tagalong handles your data"
seoTitle: "Local Meeting Notes vs Cloud AI: Tagalong’s Data Flow"
description: "See what Tagalong stores on your Mac, what transcription and AI send to providers, and how task exports and Claude folder permissions work."
date: 2026-09-05
updated: 2026-09-05
author: tagalong
draft: false
collections:
  - meeting-notes
  - granola-alternatives
answer: "Tagalong saves your meeting library on your Mac. Local storage does not mean all processing is offline: cloud transcription sends audio, and AI features send relevant text or context to providers. Some processing starts automatically after recording stops. Task export and assistant-folder access require your action; copies already sent follow the destination’s policies."
faqs:
  - question: "Does all meeting processing happen on my Mac?"
    answer: "No. Saved files and library search are local. On-device live speech recognition is available where supported, with cloud fallback. Speaker transcription and AI features send relevant audio or text for processing."
  - question: "Does the Private License make Tagalong fully offline?"
    answer: "No. It uses your own provider keys for supported direct requests, with provider usage billed separately. It changes credentials and routing, not cloud models into on-device models."
  - question: "Does Claude access include future meetings?"
    answer: "Yes, when you explicitly enable folder access in Tagalong 3.4.1. Supported meeting Markdown and personal-note text in that folder and subfolders, including future files, become available for retrieval. Audio and images are excluded. Changing folders disables access until you enable it again."
  - question: "Does revoking access delete text already sent to an AI assistant?"
    answer: "No. Revocation stops future retrieval through the connector. Previously retrieved excerpts can remain in the provider’s conversation history under its account and workspace policies."
---

## What stays on your Mac

Tagalong’s saved meeting library consists of local files: transcripts, personal notes, generated visual notes, and audio you retain. Library search reads meeting text on your Mac rather than requiring a hosted search index. You can return to the source record instead of relying only on an AI answer.

You choose the library folder. If you place it in iCloud Drive, Dropbox, or another synchronized location, that service may keep additional copies according to its configuration. “Saved on your Mac” is not a promise that your chosen folder has no other copy.

This explanation was checked against Tagalong **3.4.1** and its connector README on September 5, 2026. The [privacy policy](/privacy) gives the broader account, service, and retention details.

## What is sent for processing

| Workflow | What stays local | What can leave the Mac and when |
| --- | --- | --- |
| Live transcription | Supported on-device speech recognition and saved transcript | A cloud fallback sends audio for transcription when used |
| Post-meeting speaker transcription | Resulting transcript and editable speaker names | Recorded audio is sent for cloud transcription and speaker processing |
| Summaries and action-item extraction | Saved outputs | Relevant meeting text goes to AI processing; some steps start automatically after recording stops |
| AI questions and enhanced personal notes | Saved notes, including preserved originals | Relevant transcript context, questions, and notes go to the provider for the requested response |
| Visual notes | Generated image files | Relevant meeting context is sent for image generation |
| Library search | Meeting text and local search results | Local library search itself does not require a cloud meeting index |
| Task export | Original task record | Selected supported fields go to the chosen task destination after you send them |
| Claude or ChatGPT connection | Library files and folder permission | Search results and fetched excerpts enter the connected assistant’s conversation when retrieved |

Local storage and local processing are separate properties. If your requirement is that no meeting content be sent to a provider, Tagalong’s cloud-powered workflow is not an all-offline solution. Compare that requirement explicitly when [choosing a Mac meeting notetaker](/collections/meeting-notes/).

## Managed AI and your own provider keys

With managed AI access, supported requests are routed through Tagalong’s backend to the relevant provider. With a Private License, supported requests use your own provider keys and go directly to those providers. Both approaches save final meeting outputs locally; both can involve cloud processing.

Transcription, speaker processing, summary generation, and image generation can use different providers. Review the [privacy policy’s service details](/privacy) and your provider configuration instead of treating the model chosen for one feature as the provider for every feature.

## Claude access is an explicit folder permission

In Tagalong 3.4.1, open Settings → Claude & ChatGPT, choose a library folder, and enable **Allow AI assistants to read this folder**. Install the Claude Desktop extension and configure the same folder in Claude Settings → Extensions → Configure.

That grant includes **current and future** supported meeting Markdown and `_notes.txt` files in the folder and its subfolders. The connector searches on request; it does not upload the full library or create a cloud index. Audio, images, hidden files, and file links are excluded. Search and fetch return bounded text excerpts, and the interactive workspace offers read-only task previews.

Turning access off stops future retrieval. Choosing a different folder disables access until you explicitly enable it for that folder. Upgrading an older connector with individual-document permissions does not silently grant folder-wide access.

Claude’s folder setting is enforced by the connector’s code. It is not an operating-system sandbox guarantee, and Claude may still display its broad extension-access warning. Text already retrieved into a Claude conversation remains subject to Claude’s policies.

## ChatGPT has additional setup requirements

The release includes a private ChatGPT setup kit. It requires developer-mode access, OpenAI Secure MCP Tunnel permissions, a runtime credential, and a Mac that remains awake with the tunnel running. Saving the kit does not establish a working connection, and interactive ChatGPT rendering has not been validated.

The same Tagalong folder permission limits retrieval. Excerpts then enter the ChatGPT conversation. This private setup is separate from a public connector directory listing. Use the [setup guide](/guide#private-ai-connections) and verify account eligibility before planning a workflow around it.

## Export and deletion have separate boundaries

[Task export](/blog/meeting-action-items-apple-reminders/) creates selected items in a destination. It does not keep later edits or completion in sync. Apple Reminders follows its configured account’s sync settings; Asana, monday.com, and Todoist receive their supported task fields when you send them.

Deleting a local file or disabling connector access does not recall an exported task, shared image, or excerpt already sent to an AI conversation. Manage those copies in the destination as well. Before recording, give participants appropriate notice and obtain any required permission.

For a specific data-flow question, contact [Tagalong support](mailto:support@tagalongai.com). To see the product before configuring it, open the [synthetic meeting tour](/#tour).
