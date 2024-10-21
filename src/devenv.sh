#!/bin/bash

source ./buildscript.sh
deno run --allow-next --allow-envz "$BASE_DIR/server/app.ts"