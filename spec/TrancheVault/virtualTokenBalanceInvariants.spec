import "TrancheVault.spec"

// WARNING: this invariant assumes that there are no tokens transfered
// directy into portfolio, as a result it is unsafe to require it
invariant tokenBalanceIsEqualVirtualTokenBalance()
    virtualTokenBalance() == token.balanceOf(currentContract)
    filtered { f -> 
        !isProxyFunction(f) && 
        !f.isFallback && 
        f.selector != onTransfer(uint256).selector &&
        f.selector != tokenTransferHarness(address,address,uint256).selector
    }

invariant tokenBalanceIsGTEVirtualTokenBalance()
    token.balanceOf(currentContract) >= virtualTokenBalance()
    filtered { f -> 
        !isProxyFunction(f) && 
        !f.isFallback &&
        f.selector != onTransfer(uint256).selector
    }
