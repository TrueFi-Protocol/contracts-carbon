import "TrancheVault.spec"

methods {
    calculateWaterfallForTranche(uint256) returns uint256 => NONDET
    status() returns uint8 => NONDET
}

invariant defaultAdminRoleIsTheOnlyAdminRole()
    forall bytes32 role. getRoleAdmin(role) == DEFAULT_ADMIN_ROLE()
    filtered { f -> !isProxyFunction(f) }

// TODO: needs to be constantly updated
rule onlyNonRoleFunctionsCanBeCalledByUsersWithoutAnyRole(method f) filtered { f -> (!f.isView && !isProxyFunction(f))} {
    requireInvariant defaultAdminRoleIsTheOnlyAdminRole();

    env e;
    require !hasRole(MANAGER_ROLE(), e.msg.sender);
    require !hasRole(TRANCHE_CONTROLLER_OWNER_ROLE(), e.msg.sender);
    require !hasRole(PAUSER_ROLE(), e.msg.sender);
    require !hasRole(DEFAULT_ADMIN_ROLE(), e.msg.sender);
    require e.msg.sender != portfolio();

    callFunctionWithRevert(f, e);

    ifEffectThenFunction(
        !lastReverted,
        f.selector == deposit(uint256,address).selector ||
        f.selector == mint(uint256,address).selector ||
        f.selector == withdraw(uint256,address,address).selector ||
        f.selector == redeem(uint256,address,address).selector ||
        f.selector == transfer(address,uint256).selector ||
        f.selector == transferFrom(address,address,uint256).selector ||
        f.selector == approve(address,uint256).selector ||
        f.selector == increaseAllowance(address,uint256).selector ||
        f.selector == decreaseAllowance(address,uint256).selector ||
        f.selector == updateCheckpoint().selector ||
        f.selector == setPortfolio(address).selector ||
        f.selector == configure((uint256,address,address,address)).selector || // if no diff, then this does not require any roles
        f.selector == renounceRole(bytes32,address).selector
    );
    assert true;
}

definition isAdminOnlyFunction(method f) returns bool =
    f.selector == grantRole(bytes32,address).selector ||
    f.selector == revokeRole(bytes32,address).selector;

rule adminOnlyFunctionsCanOnlyBeCalledByAdmin(method f) filtered { f -> (isAdminOnlyFunction(f))} {
    requireInvariant defaultAdminRoleIsTheOnlyAdminRole();

    env e;
    bool msgSenderHadDefaultAdminRole = hasRole(DEFAULT_ADMIN_ROLE(), e.msg.sender);
    callFunctionWithRevert(f, e);

    assert !lastReverted => msgSenderHadDefaultAdminRole;
}

definition isManagerOnlyFunction(method f) returns bool =
    f.selector == setManagerFeeRate(uint256).selector ||
    f.selector == setManagerFeeBeneficiary(address).selector;

rule managerOnlyFunctionsCanOnlyBeCalledByManager(method f) filtered { f -> (isManagerOnlyFunction(f))} {
    env e;
    callFunctionWithRevert(f, e);

    assert !lastReverted => hasRole(MANAGER_ROLE(), e.msg.sender);
}

definition isPortfolioOnlyFunction(method f) returns bool =
    f.selector == onPortfolioStart().selector ||
    f.selector == updateCheckpointFromPortfolio(uint256).selector;

rule portfolioOnlyFunctionsCanOnlyBeCalledByPortfolio(method f) filtered { f -> (isPortfolioOnlyFunction(f))} {
    env e;
    callFunctionWithRevert(f, e);

    assert !lastReverted => (e.msg.sender == portfolio());
}

definition isTrancheControllerOnlyFunction(method f) returns bool =
    f.selector == setDepositController(address).selector ||
    f.selector == setWithdrawController(address).selector ||
    f.selector == setTransferController(address).selector;

rule trancheControllerOnlyFunctionsCanOnlyBeCalledByTrancheController(method f) filtered { f -> (isTrancheControllerOnlyFunction(f))} {
    env e;
    callFunctionWithRevert(f, e);

    assert !lastReverted => hasRole(TRANCHE_CONTROLLER_OWNER_ROLE(), e.msg.sender);
}
