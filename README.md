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

You need [latexmk](http://personal.psu.edu/~jcc8/software/latexmk/) which should come with your TeX distribution.
For viewing the document, you need [Skim](https://skim-app.sourceforge.io) because that supports SyncTeX (unlike Preview).

- Go to *Project Settings* and create a new task from the `latexmk` template.
- Enter the path to the main `.tex` file.
- close settings, select the created task in Nova's title bar if a different task is currently active.

The *build* and *run* buttons in the title bar should now be enabled:

- *build* runs `latexmk` on your project; in the case of an error, Nova will show an issue for the corresponding file.
  If you use Skim to view your file, you may configure it to auto-update. **Do not do this when using the *run* command (see below)**.
- *run* runs `latexmk` in continuous preview mode and opens Skim to show the resulting PDF file.
  In this mode, editing any file of the project will automatically rebuild the PDF and Skim will refresh when the PDF is ready.
  This mode tells Skim automatically to update when PDF generation has finished – which means that **you must deactivate Skim's option to check for file changes**.
  SyncTeX support is currently TODO.

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
Also, the extension API seems not to be built to provide something as complex as an in-editor PDF preview.

## Possible improvements

These are ideas, I do not necessarily plan to implement them.
You are welcome to do PRs for any of these.

- More autocompletion for LaTeX (environments & commands from popular packages)
- automatically add structure for certain environments, e.g. second `{}` when selecting `tabular` environment.
- Parse titles for ConTeXt \start\stop headings
- add auto-completions for math commands that are only suggested in math mode

## License

MIT