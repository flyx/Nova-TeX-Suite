#!/bin/sh
# This script runs context and optionally refreshed the previewed PDF
# afterwards. Parameters:
#  $1 = working directory
#  #2 = path to context
#  $3 = environment: "workspace" if running in current workspace.
#                    "preview" if running in temporary directory.
#  $4 = absolute path to file that is to be processed

set -e

cd "$1"

ARGS=(--nonstopmode)
if [ "$3" = "preview" ]; then
ARGS+=(--synctex --path="$(dirname "$4")")
fi

"$2" "${ARGS[@]}" "$4"

if [ "$3" = "preview" ]; then
PDF_FILE="$1/$(basename -- "$4" .tex).pdf"
osascript -e "set theFile to POSIX file \"$PDF_FILE\" as alias" \
          -e 'tell application "Skim"' \
          -e   'set theDocs to get documents whose path is (get POSIX path of theFile)' \
          -e   'if (count of theDocs) > 0 then' \
          -e     'revert theDocs' \
          -e   'else' \
          -e     'open theFile' \
          -e   'end if' \
          -e 'end tell'
fi