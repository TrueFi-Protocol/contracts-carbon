# controllers/WithdrawController API

## WithdrawController

<br />

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
```

Manager role used for access control

<br />

### floor

```solidity
uint256 floor
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### withdrawFeeRate

```solidity
uint256 withdrawFeeRate
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### withdrawAllowed

```solidity
mapping(enum Status => bool) withdrawAllowed
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### constructor

```solidity
constructor() public
```

<br />

### initialize

```solidity
function initialize(address manager, uint256 _withdrawFeeRate, uint256 _floor) external
```

<br />

### maxWithdraw

```solidity
function maxWithdraw(address owner) public view returns (uint256)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Shares owner address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### maxRedeem

```solidity
function maxRedeem(address owner) external view returns (uint256)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Shares owner address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### onWithdraw

```solidity
function onWithdraw(address, uint256 assets, address, address) external view returns (uint256, uint256)
```

<br />

### onRedeem

```solidity
function onRedeem(address, uint256 shares, address, address) external view returns (uint256, uint256)
```

<br />

### previewRedeem

```solidity
function previewRedeem(uint256 shares) public view returns (uint256)
```

Simulates redeem shares conversion including fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Tested shares amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) public view returns (uint256)
```

Simulates withdraw assets conversion including fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Tested assets amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### setFloor

```solidity
function setFloor(uint256 newFloor) public
```

Floor setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFloor | uint256 | New floor value |

<br />

### setWithdrawAllowed

```solidity
function setWithdrawAllowed(bool newWithdrawAllowed, enum Status portfolioStatus) public
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
function setWithdrawFeeRate(uint256 newFeeRate) public
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

