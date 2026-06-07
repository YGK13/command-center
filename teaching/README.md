# Command Center — Teaching Bundle

Everything needed to teach (or sell) the Command Center build.

## What's here

| File | What it is | Use it for |
|---|---|---|
| **Command-Center-Field-Guide.html** | The premium illustrated walkthrough: diagrams, real screenshots, every build module, the No-Code track and the teaching kit. Opens in any browser, works offline. | The flagship deliverable. Hand to premium readers and students. |
| **Command-Center-Field-Guide.pdf** | A portable PDF export of the field guide (dark, screen-accurate). | Email, sell, or print. The shareable version. |
| **Command-Center-NoCode-Template.xlsx** | A prebuilt spreadsheet Command Center: Companies, Pipeline, Goals, Tasks, Feeds and an auto-calculating Dashboard with health colors. | The No-Code track. Hand to non-technical readers so they finish with a working system in 90 minutes. |
| **COMMAND-CENTER-PROTOCOL.md** | The same build protocol in plain Markdown (the text master). | Editing, version control, or piping into other formats. |
| **assets/** | The screenshots used by the field guide. | Regenerate with `node setup/screenshots.mjs`. |

## Regenerating the assets

From the project root:

```
node setup/screenshots.mjs          # recapture dashboard screenshots
python setup/make-nocode-template.py # rebuild the No-Code spreadsheet
```

To rebuild the PDF, open the field guide in Chrome and print to PDF, or re-run the puppeteer step in your notes.

## Suggested packaging (Value Ladder)

- **Free / regular reader:** the No-Code spreadsheet + Part 1 of the guide.
- **Premium reader:** the full Field Guide (HTML + PDF).
- **Student / cohort:** the guide + the 4-session course in Part 5.
- **1-on-1:** build it with them, around their business.
