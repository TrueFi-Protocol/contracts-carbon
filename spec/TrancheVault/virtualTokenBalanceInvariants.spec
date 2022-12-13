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
            // TODO: these requires will be moved to contract
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
