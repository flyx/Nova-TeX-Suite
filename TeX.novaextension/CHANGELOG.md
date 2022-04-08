## Version 1.0.0 (upcoming)

This release is the result of merging https://github.com/mava/Nova-LaTeX into the TeX Suite.

All:

- added language server support
- removed `\chapter`, `\section` etc folding as it was not quite compatible with environment folding
- added environments to the document symbols sidebar
- changed Skim integration to use newer builtin functionality. This means Skim doesn't run as subprocess of Nova anymore.
- implemented Skim forward navigation
- removed issue parsing from `latexmk` / `context` output, since issues are now generated from the language server
- fixed a problem where a command was parsed as sectioning command if part of the command looked like one (e.g. `\sectiona`)
- fixed a problem when `$` was used in a sectioning title

BibTeX:

- added BibTeX syntax

## Version 0.5.1

All:

- fixed the previously added preferences and shell probing to actually work (#2)
- improved error messages on tooling problems (e.g. when the latexmk or context executables are not found)

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
