import "TrancheVault.spec"

rule onlyDepositMintAndOnPortfolioStartIncreasePortfolioVirtualTokenBalance(method f) {
    uint256 virtualTokenBalance_old = portfolio.virtualTokenBalance();

    env e;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = portfolio.virtualTokenBalance();

    ifEffectThenFunction(virtualTokenBalance_new > virtualTokenBalance_old,
        f.selector == deposit(uint256, address).selector ||
        f.selector == mint(uint256, address).selector ||
        f.selector == onPortfolioStart().selector
    );
    assert true;
}

rule onlyWithdrawRedeemAndFunctionsCallingUpdateCheckpointDecreasePortfolioVirtualTokenBalance(method f) {
    uint256 virtualTokenBalance_old = portfolio.virtualTokenBalance();

    env e;
    callFunction(f, e);

    uint256 virtualTokenBalance_new = portfolio.virtualTokenBalance();

    ifEffectThenFunction(virtualTokenBalance_new < virtualTokenBalance_old,
        f.selector == withdraw(uint256, address, address).selector ||
        f.selector == redeem(uint256, address, address).selector ||
        f.selector == deposit(uint256, address).selector ||
        f.selector == mint(uint256, address).selector ||
        f.selector == onPortfolioStart().selector ||
        isCheckpointFunctionInLive(f)
    );
    assert true;
}

rule withdrawDecreasesPortfolioVirtualTokenBalance() {
    require portfolio.status() == Live();

    uint256 virtualTokenBalance_old = portfolio.virtualTokenBalance();

    env e;
    withdraw(e, _, _, _);

    uint256 virtualTokenBalance_new = portfolio.virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old;
}

rule redeemDecreasesPortfolioVirtualTokenBalance() {
    require portfolio.status() == Live();

    uint256 virtualTokenBalance_old = portfolio.virtualTokenBalance();

    env e;
    redeem(e, _, _, _);

    uint256 virtualTokenBalance_new = portfolio.virtualTokenBalance();

    assert virtualTokenBalance_new < virtualTokenBalance_old;
} 
