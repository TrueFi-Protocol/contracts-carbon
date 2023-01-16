# interfaces/IStructuredPortfolioFactory API

## TrancheData

<br />

```solidity
struct TrancheData {
  string name;
  string symbol;
  address depositControllerImplementation;
  bytes depositControllerInitData;
  address withdrawControllerImplementation;
  bytes withdrawControllerInitData;
  address transferControllerImplementation;
  bytes transferControllerInitData;
  uint128 targetApy;
  uint128 minSubordinateRatio;
  uint256 managerFeeRate;
}
```
## IStructuredPortfolioFactory

Only whitelisted users can create portfolios

<br />

### WHITELISTED_MANAGER_ROLE

```solidity
function WHITELISTED_MANAGER_ROLE() external view returns (bytes32)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes32 | Whitelisted manager role used for access control, allowing user with this role too create StructuredPortfolio |

<br />

### portfolios

```solidity
function portfolios(uint256 portfolioId) external view returns (contract IStructuredPortfolio)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| portfolioId | uint256 | Id of the portfolio created with this StructuredPortfolioFactory |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IStructuredPortfolio | Address of the StructuredPortfolio with given portfolio id |

<br />

### trancheImplementation

```solidity
function trancheImplementation() external view returns (address)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Address of the Tranche contract implementation used for portfolio deployment |

<br />

### portfolioImplementation

```solidity
function portfolioImplementation() external view returns (address)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Address of the StructuredPortfolio contract implementation used for portfolio deployment |

<br />

### protocolConfig

```solidity
function protocolConfig() external view returns (contract IProtocolConfig)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IProtocolConfig | Address of the ProtocolConfig |

<br />

### PortfolioCreated

```solidity
event PortfolioCreated(contract IStructuredPortfolio newPortfolio, address manager, contract ITrancheVault[] tranches)
```

Event fired on portfolio creation

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newPortfolio | contract IStructuredPortfolio | Address of the newly created portfolio |
| manager | address | Address of the portfolio manager |
| tranches | contract ITrancheVault[] | List of adressess of tranche vaults deployed to store assets |

<br />

### createPortfolio

```solidity
function createPortfolio(contract IERC20WithDecimals underlyingToken, contract IFixedInterestOnlyLoans fixedInterestOnlyLoans, struct PortfolioParams portfolioParams, struct TrancheData[] tranchesData, struct ExpectedEquityRate expectedEquityRate) external
```

Creates a portfolio alongside with its tranche vaults

Tranche vaults are ordered from the most volatile to the most stable

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| underlyingToken | contract IERC20WithDecimals |  |
| fixedInterestOnlyLoans | contract IFixedInterestOnlyLoans | Address of a Fixed Intereset Only Loans used for managing loans |
| portfolioParams | struct PortfolioParams | Parameters used for portfolio deployment |
| tranchesData | struct TrancheData[] | Data used for tranche vaults deployment |
| expectedEquityRate | struct ExpectedEquityRate |  |

<br />

### getPortfolios

```solidity
function getPortfolios() external view returns (contract IStructuredPortfolio[])
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IStructuredPortfolio[] | All created portfolios |

<br />

