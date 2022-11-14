import "../Shared.spec"

using MockToken as token
// using StructuredPortfolio as portfolio

methods {
    depositController() returns address envfree
    withdrawController() returns address envfree
    transferController() returns address envfree

    balanceOf(address) returns uint256 envfree
    getRoleAdmin(bytes32) returns bytes32 envfree
    hasRole(bytes32, address) returns bool envfree
    managerFeeBeneficiary() returns address envfree
    managerFeeRate() returns uint256 envfree
    portfolio() returns address envfree

    MANAGER_ROLE() returns bytes32 envfree
    DEFAULT_ADMIN_ROLE() returns bytes32 envfree
    TRANCHE_CONTROLLER_OWNER_ROLE() returns bytes32 envfree
    PAUSER_ROLE() returns bytes32 envfree

    token.allowance(address, address) returns uint256 envfree
    token.balanceOf(address) returns uint256 envfree
}

// RULES

// FUNCTIONS

function callFunction(method f, env e) {
    calldataarg args;

    if (!f.isView && !isProxyFunction(f)) {
        if (f.isFallback) {
            f@withrevert(e, args);
        } else {
            f(e, args);
        }
    }
}

function callFunctionWithRevert(method f, env e) {
    calldataarg args;

    if (!f.isView && !isProxyFunction(f)) {
        f@withrevert(e, args);
    }
}

definition isProxyFunction(method f) returns bool =
    f.selector == upgradeTo(address).selector ||
    f.selector == upgradeToAndCall(address,bytes).selector ||
    f.selector == initialize(string,string,address,address,address,address,address,uint256,address,uint256).selector;

// CONSTANTS

// GHOSTS
