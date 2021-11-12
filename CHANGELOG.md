## Version 0.5.0

LaTeX:

- fixed latexmk runner bugs that were introduced in 0.4.0
- improved parsing of LaTeX error messages

All:

- added editor actions to make text emphasised and bold.
- probe user's default shell for proper path to tools (latexmk/context/etc)
- added global & project preferences to explicitly set the path to the tools that ought to be used
- made extension only activate in workspaces with *.tex or [.]latexmkrc files or files that use one of the TeX syntaxes

## Version 0.4.0

LaTeX:

- Can clean via latexmk.
- auto-generate task from `[.]latexmkrc` file, if one exists.

ConTeXt:

- implemented task template similar to latexmk, including build, preview and clean support

All:

- automatically open Issues Sidebar when an error is encountered during building / running.

## Version 0.3.1

Updated Changelog. whoops :)

## Version 0.3.0

LaTeX:

- Fixed latexmk issue matcher so that Nova will show a proper error item when compilation fails.
- Added "run" task that runs Skim as preview application and continuously updates the PDF when editing files.
- Implemented SyncTeX support which enables backwards navigation from PDF to source.

All:

- Fixed comment definitions.

## Version 0.2

LaTeX:

- Disabled highlighting of numbers outside math mode.
  This yielded far too much false positives.
- Suggest `document` as environment name in auto-completion
- Added task template for building via latexmk.

## Version 0.1

Initial release
