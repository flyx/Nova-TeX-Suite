#!/bin/bash
# this script starts Skim as child process of Nova for continuous preview

set -e

export NOVA_CALLBACK_PIPE=$1/nova_in.fifo

# opening file id 3 to write into the callback pipe.
# this ensures that an echo from Skim into the pipe will not send EOF into the pipe
# (pipe will receive EOF when there are no writers left)
exec 3>$NOVA_CALLBACK_PIPE

# ensure everything is closed when we stop previewing
trap "kill 0" SIGINT SIGTERM EXIT

# starting Skim here allows it to access $NOVA_CALLBACK_PIPE for source navigation.
/Applications/Skim.app/Contents/MacOS/Skim