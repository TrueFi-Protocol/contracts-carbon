import "../Shared.spec"

methods {
    getValue() returns uint256 envfree
}

// RULES

rule test() {
    assert true;
}

// FUNCTIONS

function callFunction(method f, env e) {
    calldataarg args;

    if (!f.isView) {
        if (f.isFallback) {
            f@withrevert(e, args);
        } else {
            f(e, args);
        }
    }
}
// GHOSTS:
