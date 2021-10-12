#!/bin/sh
# this script runs latexmk, configuring it to enable SyncTeX and opening/refreshing the
# generated file in Skim when ready.

set -e

cd "$1" # working directory

if [ "$2" = "true" ]; then
read -r -d '' PERL_SCRIPT <<'EOF' || true
use Cwd;
$dir = cwd();
$pdf_previewer =
	"osascript -e 'set theFile to POSIX file (\"$dir/\" & %R & \".pdf\") as alias'" .
					 " -e 'tell application \"Skim\"'" .
					 " -e   'revert documents'" .
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
latexmk -interaction=nonstopmode -output-directory="$1" -file-line-error -synctex=1 \
		-silent -e "$PERL_SCRIPT" -pv -pdf -cd $3 "$4"
else
latexmk -interaction=nonstopmode -output-directory="$1" -file-line-error \
		-silent -cd $3 "$4"
fi
