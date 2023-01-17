import "TrancheVault.spec"

rule updateCheckpointUpdatesTimestamp() {
    uint256 timestamp;

    env e;
    require e.block.timestamp == timestamp;
    updateCheckpoint(e);

    uint256 checkpointTimestamp;
    _, _, checkpointTimestamp = getCheckpoint();

    assert checkpointTimestamp == timestamp;
}

rule checkpointSetsProtocolFeeRateToFeeRateFromProtocolConfig() {
    env e;
    updateCheckpoint(e);

    uint256 checkpointProtocolFeeRate;
    _, checkpointProtocolFeeRate, _ = getCheckpoint();

    env e1;
    require e1.msg.sender == currentContract;
    assert checkpointProtocolFeeRate == protocolConfig.protocolFeeRate(e1);
}

rule onlyCheckpointFunctionsChangeProtocolFeeRate(method f) {
    uint256 checkpointProtocolFeeRate_old;
    _, checkpointProtocolFeeRate_old, _ = getCheckpoint();

    env e;
    callFunction(f, e);

    uint256 checkpointProtocolFeeRate_new;
    _, checkpointProtocolFeeRate_new, _ = getCheckpoint();

    ifEffectThenFunction(checkpointProtocolFeeRate_old != checkpointProtocolFeeRate_new,
        isCheckpointFunction(f)
    );
    assert true;
}

rule onceSetProtocolFeeRateIsChangedOnlyByCallsToProtocolConfig(method f) {
    env e1;
    updateCheckpoint(e1);

    uint256 checkpointProtocolFeeRate_old;
    _, checkpointProtocolFeeRate_old, _ = getCheckpoint();

    env e;
    callFunction(f, e);

    env e2;
    updateCheckpoint(e2);

    uint256 checkpointProtocolFeeRate_new;
    _, checkpointProtocolFeeRate_new, _ = getCheckpoint();

    ifEffectThenFunction(checkpointProtocolFeeRate_old != checkpointProtocolFeeRate_new,
        isProtocolConfigHarnessFunction(f)
    );
    assert true;
}

rule updateCheckpointDecreasesPendingProtocolFeeInClosed() {
    uint256 timestamp;

    require virtualTokenBalance() > 0;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 pendingProtocolFee_old = pendingProtocolFee(e1);
    require pendingProtocolFee_old > 0;

    env e;
    require e.block.timestamp == timestamp;
    updateCheckpoint(e);

    env e2;
    require e2.block.timestamp == timestamp;
    uint256 pendingProtocolFee_new = pendingProtocolFee(e2);

    assert pendingProtocolFee_new < pendingProtocolFee_old;
}

rule updateCheckpointDecreasesPendingManagerFeeInClosed() {
    uint256 timestamp;

    require virtualTokenBalance() > 0;

    env e1;
    require e1.block.timestamp == timestamp;
    uint256 pendingManagerFee_old = pendingManagerFee(e1);
    require pendingManagerFee_old > 0;

    env e2;
    require e2.block.timestamp == timestamp;
    uint256 pendingProtocolFee = pendingProtocolFee(e2);
    require pendingProtocolFee == 0;

    env e;
    require e.block.timestamp == timestamp;
    updateCheckpoint(e);

    env e3;
    require e3.block.timestamp == timestamp;
    uint256 pendingManagerFee_new = pendingManagerFee(e3);

    assert pendingManagerFee_new < pendingManagerFee_old;
}
