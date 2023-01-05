import "TrancheVault.spec"

// WARNING: this invariant assumes that there are no tokens transfered
// directy into portfolio, as a result it is unsafe to require it
invariant tokenBalanceIsEqualVirtualTokenBalance()
    token.balanceOf(currentContract) == virtualTokenBalance()
    filtered { f -> 
        !isProxyFunction(f) && 
        !f.isFallback && 
        f.selector != onTransfer(uint256).selector &&
        f.selector != tokenTransferHarness(address,address,uint256).selector
    } {
        preserved deposit(uint256 assets, address receiver) with (env e) {
            require managerFeeBeneficiary() != currentContract;
        }
        preserved mint(uint256 shares, address receiver) with (env e) {
            require managerFeeBeneficiary() != currentContract;
        }
    }

invariant tokenBalanceIsGTEVirtualTokenBalance()
    token.balanceOf(currentContract) >= virtualTokenBalance()
    filtered { f -> 
        !isProxyFunction(f) && 
        !f.isFallback &&
        f.selector != onTransfer(uint256).selector
    }
