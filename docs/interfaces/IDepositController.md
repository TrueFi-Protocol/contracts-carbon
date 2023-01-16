# interfaces/IDepositController API

## DepositAllowed

<br />

```solidity
struct DepositAllowed {
  enum Status status;
  bool value;
}
```
## IDepositController

Used by TrancheVault contract

<br />

### CeilingChanged

```solidity
event CeilingChanged(uint256 newCeiling)
```

Event emitted when new ceiling is set

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newCeiling | uint256 | New ceiling value |

<br />

### DepositAllowedChanged

```solidity
event DepositAllowedChanged(bool newDepositAllowed, enum Status portfolioStatus)
```

Event emitted when deposits are disabled or enabled for a specific StructuredPortfolio status

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newDepositAllowed | bool | Value indicating whether deposits should be enabled or disabled |
| portfolioStatus | enum Status | StructuredPortfolio status for which changes are applied |

<br />

### DepositFeeRateChanged

```solidity
event DepositFeeRateChanged(uint256 newFeeRate)
```

Event emitted when deposit fee rate is switched

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New deposit fee rate value (in BPS) |

<br />

### LenderVerifierChanged

```solidity
event LenderVerifierChanged(contract ILenderVerifier newLenderVerifier)
```

Event emitted when lender verifier is switched

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newLenderVerifier | contract ILenderVerifier | New lender verifier contract address |

<br />

### MANAGER_ROLE

```solidity
function MANAGER_ROLE() external view returns (bytes32)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | DepositController manager role used for access control |

<br />

### lenderVerifier

```solidity
function lenderVerifier() external view returns (contract ILenderVerifier)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract ILenderVerifier | Address of contract used for checking whether given address is allowed to put funds into an instrument according to implemented strategy |

<br />

### ceiling

```solidity
function ceiling() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Max asset capacity defined for TrancheVaults interracting with DepositController |

<br />

### depositFeeRate

```solidity
function depositFeeRate() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Rate (in BPS) of the fee applied to the deposit amount |

<br />

### depositAllowed

```solidity
function depositAllowed(enum Status status) external view returns (bool)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| status | enum Status | StructuredPortfolio status |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Value indicating whether deposits are allowed when related StructuredPortfolio is in given status |

<br />

### initialize

```solidity
function initialize(address manager, address lenderVerfier, uint256 _depositFeeRate, uint256 ceiling) external
```

Setup contract with given params

Used by Initializable contract (can be called only once)

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| manager | address | Address to which MANAGER_ROLE should be granted |
| lenderVerfier | address | Address of LenderVerifier contract |
| _depositFeeRate | uint256 | Deposit fee rate (in BPS) |
| ceiling | uint256 | Ceiling value |

<br />

### maxDeposit

```solidity
function maxDeposit(address receiver) external view returns (uint256 assets)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Shares receiver address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Max assets amount that can be deposited with TrancheVault shares minted to given receiver |

<br />

### maxMint

```solidity
function maxMint(address receiver) external view returns (uint256 shares)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Shares receiver address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Max TrancheVault shares amount given address can receive |

<br />

### previewDeposit

```solidity
function previewDeposit(uint256 assets) external view returns (uint256 shares)
```

Simulates deposit assets conversion including fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Tested assets amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares amount that can be obtained from the given assets amount |

<br />

### previewMint

```solidity
function previewMint(uint256 shares) external view returns (uint256 assets)
```

Simulates mint shares conversion including fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Tested shares amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Assets amount that needs to be deposited to obtain given shares amount |

<br />

### onDeposit

```solidity
function onDeposit(address sender, uint256 assets, address receiver) external returns (uint256 shares, uint256 depositFee)
```

Simulates deposit result

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Supposed deposit transaction sender address |
| assets | uint256 | Supposed assets amount |
| receiver | address | Supposed shares receiver address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares amount that can be obtained from the deposit with given params |
| depositFee | uint256 | Fee for a deposit with given params |

<br />

### onMint

```solidity
function onMint(address sender, uint256 shares, address receiver) external returns (uint256 assets, uint256 mintFee)
```

Simulates mint result

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Supposed mint transaction sender address |
| shares | uint256 | Supposed shares amount |
| receiver | address | Supposed shares receiver address |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Assets amount that needs to be provided to execute mint with given params |
| mintFee | uint256 | Fee for a mint with given params |

<br />

### setCeiling

```solidity
function setCeiling(uint256 newCeiling) external
```

Ceiling setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newCeiling | uint256 | New ceiling value |

<br />

### setDepositAllowed

```solidity
function setDepositAllowed(bool newDepositAllowed, enum Status portfolioStatus) external
```

Deposit allowed setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newDepositAllowed | bool | Value indicating whether deposits should be allowed when related StructuredPortfolio is in given status |
| portfolioStatus | enum Status | StructuredPortfolio status for which changes are applied |

<br />

### setDepositFeeRate

```solidity
function setDepositFeeRate(uint256 newFeeRate) external
```

Deposit fee rate setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New deposit fee rate (in BPS) |

<br />

### setLenderVerifier

```solidity
function setLenderVerifier(contract ILenderVerifier newLenderVerifier) external
```

Lender verifier setter

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newLenderVerifier | contract ILenderVerifier | New LenderVerifer contract address |

<br />

### configure

```solidity
function configure(uint256 newCeiling, uint256 newFeeRate, contract ILenderVerifier newLenderVerifier, struct DepositAllowed newDepositAllowed) external
```

Allows to change ceiling, deposit fee rate, lender verifier and enable or disable deposits at once

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newCeiling | uint256 | New ceiling value |
| newFeeRate | uint256 | New deposit fee rate (in BPS) |
| newLenderVerifier | contract ILenderVerifier | New LenderVerifier contract address |
| newDepositAllowed | struct DepositAllowed | New deposit allowed settings |

<br />

