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

### Building and Viewing the PDF

You will need a TeX distribution installed on your system.
This extension has been tested and is known to work with [MacTeX](https://www.tug.org/mactex/).
In particular, it uses [latexmk](http://personal.psu.edu/~jcc8/software/latexmk/) to build the document.
For viewing the document, you need the PDF viewer [Skim](https://skim-app.sourceforge.io) which, unlike Preview, supports SyncTeX.

If your workspace contains a `latexmkrc` or `.latexmkrc` file, a task will automatically be created for it.
At the very minimum, your `[.]latexmkrc` file should take care of the following:

- If there are multiple `.tex` files directly in your workspace, `@default_files` must be set so that latexmk knows which files to compile.
- If you want to use live preview, you must set `$pdf_mode` to something other than `0` so that a PDF is generated.

Alternatively, you can create a task from the `latexmk` template in which you explicitly give the file to be processed and the processor to be used – this can be done in the *Project Settings*.
You should not use the *Let latexmk choose* processor option unless a `latexmkrc` file exists that sets `$pdf_mode`.

Once you have a task, the *build* and *run* operations become available:

- *build* runs `latexmk` on your project; in the case of an error, Nova will show an issue for the corresponding file.
  This will build the PDF in the project's directory and dump all intermediate files there.
- *run* starts Skim as child process to display and continuously update your PDF file there.
  While Skim is running, saving any LaTeX file of the project will automatically rebuild the PDF and tell Skim to refresh.
  **You must deactivate Skim's option to check for file changes when using this feature**.
  To enable backwards navigation, follow the instructions available in the Nova menu *Extensions -> Show Skim Setup Instructions*.
  When that is done, you can `⌘⇧`+Click in Skim to jump to the source position of the content that has been clicked.

It is recommended to position Nova and Skim side-by-side to use the continuous preview mode.

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

## Possible Improvements & Missing Features

These are ideas, I do not necessarily plan to implement them.
You are welcome to do PRs for any of these.

- more autocompletion for LaTeX (environments & commands from popular packages)
- automatically add structure for certain environments, e.g. second `{}` when selecting `tabular` environment.
- parse titles for ConTeXt \start\stop headings
- add auto-completions for math commands that are only suggested in math mode
- forward navigation in continuous preview mode (e.g. click on source, navigate to position in PDF – Skim provides an API for this, so it is doable)
- continuous preview for ConTeXt
- once Nova has an API available for setting the active editor, do away with the horrible AppleScript.

## License

MIT

## Support this Project

If you like this project and want to give something back, you can check out GitHub's *Sponsor* button to the right.
This is just an option I provide, not something I request you to do, and I will never nag about it.