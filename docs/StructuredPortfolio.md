# StructuredPortfolio API

## StructuredPortfolio

<br />

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### protocolConfig

```solidity
contract IProtocolConfig protocolConfig
```

<br />

### status

```solidity
enum Status status
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### name

```solidity
string name
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### endDate

```solidity
uint256 endDate
```

Returns expected end date or actual end date if portfolio was closed prematurely.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### startDate

```solidity
uint256 startDate
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### startDeadline

```solidity
uint256 startDeadline
```

Timestamp after which anyone can close the portfolio if it's in capital formation.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### minimumSize

```solidity
uint256 minimumSize
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### virtualTokenBalance

```solidity
uint256 virtualTokenBalance
```

Virtual value of the portfolio

<br />

### portfolioDuration

```solidity
uint256 portfolioDuration
```

<br />

### tranches

```solidity
contract ITrancheVault[] tranches
```

<br />

### tranchesData

```solidity
struct TrancheData[] tranchesData
```

<br />

### expectedEquityRate

```solidity
struct ExpectedEquityRate expectedEquityRate
```

<br />

### initialize

```solidity
function initialize(address manager, contract IERC20WithDecimals underlyingToken, contract IFixedInterestOnlyLoans _fixedInterestOnlyLoans, contract IProtocolConfig _protocolConfig, struct PortfolioParams portfolioParams, struct TrancheInitData[] tranchesInitData, struct ExpectedEquityRate _expectedEquityRate) external
```

<br />

### getTranches

```solidity
function getTranches() external view returns (contract ITrancheVault[])
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract ITrancheVault[] | Array of portfolio's tranches addresses |

<br />

### getTrancheData

```solidity
function getTrancheData(uint256 i) external view returns (struct TrancheData)
```

<br />

### updateCheckpoints

```solidity
function updateCheckpoints() public
```

Updates checkpoints on each tranche and pay pending fees

Can be executed only in Live status

<br />

### increaseVirtualTokenBalance

```solidity
function increaseVirtualTokenBalance(uint256 increment) external
```

<br />

### decreaseVirtualTokenBalance

```solidity
function decreaseVirtualTokenBalance(uint256 decrement) external
```

<br />

### totalAssets

```solidity
function totalAssets() public view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total value locked in the contract including yield from outstanding loans |

<br />

### liquidAssets

```solidity
function liquidAssets() public view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Underlying token balance of portfolio reduced by pending fees |

<br />

### totalPendingFees

```solidity
function totalPendingFees() public view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of all unsettled fees that tranches should pay |

<br />

### loansValue

```solidity
function loansValue() public view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of current values of all active loans |

<br />

### start

```solidity
function start() external
```

Launches the portfolio making it possible to issue loans.
@dev
- reverts if tranches ratios and portfolio min size are not met,
- changes status to `Live`,
- sets `startDate` and `endDate`,
- transfers assets obtained in tranches to the portfolio.

<br />

### checkTranchesRatiosFromTranche

```solidity
function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external view
```

Reverts if tranche ratios are not met

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newTotalAssets | uint256 | new total assets value of the tranche calling this function. Is ignored if not called by tranche |

<br />

### checkTranchesRatios

```solidity
function checkTranchesRatios() external view
```

<br />

### close

```solidity
function close() external
```

Closes the portfolio, making it possible to withdraw funds from tranche vaults.
@dev
- reverts if there are any active loans before end date,
- changes status to `Closed`,
- calculates waterfall values for tranches and transfers the funds to the vaults,
- updates `endDate`.

<br />

### calculateWaterfallForTranche

```solidity
function calculateWaterfallForTranche(uint256 trancheIdx) external view returns (uint256)
```

<br />

### calculateWaterfallForTrancheWithoutFee

```solidity
function calculateWaterfallForTrancheWithoutFee(uint256 trancheIdx) external view returns (uint256)
```

<br />

### calculateWaterfall

```solidity
function calculateWaterfall() public view returns (uint256[])
```

Distributes portfolio value among tranches respecting their target apys and fees.
Returns zeros for CapitalFormation and Closed portfolio status.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | Array of current tranche values |

<br />

### calculateWaterfallWithoutFees

```solidity
function calculateWaterfallWithoutFees() public view returns (uint256[])
```

Distributes portfolio value among tranches respecting their target apys, but not fees.
Returns zeros for CapitalFormation and Closed portfolio status.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | Array of current tranche values (with pending fees not deducted) |

<br />

### addLoan

```solidity
function addLoan(struct AddLoanParams params) external
```

Creates a loan that should be accepted next by the loan recipient
@dev
- can be executed only by StructuredPortfolio manager
- can be executed only in Live status

<br />

### fundLoan

```solidity
function fundLoan(uint256 loanId) external
```

Starts a loan with given id and transfers assets to loan recipient
@dev
- can be executed only by StructuredPortfolio manager
- can be executed only in Live status

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Id of the loan that should be started |

<br />

### repayLoan

```solidity
function repayLoan(uint256 loanId) external
```

Allows sender to repay a loan with given id
@dev
- cannot be executed in CapitalFormation
- can be executed only by loan recipient
- automatically calculates amount to repay based on data stored in FixedInterestOnlyLoans contract

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Id of the loan that should be repaid |

<br />

### updateLoanGracePeriod

```solidity
function updateLoanGracePeriod(uint256 loanId, uint32 newGracePeriod) external
```

Sets new grace period for the existing loan

Can be executed only by StructuredPortfolio manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Id of the loan which grace period should be updated |
| newGracePeriod | uint32 | New grace period to set (in seconds) |

<br />

### cancelLoan

```solidity
function cancelLoan(uint256 loanId) external
```

Cancels the loan with provided loan id

Can be executed only by StructuredPortfolio manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Id of the loan to cancel |

<br />

### markLoanAsDefaulted

```solidity
function markLoanAsDefaulted(uint256 loanId) external
```

Sets the status of a loan with given id to Defaulted and excludes it from active loans array

Can be executed only by StructuredPortfolio manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Id of the loan that should be defaulted |

<br />

### getActiveLoans

```solidity
function getActiveLoans() external view returns (uint256[])
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | Array of all active loans' ids |

<br />

