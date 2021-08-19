This extension provides syntax highlighting and autocompletion for **TeX** languages including **LaTeX** and **ConTeXt**.

## Language Support

The following features are supported in plain **TeX**, **LaTeX** and **ConTeXt**:

- syntax highlighting
- spell checking
- auto indentation
- command completion suggestions

In **LaTeX** and **ConTeXt** files, the following additional features are available:

- auto-completion of \end commands (LaTeX) / \stop commands (ConTeXt)
- outlining document structure (chapter/section/etc), currently not for ConTeXt \start\stop variants
- folding of environments (\begin / \end in LaTeX, \start / \stop in ConTeXt)
- folding of document structure (\chapter, \section, etc)
- environment name suggestions (for LaTeX; in ConTeXt environments are part of command completion)

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

## Possible improvements

These are ideas, I do not necessarily plan to implement them.
You are welcome to do PRs for any of these.

- More autocompletion for LaTeX (environments & commands from popular packages)
- automatically add structure for certain environments, e.g. second `{}` when selecting `tabular` environment.
- Parse titles for ConTeXt \start\stop headings
- in-Editor PDF preview (not sure if possible; I certainly won't do this since it requires doing more than just some XML definitions)
- commands (not sure if helpful; the user can simply issue the desired command in a terminal view)

## License

MIT