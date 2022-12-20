import "TrancheVault.spec"

rule redeemIncreasesReceiversAssetsBalanceWhenBurningOwnersShares() {
    address receiver;
    address owner;

    uint256 ownerSharesBalance_old = balanceOf(owner);
    uint256 receiverAssetsBalance_old = token.balanceOf(receiver);

    env e;
    redeem(e, _, receiver, owner);

    uint256 ownerSharesBalance_new = balanceOf(owner);
    uint256 receiverAssetsBalance_new = token.balanceOf(receiver);

    require ownerSharesBalance_new < ownerSharesBalance_old;

    assert receiverAssetsBalance_new > receiverAssetsBalance_old;
}
