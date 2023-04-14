#!/bin/bash

echidna-test "$@"
return_code=$?
chown -R "$HOST_USER:$HOST_USER" ./echidna-corpus
exit $return_code
