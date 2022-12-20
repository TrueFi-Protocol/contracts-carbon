import "TrancheVault.spec"

rule depositIncreasesReceiverSharesWhenDepositingAssets() {
    address receiver;
    address sender;

    uint256 receiverSharesBalance_old = balanceOf(receiver);
    uint256 senderAssetsBalance_old = token.balanceOf(sender);

    env e;
    require e.msg.sender == sender;
    deposit(e, _, receiver);

    uint256 receiverSharesBalance_new = balanceOf(receiver);
    uint256 senderAssetsBalance_new = token.balanceOf(sender);

    require senderAssetsBalance_new < senderAssetsBalance_old;
    
    assert receiverSharesBalance_new > receiverSharesBalance_old;
}
