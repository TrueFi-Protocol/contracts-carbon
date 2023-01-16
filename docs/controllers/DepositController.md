# controllers/DepositController API

## DepositController

<br />

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
```

Manager role used for access control

<br />

### lenderVerifier

```solidity
contract ILenderVerifier lenderVerifier
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### ceiling

```solidity
uint256 ceiling
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### depositFeeRate

```solidity
uint256 depositFeeRate
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### depositAllowed

```solidity
mapping(enum Status => bool) depositAllowed
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |

##### Returns
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
function initialize(address manager, address _lenderVerifier, uint256 _depositFeeRate, uint256 _ceiling) external
```

<br />

### maxDeposit

```solidity
function maxDeposit(address receiver) public view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Shares receiver address |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### maxMint

```solidity
function maxMint(address receiver) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Shares receiver address |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### onDeposit

```solidity
function onDeposit(address, uint256 assets, address) external view returns (uint256, uint256)
```

<br />

### onMint

```solidity
function onMint(address, uint256 shares, address) external view returns (uint256, uint256)
```

<br />

### previewDeposit

```solidity
function previewDeposit(uint256 assets) public view returns (uint256 shares)
```

Simulates deposit assets conversion including fees

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Tested assets amount |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Shares amount that can be obtained from the given assets amount |

<br />

### previewMint

```solidity
function previewMint(uint256 shares) public view returns (uint256)
```

Simulates mint shares conversion including fees

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Tested shares amount |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 |  |

<br />

### setCeiling

```solidity
function setCeiling(uint256 newCeiling) public
```

Ceiling setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newCeiling | uint256 | New ceiling value |

<br />

### setDepositAllowed

```solidity
function setDepositAllowed(bool newDepositAllowed, enum Status portfolioStatus) public
```

Deposit allowed setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newDepositAllowed | bool | Value indicating whether deposits should be allowed when related StructuredPortfolio is in given status |
| portfolioStatus | enum Status | StructuredPortfolio status for which changes are applied |

<br />

### setDepositFeeRate

```solidity
function setDepositFeeRate(uint256 newFeeRate) public
```

Deposit fee rate setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New deposit fee rate (in BPS) |

<br />

### setLenderVerifier

```solidity
function setLenderVerifier(contract ILenderVerifier newLenderVerifier) public
```

Lender verifier setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newLenderVerifier | contract ILenderVerifier | New LenderVerifer contract address |

<br />

### configure

```solidity
function configure(uint256 newCeiling, uint256 newFeeRate, contract ILenderVerifier newLenderVerifier, struct DepositAllowed newDepositAllowed) external
```

Allows to change ceiling, deposit fee rate, lender verifier and enable or disable deposits at once

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newCeiling | uint256 | New ceiling value |
| newFeeRate | uint256 | New deposit fee rate (in BPS) |
| newLenderVerifier | contract ILenderVerifier | New LenderVerifier contract address |
| newDepositAllowed | struct DepositAllowed | New deposit allowed settings |

<br />

