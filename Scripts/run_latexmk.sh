#!/bin/sh
# this script runs latexmk, configuring it to enable SyncTeX and opening/refreshing the
# generated file in Skim when ready. Params:
#  $1 = working directory
#  $2 = environment: "workspace" if running in current workspace.
#                    "preview" if running in temporary directory.
#  $3 = processor (-pdflatex, -xelatex or -lualatex), might be empty
#  $4 = path to file that should be processed, might be empty

set -e

echo "pwd=$(pwd)" >&2

ADDITIONAL_ARGS=()
if [ "$2" = "preview" ]; then
read -r -d '' PERL_SCRIPT <<'EOF' || true
$pdf_previewer =
	"osascript -e 'set theFile to POSIX file (\"$dir/\" & %R & \".pdf\") as alias'" .
					 " -e 'tell application \"Skim\"'" .
					 " -e   'set theDocs to get documents whose path is (get POSIX path of theFile)'" .
					 " -e   'if (count of theDocs) > 0 then'" .
					 " -e     'revert theDocs'" .
					 " -e   'else'" .
					 " -e     'open theFile'" .
					 " -e   'end if'" .
					 " -e 'end tell'";
$ENV{max_print_line} = $log_wrap = 1000;
$ENV{error_line} = 254;
$ENV{half_error_line} = 238;
EOF
ADDITIONAL_ARGS+=(-e "\$dir = '$1'; $PERL_SCRIPT" -pv -synctex=1)
fi
if [ "$3" ]; then
ADDITIONAL_FLAGS+=("$3")
fi
if [ "$4" ]; then
ADDITIONAL_FLAGS+=("$4")
fi

latexmk -interaction=nonstopmode -output-directory="$1" -file-line-error \
		-silent "${ADDITIONAL_ARGS[@]}"