#!/bin/sh
# this script is used to communicate two things to Nova:
# a) the build has failed
# b) the content of the build log
# for this, it first outputs the log, and then it fails.

cat "$1"
exit 1