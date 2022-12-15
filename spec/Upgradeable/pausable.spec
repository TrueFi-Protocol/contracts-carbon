using StructuredPortfolio as sp
using TrancheVault as tv

methods {
    getRoleAdmin(bytes32) returns bytes32 envfree
    hasRole(bytes32, address) returns bool envfree

    tv.portfolio() returns address envfree
    tv.managerFeeRate() returns uint256 envfree
    tv.managerFeeBeneficiary() returns address envfree
    tv.depositController() returns address envfree
    tv.withdrawController() returns address envfree

    DEFAULT_ADMIN_ROLE() returns bytes32 envfree
    PAUSER_ROLE() returns bytes32 envfree

    sp.MANAGER_ROLE() returns bytes32 envfree
    tv.MANAGER_ROLE() returns bytes32 envfree
    tv.TRANCHE_CONTROLLER_OWNER_ROLE() returns bytes32 envfree
}

rule nonManagersCannotCallNonViewFunctionsWhenPaused(method f) filtered {
  f -> !f.isFallback 
    && !f.isView
    && !isProxyFunction(f)
    && !isHarnessFunction(f)
    && f.selector != renounceRole(bytes32,address).selector
} {
    address sender;
    bytes32 role;
    requireInvariant onlyManagerAndDefaultAdminAreRoleAdmins(role);
    env _e1;
    require paused(_e1);

    if (currentContract == tv) {
        env _e2;
        require sp.paused(_e2);
        require tv.portfolio() != 0;
    }

    if (currentContract == sp) {
        require tranchesCountGhost == 3;
        uint256 idx;
        env _e3;
        require sp.tranches(_e3, idx) == tv;
        require sp.tranches(_e3, 0) != sender;
        require sp.tranches(_e3, 1) != sender;
        require sp.tranches(_e3, 2) != sender;
    }

    env e;
    require sender != tv;
    require sender != sp;
    require e.msg.sender == sender;
    require !hasRole(DEFAULT_ADMIN_ROLE(), e.msg.sender);
    require !hasRole(sp.MANAGER_ROLE(), e.msg.sender);
    require !hasRole(tv.MANAGER_ROLE(), e.msg.sender);
    require !hasRole(tv.TRANCHE_CONTROLLER_OWNER_ROLE(), e.msg.sender);
    require !hasRole(PAUSER_ROLE(), e.msg.sender);
    callFunctionWithRevert(f, e, role);

    assert lastReverted;
}

rule pausedContractCanAlwaysBeUnpaused() {
    env _e;
    require paused(_e);

    env e;
    require hasRole(PAUSER_ROLE(), e.msg.sender);
    require e.msg.value == 0;
    unpause@withrevert(e);

    assert !lastReverted;
}

invariant onlyManagerAndDefaultAdminAreRoleAdmins(bytes32 role)
    getRoleAdmin(role) == DEFAULT_ADMIN_ROLE()
    filtered { f -> !isProxyFunction(f) && !isManuallyChecked(f) && !f.isFallback }

definition isManuallyChecked(method f) returns bool = 
    f.selector == sp.markLoanAsDefaulted(uint256).selector ||
    f.selector == sp.close().selector ||
    f.selector == sp.repayLoan(uint256).selector || 
    f.selector == tv.configure((uint256,address,address,address,address)).selector ||
    f.selector == tv.deposit(uint256,address).selector ||
    f.selector == tv.mint(uint256,address).selector ||
    f.selector == tv.withdraw(uint256,address,address).selector ||
    f.selector == tv.redeem(uint256,address,address).selector;

function callFunctionWithRevert(method f, env e, bytes32 role_optional) {
    if (f.selector == grantRole(bytes32,address).selector) {
        address target;
        grantRole@withrevert(e, role_optional, target);
    } else if (f.selector == revokeRole(bytes32,address).selector) {
        address target;
        revokeRole@withrevert(e, role_optional, target);
    } else if (f.selector == tv.configure((uint256,address,address,address,address)).selector) {
        tv.Configuration configuration;
        require configuration.managerFeeRate != tv.managerFeeRate() ||
            configuration.managerFeeBeneficiary != tv.managerFeeBeneficiary() ||
            configuration.depositController != tv.depositController() ||
            configuration.withdrawController != tv.withdrawController();
        tv.configure@withrevert(e, configuration);
    } else {
        calldataarg args;
        f@withrevert(e, args);
    }
}

definition isProxyFunction(method f) returns bool =
    f.selector == upgradeTo(address).selector ||
    f.selector == upgradeToAndCall(address,bytes).selector ||
    f.selector == sp.initialize(address,address,address,address,(string,uint256,uint256,uint256),(address,uint128,uint128)[],(uint256,uint256)).selector ||
    f.selector == tv.initialize(string,string,address,address,address,address,address,uint256,address,uint256).selector;

definition isHarnessFunction(method f) returns bool = false;

ghost uint256 tranchesCountGhost;

// Introduces an assumption that tranches.length == tranchesData.length
hook Sload uint256 value sp.tranches.(offset 0) STORAGE {
    require value == tranchesCountGhost;
}
hook Sload uint256 value sp.tranchesData.(offset 0) STORAGE {
    require value == tranchesCountGhost;
}
