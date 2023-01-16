# LoansManager API

## LoansManager

<br />

### fixedInterestOnlyLoans

```solidity
contract IFixedInterestOnlyLoans fixedInterestOnlyLoans
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### asset

```solidity
contract IERC20WithDecimals asset
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### activeLoanIds

```solidity
uint256[] activeLoanIds
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### issuedLoanIds

```solidity
mapping(uint256 => bool) issuedLoanIds
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### onERC721Received

```solidity
function onERC721Received(address, address, uint256, bytes) external pure returns (bytes4)
```

<br />

