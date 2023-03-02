#!/bin/bash

echidna-test "$@"
chown -R "$HOST_USER:$HOST_USER" ./echidna-corpus
