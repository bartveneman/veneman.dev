---
title: VS Code 'do not disturb' settings
url:
tags:
  - vscode
  - settings
---

[Kitty shares](https://kittygiraudel.com/snippets/vsc-lite/) some of their leave-me-alone settings for VS Code. I've tried them on my own device and _man_ what a relief! I only re-enabled Git, because I do find it useful most of the time.

```json
{
  "editor.acceptSuggestionOnCommitCharacter": false,
  "editor.codeLens": false,
  "editor.copyWithSyntaxHighlighting": false,
  "editor.dragAndDrop": false,
  "editor.hover.delay": 1200,
  "editor.lightbulb.enabled": false,
  "editor.minimap.enabled": false,
  "editor.parameterHints.enabled": false,
  "editor.quickSuggestions": {
    "other": false,
    "comments": false,
    "strings": false
  },
  "editor.suggestOnTriggerCharacters": false,
  "explorer.openEditors.visible": 0,
  "extensions.ignoreRecommendations": true,
  "git.enabled": false,
  "keyboard.touchbar.enabled": false,
  "update.showReleaseNotes": false,
  "workbench.enableExperiments": false,
  "workbench.startupEditor": "none",
  "workbench.tips.enabled": false
}
```
