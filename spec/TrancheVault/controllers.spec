import "TrancheVault.spec"

rule controllersCanOnlyBeChangedByManagerOrTrancheControllerOwner(method f) {
    address depositController_old = depositController();
    address withdrawController_old = withdrawController();
    address transferController_old = transferController();
    
    env e;
    callFunction(f, e);

    address depositController_new = depositController();
    address withdrawController_new = withdrawController();
    address transferController_new = transferController();

    assert (depositController_new != depositController_old ||
        withdrawController_new != withdrawController_old || 
        transferController_new != transferController_old =>  
        hasRole(TRANCHE_CONTROLLER_OWNER_ROLE(), e.msg.sender) ||
        hasRole(MANAGER_ROLE(), e.msg.sender)
    );
}

rule depositControllerCanOnlyBeChangedBySetterAndConfigure(method f) {
    address depositController_old = depositController();
    
    env e;
    callFunction(f, e);

    address depositController_new = depositController();

    assert (depositController_new != depositController_old =>
        f.selector == setDepositController(address).selector ||
        f.selector == configure((uint256,address,address,address,address)).selector
    );
}

rule withdrawControllerCanOnlyBeChangedBySetterAndConfigure(method f) {
    address withdrawController_old = withdrawController();
    
    env e;
    callFunction(f, e);

    address withdrawController_new = withdrawController();

    assert (withdrawController_new != withdrawController_old =>
        f.selector == setWithdrawController(address).selector ||
        f.selector == configure((uint256,address,address,address,address)).selector
    );
}

rule transferControllerCanOnlyBeChangedBySetter(method f) {
    address transferController_old = transferController();
    
    env e;
    callFunction(f, e);

    address transferController_new = transferController();

    assert (transferController_new != transferController_old =>
        f.selector == setTransferController(address).selector ||
        f.selector == configure((uint256,address,address,address,address)).selector
    );
}
