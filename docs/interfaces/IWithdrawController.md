# interfaces/IWithdrawController API

## WithdrawAllowed

<br />

```solidity
struct WithdrawAllowed {
  enum Status status;
  bool value;
}
```
## IWithdrawController

Used by TrancheVault contract

<br />

### FloorChanged

```solidity
event FloorChanged(uint256 newFloor)
```

Event emitted when new floor is set

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFloor | uint256 | New floor value |

<br />

### WithdrawAllowedChanged

```solidity
event WithdrawAllowedChanged(bool newWithdrawAllowed, enum Status portfolioStatus)
```

Event emitted when withdrawals are disabled or enabled for a specific StructuredPortfolio status

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newWithdrawAllowed | bool | Value indicating whether withdrawals should be enabled or disabled |
| portfolioStatus | enum Status | StructuredPortfolio status for which changes are applied |

<br />

### WithdrawFeeRateChanged

```solidity
event WithdrawFeeRateChanged(uint256 newFeeRate)
```

Event emitted when withdraw fee rate is switched

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New withdraw fee rate value (in BPS) |

<br />

### MANAGER_ROLE

```solidity
function MANAGER_ROLE() external view returns (bytes32)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | WithdrawController manager role used for access control |

<br />

### floor

```solidity
function floor() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Min assets amount that needs to stay in TrancheVault interracting with WithdrawController when related StructuredPortfolio is not in Closed state |

<br />

### withdrawFeeRate

```solidity
function withdrawFeeRate() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Rate (in BPS) of the fee applied to the withdraw amount |

<br />

### withdrawAllowed

```solidity
function withdrawAllowed(enum Status status) external view returns (bool)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| status | enum Status | StructuredPortfolio status |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Value indicating whether withdrawals are allowed when related StructuredPortfolio is in given status |

<br />

### initialize

```solidity
function initialize(address manager, uint256 withdrawFeeRate, uint256 floor) external
```

Setup contract with given params

Used by Initializable contract (can be called only once)

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| manager | address | Address to which MANAGER_ROLE should be granted |
| withdrawFeeRate | uint256 | Withdraw fee rate (in BPS) |
| floor | uint256 | Floor value |

<br />

### maxWithdraw

```solidity
function maxWithdraw(address owner) external view returns (uint256 assets)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Shares owner address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Max assets amount that can be withdrawn from TrancheVault for shares of given owner |

<br />

### maxRedeem

```solidity
function maxRedeem(address owner) external view returns (uint256 shares)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Shares owner address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Max TrancheVault shares amount given owner can burn to withdraw assets |

<br />

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) external view returns (uint256 shares)
```

Simulates withdraw assets conversion including fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Tested assets amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares amount that needs to be burnt to obtain given assets amount |

<br />

### previewRedeem

```solidity
function previewRedeem(uint256 shares) external view returns (uint256 assets)
```

Simulates redeem shares conversion including fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Tested shares amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Assets amount that will be obtained from the given shares burnt |

<br />

### onWithdraw

```solidity
function onWithdraw(address sender, uint256 assets, address receiver, address owner) external returns (uint256 shares, uint256 withdrawFee)
```

Simulates withdraw result

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Supposed withdraw transaction sender address |
| assets | uint256 | Supposed assets amount |
| receiver | address | Supposed assets receiver address |
| owner | address | Supposed shares owner |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares amount that needs to be burnt to make a withdrawal with given params |
| withdrawFee | uint256 | Fee for a withdrawal with given params |

<br />

### onRedeem

```solidity
function onRedeem(address sender, uint256 shares, address receiver, address owner) external returns (uint256 assets, uint256 redeemFee)
```

Simulates redeem result

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Supposed redeem transaction sender address |
| shares | uint256 | Supposed shares amount |
| receiver | address | Supposed assets receiver address |
| owner | address | Supposed shares owner |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Assets amount that will be obtained from the redeem with given params |
| redeemFee | uint256 | Fee for a redeem with given params |

<br />

### setFloor

```solidity
function setFloor(uint256 newFloor) external
```

Floor setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFloor | uint256 | New floor value |

<br />

### setWithdrawAllowed

```solidity
function setWithdrawAllowed(bool newWithdrawAllowed, enum Status portfolioStatus) external
```

Withdraw allowed setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newWithdrawAllowed | bool | Value indicating whether withdrawals should be allowed when related StructuredPortfolio is in given status |
| portfolioStatus | enum Status | StructuredPortfolio status for which changes are applied |

<br />

### setWithdrawFeeRate

```solidity
function setWithdrawFeeRate(uint256 newFeeRate) external
```

Withdraw fee rate setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New withdraw fee rate (in BPS) |

<br />

### configure

```solidity
function configure(uint256 newFloor, uint256 newFeeRate, struct WithdrawAllowed newWithdrawAllowed) external
```

Allows to change floor, withdraw fee rate and enable or disable withdrawals at once

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFloor | uint256 | New floor value |
| newFeeRate | uint256 | New withdraw fee rate (in BPS) |
| newWithdrawAllowed | struct WithdrawAllowed | New withdraw allowed settings |

<br />

