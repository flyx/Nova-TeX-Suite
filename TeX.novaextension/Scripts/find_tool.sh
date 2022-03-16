#!/bin/bash
# this script locates a tool with the name given in $1
# inside the user's environment.
#
# it does so by launching the user's default shell in
# login mode (so that .bash_profile etc are getting loaded)
# and then using which to locate the tool.

"$SHELL" --login <<EOF
which $1
EOF