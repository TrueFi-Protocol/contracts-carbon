# interfaces/IStructuredPortfolio API

## Status

<br />

```solidity
enum Status {
  CapitalFormation,
  Live,
  Closed
}
```
## LoansDeficitCheckpoint

<br />

```solidity
struct LoansDeficitCheckpoint {
  uint256 deficit;
  uint256 timestamp;
}
```
## TrancheData

<br />

```solidity
struct TrancheData {
  uint128 targetApy;
  uint128 minSubordinateRatio;
  uint256 distributedAssets;
  uint256 maxValueOnClose;
  struct LoansDeficitCheckpoint loansDeficitCheckpoint;
}
```
## TrancheInitData

<br />

```solidity
struct TrancheInitData {
  contract ITrancheVault tranche;
  uint128 targetApy;
  uint128 minSubordinateRatio;
}
```
## PortfolioParams

<br />

```solidity
struct PortfolioParams {
  string name;
  uint256 duration;
  uint256 capitalFormationPeriod;
  uint256 minimumSize;
}
```
## ExpectedEquityRate

<br />

```solidity
struct ExpectedEquityRate {
  uint256 from;
  uint256 to;
}
```
## IStructuredPortfolio

Portfolio consists of multiple tranches, each offering a different yield for the lender
based on the respective risk.

<br />

### PortfolioInitialized

```solidity
event PortfolioInitialized(contract ITrancheVault[] tranches)
```

Event emitted when portfolio is initialized

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| tranches | contract ITrancheVault[] | Array of tranches addresses |

<br />

### PortfolioStatusChanged

```solidity
event PortfolioStatusChanged(enum Status newStatus)
```

Event emitted when portfolio status is changed

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newStatus | enum Status | Portfolio status set |

<br />

### CheckpointUpdated

```solidity
event CheckpointUpdated(uint256[] totalAssets, uint256[] protocolFeeRates)
```

Event emitted when tranches checkpoint is changed

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAssets | uint256[] | New values of tranches |
| protocolFeeRates | uint256[] | New protocol fee rates for each tranche |

<br />

### MANAGER_ROLE

```solidity
function MANAGER_ROLE() external view returns (bytes32)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Portfolio manager role used for access control |

<br />

### name

```solidity
function name() external view returns (string)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | Name of the StructuredPortfolio |

<br />

### status

```solidity
function status() external view returns (enum Status)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | enum Status | Current portfolio status |

<br />

### startDate

```solidity
function startDate() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Timestamp of block in which StructuredPortfolio was switched to Live phase |

<br />

### endDate

```solidity
function endDate() external view returns (uint256)
```

Returns expected end date or actual end date if portfolio was closed prematurely.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The date by which the manager is supposed to close the portfolio. |

<br />

### startDeadline

```solidity
function startDeadline() external view returns (uint256)
```

Timestamp after which anyone can close the portfolio if it's in capital formation.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The date by which the manager is supposed to launch the portfolio. |

<br />

### minimumSize

```solidity
function minimumSize() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Minimum sum of all tranches assets required to be met to switch StructuredPortfolio to Live phase |

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

### calculateWaterfall

```solidity
function calculateWaterfall() external view returns (uint256[])
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
function calculateWaterfallWithoutFees() external view returns (uint256[])
```

Distributes portfolio value among tranches respecting their target apys, but not fees.
Returns zeros for CapitalFormation and Closed portfolio status.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | Array of current tranche values (with pending fees not deducted) |

<br />

### calculateWaterfallForTranche

```solidity
function calculateWaterfallForTranche(uint256 trancheIndex) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIndex | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Current value of tranche in Live status, 0 for other statuses |

<br />

### calculateWaterfallForTrancheWithoutFee

```solidity
function calculateWaterfallForTrancheWithoutFee(uint256 trancheIndex) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIndex | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Current value of tranche (with pending fees not deducted) in Live status, 0 for other statuses |

<br />

### initialize

```solidity
function initialize(address manager, contract IERC20WithDecimals underlyingToken, contract IFixedInterestOnlyLoans fixedInterestOnlyLoans, contract IProtocolConfig _protocolConfig, struct PortfolioParams portfolioParams, struct TrancheInitData[] tranchesInitData, struct ExpectedEquityRate _expectedEquityRate) external
```

Setup contract with given params

Used by Initializable contract (can be called only once)

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| manager | address | Address on which MANAGER_ROLE is granted |
| underlyingToken | contract IERC20WithDecimals | Address of ERC20 token used by portfolio |
| fixedInterestOnlyLoans | contract IFixedInterestOnlyLoans | Address of FixedInterestOnlyLoans contract |
| _protocolConfig | contract IProtocolConfig | Address of ProtocolConfig contract |
| portfolioParams | struct PortfolioParams | Parameters to configure portfolio |
| tranchesInitData | struct TrancheInitData[] | Parameters to configure tranches |
| _expectedEquityRate | struct ExpectedEquityRate | APY range that is expected to be reached by Equity tranche |

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
function getTrancheData(uint256) external view returns (struct TrancheData)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct TrancheData | i-th tranche data |

<br />

### updateCheckpoints

```solidity
function updateCheckpoints() external
```

Updates checkpoints on each tranche and pay pending fees

Can be executed only in Live status

<br />

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total value locked in the contract including yield from outstanding loans |

<br />

### liquidAssets

```solidity
function liquidAssets() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Underlying token balance of portfolio reduced by pending fees |

<br />

### loansValue

```solidity
function loansValue() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of current values of all active loans |

<br />

### totalPendingFees

```solidity
function totalPendingFees() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of all unsettled fees that tranches should pay |

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

### virtualTokenBalance

```solidity
function virtualTokenBalance() external view returns (uint256)
```

Virtual value of the portfolio

<br />

### increaseVirtualTokenBalance

```solidity
function increaseVirtualTokenBalance(uint256 delta) external
```

Increase virtual portfolio value

Must be called by a tranche

<br />

### decreaseVirtualTokenBalance

```solidity
function decreaseVirtualTokenBalance(uint256 delta) external
```

Decrease virtual portfolio value

Must be called by a tranche

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

