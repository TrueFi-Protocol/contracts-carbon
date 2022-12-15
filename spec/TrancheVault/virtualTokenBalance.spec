import "TrancheVault.spec"

rule onlyDepositMintAndOnTransferIncreaseVirtualTokenBalance(method f) {
    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    ifEffectThenFunction(virtualTokenBalance_new > virtualTokenBalance_old,
        f.selector == deposit(uint256, address).selector ||
        f.selector == mint(uint256, address).selector ||
        f.selector == onTransfer(uint256).selector
    );
    assert true;
}

rule depositIncreasesVirtualTokenBalance() {
    uint256 amount;
    address receiver;
    address sender;

    uint256 depositFee;
    env e1;
    require e1.msg.sender == currentContract;
    _, depositFee = depositController.onDeposit(e1, sender, amount, receiver);
    // TODO: require in contract
    require amount - depositFee > 0;

    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    deposit(e, amount, receiver);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new > virtualTokenBalance_old;
}

rule mintIncreasesVirtualTokenBalance() {
    uint256 shares;
    address receiver;
    address sender;

    uint256 assetAmount;
    env e1;
    require e1.msg.sender == currentContract;
    assetAmount, _ = depositController.onMint(e1, sender, shares, receiver);

    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    mint(e, shares, receiver);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new > virtualTokenBalance_old;
}

rule onTransferIncreasesVirtualTokenBalance() {
    uint256 assets;
    require assets > 0;
    
    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    onTransfer(e, assets);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new > virtualTokenBalance_old;
}

rule onlyWithdrawRedeemOnPortfolioStartAndCheckpointFunctionsDecreaseVirtualTokenBalance(method f) {
    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    ifEffectThenFunction(virtualTokenBalance_new < virtualTokenBalance_old,
        f.selector == withdraw(uint256, address, address).selector ||
        f.selector == redeem(uint256, address, address).selector ||
        f.selector == onPortfolioStart().selector ||
        isCheckpointFunction(f)
    );
    assert true;
}

rule withdrawDecreasesVirtualTokenBalance() {
    uint256 assets;
    require assets > 0;

    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    withdraw(e, assets, _, _);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old;
}

rule redeemDecreasesVirtualTokenBalance() {
    uint256 shares;
    address receiver;
    address owner;
    address sender;

    uint256 assets;
    env e1;
    require e1.msg.sender == currentContract;
    assets, _ = withdrawController.onRedeem(e1, sender, shares, receiver, owner);
    // TODO: require in contract
    require assets > 0;

    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.msg.sender == sender;
    redeem(e, shares, receiver, owner);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old;
}

rule onPortfolioStartDecreasesVirtualTokenBalance() {
    uint256 virtualTokenBalance_old = virtualTokenBalance();
    require virtualTokenBalance_old > 0;

    env e;
    onPortfolioStart(e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old;
}

rule updateCheckpointFunctionsDecreaseVirtualTokenBalanceOnlyWhenPendingFeesArePositive(method f) filtered { f -> isCheckpointFunction(f) } {
    uint256 timestamp;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 totalPendingFees_old = totalPendingFees(e1);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.block.timestamp == timestamp;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old => totalPendingFees_old > 0;
}

// more detailed version of a rule above
rule updateCheckpointFunctionsDecreaseVirtualTokenBalanceWhenPendingFeesArePositiveAndPortfolioIsClosed(method f) filtered { f -> isCheckpointFunction(f) } {
    uint256 timestamp;
    address managerFeeBeneficiary_old = managerFeeBeneficiary();
    uint256 managerFeeRate_old = managerFeeRate();

    require portfolio.status() == Closed();
    require virtualTokenBalance() > 0;

    env e2;
    require e2.block.timestamp == timestamp;
    uint256 totalPendingFees_old = totalPendingFees(e2);

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    require e.block.timestamp == timestamp;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    if (f.selector == configure((uint256,address,address,address,address)).selector) {
        require (managerFeeBeneficiary() != managerFeeBeneficiary_old ||
            managerFeeRate() != managerFeeRate_old);
    }

    assert virtualTokenBalance_new < virtualTokenBalance_old <=> totalPendingFees_old > 0;
}
