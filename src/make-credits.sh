#!/bin/bash

CRED_PATH="../temp/credits.txt"

printf "ZECURFOEZ CREDITS\n" > $CRED_PATH
git shortlog -n -s >> $CRED_PATH

