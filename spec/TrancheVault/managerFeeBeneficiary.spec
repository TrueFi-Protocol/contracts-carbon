import "TrancheVault.spec"

rule onlyManagerCanChangeManagerFeeBeneficiary(method f) {
    address managerFeeBeneficiary_old = managerFeeBeneficiary();
    
    env e;
    callFunction(f, e);

    address managerFeeBeneficiary_new = managerFeeBeneficiary();

    assert (managerFeeBeneficiary_new != managerFeeBeneficiary_old =>
        hasRole(MANAGER_ROLE(), e.msg.sender)
    );
}

rule managerFeeBeneficiaryCanOnlyBeChangedBySetterAndConfigure(method f) {
    address managerFeeBeneficiary_old = managerFeeBeneficiary();
    
    env e;
    callFunction(f, e);

    address managerFeeBeneficiary_new = managerFeeBeneficiary();

    assert (managerFeeBeneficiary_new != managerFeeBeneficiary_old =>
        f.selector == setManagerFeeBeneficiary(address).selector ||
        f.selector == configure((uint256,address,address,address)).selector
    );
}
