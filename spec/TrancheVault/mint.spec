import "TrancheVault.spec"

rule mintDecreasesSenderAssetsWhenMintingShares() {
    address receiver;
    address sender;

    // TODO: to be removed
    require sender != protocolConfig.protocolTreasury();
    require sender != managerFeeBeneficiary();

    uint256 receiverSharesBalance_old = balanceOf(receiver);
    uint256 senderAssetsBalance_old = token.balanceOf(sender);

    env e;
    require e.msg.sender == sender;
    mint(e, _, receiver);

    uint256 receiverSharesBalance_new = balanceOf(receiver);
    uint256 senderAssetsBalance_new = token.balanceOf(sender);
    
    require receiverSharesBalance_new > receiverSharesBalance_old;

    assert senderAssetsBalance_new < senderAssetsBalance_old;
}
