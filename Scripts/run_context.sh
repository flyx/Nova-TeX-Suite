#!/bin/sh
# This script runs context and optionally refreshed the previewed PDF
# afterwards. Parameters:
#  $1 = working directory
#  $2 = environment: "workspace" if running in current workspace.
#                    "preview" if running in temporary directory.
#  $3 = absolute path to file that is to be processed

set -e

cd "$1"

ARGS=(--nonstopmode)
if [ "$2" = "preview" ]; then
ARGS+=(--synctex --path="$(dirname "$3")")
fi

echo "in $1"
echo "context ${ARGS[0]} $3"

context "${ARGS[@]}" "$3"

if [ "$2" = "preview" ]; then
PDF_FILE="$1/$(basename -- "$3" .tex).pdf"
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