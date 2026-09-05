---
title: "Your meeting files on your Mac: how Tagalong handles your data"
description: "Understand what Tagalong saves locally, when meeting content goes to a provider, and how sharing and task export work."
date: 2026-09-05
updated: 2026-09-05
author: tagalong
draft: false
collections:
  - meeting-notes
answer: "Tagalong saves your meeting library on your Mac. Cloud transcription, AI features, and exports send the relevant audio or text to a provider or destination when those features are used. Local storage does not mean every feature works offline."
faqs:
  - question: "Does all meeting processing happen on my Mac?"
    answer: "No. Saved files and library search are local, but cloud transcription and AI features send relevant content for processing. On-device live speech recognition is available where supported."
  - question: "Do exported tasks stay in sync?"
    answer: "No. You select tasks and initiate one-way creation in a destination. Later changes do not synchronize between Tagalong and the task manager."
---

## What stays on your Mac

Your saved meeting files and meeting library live on your Mac. You can reopen the notes and transcripts, revisit the conversation, and search the saved library without moving that library into a hosted workspace.

Your personal notes remain part of that record. When you use Enhance My Notes, Tagalong can bring in context from the transcript while preserving the original notes so you can return to your own wording.

## When content is sent for processing

Local storage describes where your files are saved. It does not describe every processing step.

| Feature | What to understand |
| --- | --- |
| Live transcription | On-device speech recognition can run locally where supported. Cloud transcription sends audio for processing. |
| AI assistance and summaries | Relevant meeting text is sent for the requested response. |
| Enhanced notes | Your notes and relevant transcript context are used to produce an enhanced version. |
| Visual notes | Meeting context is sent for image generation. |
| Task export and sharing | Selected information is sent to the destination you choose. |

The routing also depends on your plan. Managed subscriptions use Tagalong's backend for supported cloud requests. With a Private License, supported requests use your own provider keys. See the [privacy policy](/privacy) for the details and current providers.

## Keep export separate from synchronization

Exporting a task creates it in a destination after you select it and initiate the export. It does not establish two-way synchronization. Editing or completing an exported task does not update the corresponding item in Tagalong.

The [feature availability section](/#availability) distinguishes the public release from integrations still in QA. Check that section before planning a workflow around a connector or task destination.

## Start with the controls that matter to you

Use the [Tagalong guide](/guide) to configure recording and permissions, choose a plan, and understand the available export options. Give meeting participants appropriate notice and get any permission you need before recording.

For a question about a particular workflow, contact [Tagalong support](mailto:support@tagalongai.com).
