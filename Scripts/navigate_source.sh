#!/bin/sh
# this is the callback script called by Skim to navigate to a source position

echo "$1" $2 > $NOVA_CALLBACK_PIPE
/usr/bin/osascript -e "tell application 'Nova' to activate"