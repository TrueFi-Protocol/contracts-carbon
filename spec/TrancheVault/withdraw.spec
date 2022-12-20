import "TrancheVault.spec"

rule withdrawBurnsOwnersSharesWhenIncreasingReceiversAssets() {
    address receiver;
    address owner;

    uint256 ownerSharesBalance_old = balanceOf(owner);
    uint256 receiverAssetsBalance_old = token.balanceOf(receiver);

    env e;
    withdraw(e, _, receiver, owner);

    uint256 ownerSharesBalance_new = balanceOf(owner);
    uint256 receiverAssetsBalance_new = token.balanceOf(receiver);

    require receiverAssetsBalance_new > receiverAssetsBalance_old;

    assert ownerSharesBalance_new < ownerSharesBalance_old;
}
