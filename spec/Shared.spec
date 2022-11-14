// Shared functions

function ifEffectThenFunction(bool isEffect, bool isFunction) {
    if (!isFunction) {
        assert !isEffect;
    } else {
        require isEffect; // This relies on vacuity check to verify that this reachable;
    }
}

// CONSTANTS
