import "TrancheVault.spec"

// WARNING: this invariant assumes that there are no tokens transfered
// directy into portfolio, as a result it is unsafe to require it
invariant portfolioTokenBalanceIsEqualPortfolioVirtualTokenBalance()
    token.balanceOf(portfolio) == portfolio.virtualTokenBalance()
    filtered { f -> 
        !isProxyFunction(f) && 
        !f.isFallback && 
        f.selector != onTransfer(uint256).selector &&
        f.selector != tokenTransferHarness(address,address,uint256).selector
    } {
        preserved deposit(uint256 assets, address receiver) with (env e) {
            require managerFeeBeneficiary() != portfolio;
        }
        preserved mint(uint256 shares, address receiver) with (env e) {
            require managerFeeBeneficiary() != portfolio;
        }
    }

invariant portfolioTokenBalanceIsGTEPortfolioVirtualTokenBalance()
    token.balanceOf(portfolio) >= portfolio.virtualTokenBalance()
    filtered { f -> 
        !isProxyFunction(f) && 
        !f.isFallback &&
        f.selector != onTransfer(uint256).selector
    }
