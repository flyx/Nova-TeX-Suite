This extension provides syntax highlighting and autocompletion for **TeX** languages including **LaTeX** and **ConTeXt**.

## Language Support

The following features of plain **TeX** are supported:

- syntax highlighting
- spell checking
- auto indentation

In **LaTeX** and **ConTeXt** files, the following additional features are available:

- auto-completion of \end commands (LaTeX) / \stop commands (ConTeXt) **BROKEN**
- outlining document structure (chapter/section/etc), currently not for ConTeXt \start\stop variants

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

## License

MIT