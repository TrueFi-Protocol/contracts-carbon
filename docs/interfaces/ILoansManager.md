# interfaces/ILoansManager API

## AddLoanParams

<br />

```solidity
struct AddLoanParams {
  uint256 principal;
  uint16 periodCount;
  uint256 periodPayment;
  uint32 periodDuration;
  address recipient;
  uint32 gracePeriod;
  bool canBeRepaidAfterDefault;
}
```
## ILoansManager

<br />

### LoanAdded

```solidity
event LoanAdded(uint256 loanId)
```

Event emitted when the loan is added

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |

<br />

### LoanFunded

```solidity
event LoanFunded(uint256 loanId)
```

Event emitted when the loan is funded

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |

<br />

### LoanRepaid

```solidity
event LoanRepaid(uint256 loanId, uint256 amount)
```

Event emitted when the loan is repaid

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |
| amount | uint256 | Repaid amount |

<br />

### LoanDefaulted

```solidity
event LoanDefaulted(uint256 loanId)
```

Event emitted when the loan is marked as defaulted

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |

<br />

### LoanGracePeriodUpdated

```solidity
event LoanGracePeriodUpdated(uint256 loanId, uint32 newGracePeriod)
```

Event emitted when the loan grace period is updated

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |
| newGracePeriod | uint32 | New loan grace period |

<br />

### LoanCancelled

```solidity
event LoanCancelled(uint256 loanId)
```

Event emitted when the loan is cancelled

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |

<br />

### ActiveLoanRemoved

```solidity
event ActiveLoanRemoved(uint256 loanId)
```

Event emitted when the loan is fully repaid, cancelled or defaulted

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |

<br />

### fixedInterestOnlyLoans

```solidity
function fixedInterestOnlyLoans() external view returns (contract IFixedInterestOnlyLoans)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IFixedInterestOnlyLoans | FixedInterestOnlyLoans contract address |

<br />

### asset

```solidity
function asset() external view returns (contract IERC20WithDecimals)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IERC20WithDecimals | Underlying asset address |

<br />

### activeLoanIds

```solidity
function activeLoanIds(uint256 index) external view returns (uint256)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | Index of loan in array |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Loan id |

<br />

### issuedLoanIds

```solidity
function issuedLoanIds(uint256 loanId) external view returns (bool)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| loanId | uint256 | Loan id |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Value indicating whether loan with given id was issued by this contract |

<br />

