# TeX Suite for Nova.app: Support for TeX, LaTeX and ConTeXt

This [Nova](https://nova.app) extension provides syntax highlighting and autocompletion for **TeX** languages including **LaTeX** and **ConTeXt**.
See [the extension's Readme](TeX.novaextension/README.md) for user documentation.

## Remarks

The included syntaxes are and can only be best effort.
The ability of changing the `\catcode` of characters renders every effort to fully comprehend TeX-based syntax futile without implementing a full TeX interpreter.

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
 
These are ideas, there is not necessarily a plan to implement them.
You are welcome to do PRs for any of these.

 - automatically add structure for certain environments, e.g. second `{}` when selecting `tabular` environment.
 - parse titles for ConTeXt \start\stop headings
 - add auto-completions for math commands that are only suggested in math mode

## Building the icon

`icon.svg` is the source for the extension's icon.
Use the following commands to regenerate the `.png` files (needs a `librsvg` installation):

    rsvg-convert icon.svg -o TeX.novaextension/extension@2x.png
    rsvg-convert -h 128 icon.svg -o TeX.novaextension/extension.png

## License

MIT