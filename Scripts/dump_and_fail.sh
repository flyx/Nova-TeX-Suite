#!/bin/sh
# this script is used to communicate two things to Nova:
# a) the build has failed
# b) the content of the build log (or error output if no build log exists)
# for this, it first outputs the log, and then it fails.
# $1: build log or lines to output
# $2: set iff build log should be output

if [ -n "$2" ]; then
	cat "$1"
else
	echo "$1"
fi
exit 1