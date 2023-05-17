#!/bin/bash

CRED_PATH="../temp"
CRED_FILE="CREDITS"

if [ ! -d "$CRED_PATH" ]; then
  mkdir $CRED_PATH
fi

TGT="$CRED_PATH/$CRED_FILE"
printf "MUTONEX CREDITS\n" > "$TGT"
git shortlog -n -s >> "$TGT" 
