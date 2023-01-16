# interfaces/ITransferController API

## ITransferController

<br />

### initialize

```solidity
function initialize(address manager) external
```

Setup contract with given params

Used by Initializable contract (can be called only once)

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| manager | address | Address to which MANAGER_ROLE should be granted |

<br />

### onTransfer

```solidity
function onTransfer(address sender, address from, address to, uint256 value) external view returns (bool isTransferAllowed)
```

Verifies TrancheVault shares transfers

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Transfer transaction sender address |
| from | address | Transferred funds owner address |
| to | address | Transferred funds recipient address |
| value | uint256 | Transferred assets amount |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| isTransferAllowed | bool | Value indicating whether TrancheVault shares transfer with given params is allowed |

<br />

