import "TrancheVault.spec"

rule onlyManagerCanChangeManagerFeeRate(method f) {
    uint256 managerFeeRate_old = managerFeeRate();
    
    env e;
    callFunction(f, e);

    uint256 managerFeeRate_new = managerFeeRate();

    assert (managerFeeRate_new != managerFeeRate_old =>
        hasRole(MANAGER_ROLE(), e.msg.sender)
    );
}

rule managerFeeRateCanOnlyBeChangedBySetterAndConfigure(method f) {
    uint256 managerFeeRate_old = managerFeeRate();
    
    env e;
    callFunction(f, e);

    uint256 managerFeeRate_new = managerFeeRate();

    assert (managerFeeRate_new != managerFeeRate_old =>
        f.selector == setManagerFeeRate(uint256).selector ||
        f.selector == configure((uint256,address,address,address)).selector
    );
}
