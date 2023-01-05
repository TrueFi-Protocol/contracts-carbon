#!/bin/bash

if [[ -z "$(git status --porcelain)" ]]; then
    echo "Build canary stored in ./build/canary.hash"
    git log --pretty=format:'%H' -n 1 > ./build/canary.hash
fi
