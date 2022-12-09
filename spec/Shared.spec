// Shared functions

function ifEffectThenFunction(bool isEffect, bool isFunction) {
    if (!isFunction) {
        assert !isEffect;
    } else {
        require isEffect; // This relies on vacuity check to verify that this reachable;
    }
}

// CONSTANTS

definition CapitalFormation() returns uint8 = 0;
definition Live() returns uint8 = 1;
definition Closed() returns uint8 = 2;
