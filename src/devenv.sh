#!/bin/bash

source ./buildscript.sh
deno run --allow-next --allow-envz "$RUNTIME_DIR/server/app.ts"