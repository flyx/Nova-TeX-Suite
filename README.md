# TeX Suite for Nova.app

This [Nova](https://nova.app) extension provides syntax highlighting and autocompletion for **TeX** languages including **LaTeX** and **ConTeXt**.

## Supported Features

- syntax highlighting
- spell checking
- auto indentation
- command completion suggestions
- auto-completion of `\end` commands (LaTeX)
- auto-completion of `\stop` commands (ConTeXt)
- outlining and folding of document structure: `\chapter`, `\section` etc (LaTeX, ConTeXt)  
  *currently not for ConTeXt \start\stop variants*
- folding of `\begin` / `\end` (LaTeX)
- folding of `\start` / `\stop` (ConTeXt)
- environment name suggestions (LaTeX)
- tasks for building and viewing the resulting PDF via `latexmk` (LaTeX)

### Building and viewing the PDF

You will need a TeX distribution installed on your system.
This extension has been tested and is known to work with [MacTeX](https://www.tug.org/mactex/).
In particular, it uses [latexmk](http://personal.psu.edu/~jcc8/software/latexmk/) to build the document.

For viewing the document, you need the PDF viewer [Skim](https://skim-app.sourceforge.io) which, unlike Preview, supports SyncTeX.

- Go to *Project Settings* and create a new task from the `latexmk` template.
- Enter the path to the main `.tex` file.
  Optionally set the LaTeX processor.
- close settings, select the created task in Nova's title bar if a different task is currently active.

The *build* and *run* buttons in the title bar should now be enabled:

- *build* runs `latexmk` on your project; in the case of an error, Nova will show an issue for the corresponding file.
  This will build the PDF in the project's directory and dump all intermediate files there.
- *run* starts Skim as child process to display and continuously update your PDF file there.
  While Skim is running, saving any LaTeX file of the project will automatically rebuild the PDF and tell Skim to refresh.
  **You must deactivate Skim's option to check for file changes when using this feature**.
  In Skim, you can `⌘⇧`+Click to jump to the source position of the content that has been clicked after you've followed the instructions in the menu *Extensions -> Show Skim Setup Instructions*.

It is recommended to position Nova and Skim side-by-side to use the continuous preview mode.
The extension will not do any window arrangement for you.

## Remarks

Syntax highlighting is and can only be best effort.
The possibility of changing the `\catcode` of characters renders every effort to fully comprehend TeX-based syntax futile without implementing a full TeX interpreter.
Some special structures are understood and highlighted appropriately:

 * popular environments like `verbatim`, `lstlisting` or `equation` that change processing of their content are known.
 * square brackets are always processed as if they were a list of optional parameters with a structure like `[name=value, ...]`.
   This will not be right in all contexts.
 * The various possibilities to enter math mode are understood.

Spell-checking excludes command and parameter names, but cannot fully distinguish between content that should be checked and content that shouldn't (e.g. reference names).

The document structure only includes numbered headings, i.e. headings like `\section*` (LaTeX) or `\subject` (ConTeXt) are not shown.
Heading titles are constructed from textual content until a command is encountered – so if your section title starts with `\textit`, the displayed title in the outline will be empty.

Skim is used for showing a PDF because that is the only way SyncTeX support can realistically be provided.
It is very unlikely that this will ever be an in-editor view.

## Possible improvements & missing features

These are ideas, I do not necessarily plan to implement them.
You are welcome to do PRs for any of these.

- more autocompletion for LaTeX (environments & commands from popular packages)
- automatically add structure for certain environments, e.g. second `{}` when selecting `tabular` environment.
- parse titles for ConTeXt \start\stop headings
- add auto-completions for math commands that are only suggested in math mode
- forward navigation in continuous preview mode (e.g. click on source, navigate to position in PDF – Skim provides an API for this, so it is doable)
- continuous preview for ConTeXt
- automatically recognize `.latexmkrc` file in the project home and auto-generate a task for it
- once Nova has an API available for setting the active editor, do away with the horrible AppleScript.

## License

MIT