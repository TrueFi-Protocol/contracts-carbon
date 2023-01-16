# interfaces/IDebtInstrument API

## IDebtInstrument

<br />

### endDate

```solidity
function endDate(uint256 instrumentId) external view returns (uint256)
```

<br />

### repay

```solidity
function repay(uint256 instrumentId, uint256 amount) external returns (uint256 principalRepaid, uint256 interestRepaid)
```

<br />

### start

```solidity
function start(uint256 instrumentId) external
```

<br />

### cancel

```solidity
function cancel(uint256 instrumentId) external
```

<br />

### markAsDefaulted

```solidity
function markAsDefaulted(uint256 instrumentId) external
```

<br />

### issueInstrumentSelector

```solidity
function issueInstrumentSelector() external pure returns (bytes4)
```

<br />

### updateInstrumentSelector

```solidity
function updateInstrumentSelector() external pure returns (bytes4)
```

<br />

