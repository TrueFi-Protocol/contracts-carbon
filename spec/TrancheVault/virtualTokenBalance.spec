import "TrancheVault.spec"

// WARNING: this invariant assumes that there are no tokens transfered
// directy into portfolio, as a result it is unsafe to require it
invariant tokenBalanceIsEqualVirtualTokenBalance()
    virtualTokenBalance() == token.balanceOf(currentContract)
    filtered { f -> !isProxyFunction(f) && !f.isFallback && f.selector != onTransfer(uint256).selector } {
        preserved deposit(uint256 assets, address receiver) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require e.msg.sender != currentContract;
        }
        preserved mint(uint256 shares, address receiver) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require e.msg.sender != currentContract;
        }
        preserved withdraw(uint256 assets, address receiver, address owner) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require receiver != currentContract;
        }
        preserved redeem(uint256 assets, address receiver, address owner) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require receiver != currentContract;
        }
        preserved {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
        }
    }

invariant tokenBalanceIsGTEVirtualTokenBalance()
    virtualTokenBalance() >= token.balanceOf(currentContract)
    filtered { f -> !isProxyFunction(f) && !f.isFallback } {
        preserved withdraw(uint256 assets, address receiver, address owner) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require receiver != currentContract;
        }
        preserved redeem(uint256 assets, address receiver, address owner) with (env e) {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
            require receiver != currentContract;
        }
        preserved {
            require protocolConfig.protocolTreasury() != currentContract;
            require managerFeeBeneficiary() != currentContract;
        }
    }

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

    ifEffectThenFunction(virtualTokenBalance_new < virtualTokenBalance_old,
        totalPendingFees_old > 0
    );
    assert true;
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

    if (f.selector == configure((uint256,address,address,address)).selector) {
        require (managerFeeBeneficiary() != managerFeeBeneficiary_old ||
            managerFeeRate() != managerFeeRate_old);
    }

    assert virtualTokenBalance_new < virtualTokenBalance_old <=> totalPendingFees_old > 0;
}
