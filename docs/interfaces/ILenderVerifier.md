# interfaces/ILenderVerifier API

## ILenderVerifier

Used by DepositController

<br />

### isAllowed

```solidity
function isAllowed(address lender) external view returns (bool)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| lender | address | Address of lender to verify |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Value indicating whether given lender address is allowed to put funds into an instrument or not |

<br />

