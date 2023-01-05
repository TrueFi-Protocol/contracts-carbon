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
    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    deposit(e, _, _);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new > virtualTokenBalance_old;
}

rule mintIncreasesVirtualTokenBalance() {
    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    mint(e, _, _);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new > virtualTokenBalance_old;
}

rule onlyWithdrawRedeemOnPortfolioStartOnTransferAndCheckpointFunctionsDecreaseVirtualTokenBalance(method f) {
    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    ifEffectThenFunction(virtualTokenBalance_new < virtualTokenBalance_old,
        f.selector == withdraw(uint256, address, address).selector ||
        f.selector == redeem(uint256, address, address).selector ||
        f.selector == onPortfolioStart().selector ||
        f.selector == onTransfer(uint256).selector ||
        isCheckpointFunctionInClose(f)
    );
    assert true;
}

rule withdrawDecreasesVirtualTokenBalance() {
    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    withdraw(e, _, _, _);

    uint256 virtualTokenBalance_new = virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old;
}

rule redeemDecreasesVirtualTokenBalance() {
    require portfolio.status() != Live();

    uint256 virtualTokenBalance_old = virtualTokenBalance();

    env e;
    redeem(e, _, _, _);

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

rule updateCheckpointFunctionsDecreaseVirtualTokenBalanceOnlyWhenPendingFeesArePositive(method f) filtered { f -> isCheckpointFunctionInClose(f) } {
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
rule updateCheckpointFunctionsDecreaseVirtualTokenBalanceWhenPendingFeesArePositiveAndPortfolioIsClosed(method f) filtered { f -> isCheckpointFunctionInClose(f) } {
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
