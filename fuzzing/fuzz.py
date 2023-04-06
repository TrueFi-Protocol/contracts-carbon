#!/usr/bin/env python3

import os
import argparse
import json
from subprocess import getstatusoutput
import re

def shell(cmd):
    code, result = getstatusoutput(cmd)
    print(result)
    if code != 0:
        exit(1)
    return result

def build_docker():
    shell(f"docker build -f fuzzing/docker/Dockerfile ../.. -t fuzz_carbon")

def spawn_single_container(conf):
    output = shell(f"docker run --rm -e HOST_USER=$(id -u) -v {os.getcwd()}/echidna-corpus:/root/echidna-corpus fuzz_carbon {' '.join(conf)}")
    if re.search("passed!", output) is None:
        exit(1)
    shell(f"rm -rf echidna-corpus/coverage")
    shell(f"rm -rf echidna-corpus/reproducers")

if __name__=="__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--test-limit",
        type=int,
        default=None
    )

    args = parser.parse_args()

    spawn_args = []
    if args.test_limit is not None:
      spawn_args.append(f"--test-limit {args.test_limit}")

    build_docker()
    with open("fuzzing/config/fuzz.json", "r") as f:
        conf = json.load(f)

    for contract, config in conf.items():
        spawn_single_container([
          ".",
          f"--config {config}",
          f"--contract {contract}",
          *spawn_args
        ])

