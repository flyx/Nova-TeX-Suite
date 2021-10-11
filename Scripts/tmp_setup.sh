#!/bin/sh
# This script sets up a temporary directory which is used for storing files
# created during processing, including the final PDF.
# FIFO queues are created for communication between Nova and Skim.

OUT_DIR=$(mktemp -d -t "nova-tex")
mkfifo $OUT_DIR/nova_in.fifo
echo "$OUT_DIR"
