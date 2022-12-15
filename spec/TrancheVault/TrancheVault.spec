import "../Shared.spec"

using MockToken as token
using ProtocolConfig as protocolConfig
using StructuredPortfolio as portfolio
using DepositController as depositController
using WithdrawController as withdrawController

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
    virtualTokenBalance() returns uint256 envfree

    portfolio.status() returns uint8 envfree

    protocolConfig.protocolTreasury() returns address envfree

    MANAGER_ROLE() returns bytes32 envfree
    DEFAULT_ADMIN_ROLE() returns bytes32 envfree
    TRANCHE_CONTROLLER_OWNER_ROLE() returns bytes32 envfree
    PAUSER_ROLE() returns bytes32 envfree

    token.allowance(address, address) returns uint256 envfree
    token.balanceOf(address) returns uint256 envfree

    calculateWaterfallForTranche(uint256 trancheId) returns uint256 => NONDET
    calculateWaterfallForTrancheWithoutFee(uint256 trancheId) returns uint256 => NONDET

    convertToAssets(uint256 shares) returns uint256 => convertToAssetsGhost(shares)
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

// DEFINITIONS

definition isProxyFunction(method f) returns bool =
    f.selector == upgradeTo(address).selector ||
    f.selector == upgradeToAndCall(address,bytes).selector ||
    f.selector == initialize(string,string,address,address,address,address,address,uint256,address,uint256).selector;

// functions that change token balance only by calling _updateCheckpoint(uint256) 
definition isCheckpointFunction(method f) returns bool =
    f.selector == configure((uint256,address,address,address,address)).selector ||
    f.selector == setManagerFeeRate(uint256).selector ||
    f.selector == setManagerFeeBeneficiary(address).selector ||
    f.selector == updateCheckpointFromPortfolio(uint256).selector || 
    f.selector == updateCheckpoint().selector;

// GHOSTS

ghost convertToAssetsGhost(uint256) returns uint256;

ghost uint256 tranchesCountGhost;
hook Sstore portfolio.tranches.(offset 0) uint256 value STORAGE {
    tranchesCountGhost = value;
}
hook Sload uint256 value portfolio.tranches.(offset 0) STORAGE {
    require value == tranchesCountGhost;
}
