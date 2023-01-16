# StructuredPortfolioFactory API

## StructuredPortfolioFactory

<br />

### WHITELISTED_MANAGER_ROLE

```solidity
bytes32 WHITELISTED_MANAGER_ROLE
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### portfolios

```solidity
contract IStructuredPortfolio[] portfolios
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### trancheImplementation

```solidity
address trancheImplementation
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### portfolioImplementation

```solidity
address portfolioImplementation
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### protocolConfig

```solidity
contract IProtocolConfig protocolConfig
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### constructor

```solidity
constructor(address _portfolioImplementation, address _trancheImplementation, contract IProtocolConfig _protocolConfig) public
```

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

