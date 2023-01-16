# interfaces/ITrancheVault API

## SizeRange

<br />

```solidity
struct SizeRange {
  uint256 floor;
  uint256 ceiling;
}
```
## Checkpoint

<br />

```solidity
struct Checkpoint {
  uint256 totalAssets;
  uint256 protocolFeeRate;
  uint256 timestamp;
}
```
## Configuration

<br />

```solidity
struct Configuration {
  uint256 managerFeeRate;
  address managerFeeBeneficiary;
  contract IDepositController depositController;
  contract IWithdrawController withdrawController;
  contract ITransferController transferController;
}
```
## ITrancheVault

<br />

### CheckpointUpdated

```solidity
event CheckpointUpdated(uint256 totalAssets, uint256 protocolFeeRate)
```

Event emitted when checkpoint is changed

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAssets | uint256 | Tranche total assets at the moment of checkpoint creation |
| protocolFeeRate | uint256 | Protocol fee rate at the moment of checkpoint creation |

<br />

### ProtocolFeePaid

```solidity
event ProtocolFeePaid(address protocolAddress, uint256 fee)
```

Event emitted when fee is transfered to protocol

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| protocolAddress | address | Address to which protocol fees are transfered |
| fee | uint256 | Fee amount paid to protocol |

<br />

### ManagerFeePaid

```solidity
event ManagerFeePaid(address managerFeeBeneficiary, uint256 fee)
```

Event emitted when fee is transfered to manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| managerFeeBeneficiary | address | Address to which manager fees are transfered |
| fee | uint256 | Fee amount paid to protocol |

<br />

### ManagerFeeRateChanged

```solidity
event ManagerFeeRateChanged(uint256 newManagerFeeRate)
```

Event emitted when manager fee rate is changed by the manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newManagerFeeRate | uint256 | New fee rate |

<br />

### ManagerFeeBeneficiaryChanged

```solidity
event ManagerFeeBeneficiaryChanged(address newManagerFeeBeneficiary)
```

Event emitted when manager fee beneficiary is changed by the manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newManagerFeeBeneficiary | address | New beneficiary address to which manager fee will be transferred |

<br />

### DepositControllerChanged

```solidity
event DepositControllerChanged(contract IDepositController newController)
```

Event emitted when new DepositController address is set

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract IDepositController | New DepositController address |

<br />

### WithdrawControllerChanged

```solidity
event WithdrawControllerChanged(contract IWithdrawController newController)
```

Event emitted when new WithdrawController address is set

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract IWithdrawController | New WithdrawController address |

<br />

### TransferControllerChanged

```solidity
event TransferControllerChanged(contract ITransferController newController)
```

Event emitted when new TransferController address is set

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract ITransferController | New TransferController address |

<br />

### MANAGER_ROLE

```solidity
function MANAGER_ROLE() external view returns (bytes32)
```

Tranche manager role used for access control

<br />

### TRANCHE_CONTROLLER_OWNER_ROLE

```solidity
function TRANCHE_CONTROLLER_OWNER_ROLE() external view returns (bytes32)
```

Role used to access tranche controllers setters

<br />

### portfolio

```solidity
function portfolio() external view returns (contract IStructuredPortfolio)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IStructuredPortfolio | Associated StructuredPortfolio address |

<br />

### depositController

```solidity
function depositController() external view returns (contract IDepositController)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IDepositController | Address of DepositController contract responsible for deposit-related operations on TrancheVault |

<br />

### withdrawController

```solidity
function withdrawController() external view returns (contract IWithdrawController)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IWithdrawController | Address of WithdrawController contract responsible for withdraw-related operations on TrancheVault |

<br />

### transferController

```solidity
function transferController() external view returns (contract ITransferController)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract ITransferController | Address of TransferController contract deducing whether a specific transfer is allowed or not |

<br />

### waterfallIndex

```solidity
function waterfallIndex() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | TrancheVault index in StructuredPortfolio tranches order |

<br />

### managerFeeRate

```solidity
function managerFeeRate() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Annual rate of continuous fee accrued on every block on the top of checkpoint tranche total assets (expressed in bps) |

<br />

### managerFeeBeneficiary

```solidity
function managerFeeBeneficiary() external view returns (address)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Address to which manager fee should be transferred |

<br />

### protocolConfig

```solidity
function protocolConfig() external view returns (contract IProtocolConfig)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | contract IProtocolConfig | Address of ProtocolConfig contract used to collect protocol fee |

<br />

### setDepositController

```solidity
function setDepositController(contract IDepositController newController) external
```

DepositController address setter

Can be executed only by TrancheVault manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract IDepositController | New DepositController address |

<br />

### setWithdrawController

```solidity
function setWithdrawController(contract IWithdrawController newController) external
```

WithdrawController address setter

Can be executed only by TrancheVault manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract IWithdrawController | New WithdrawController address |

<br />

### setTransferController

```solidity
function setTransferController(contract ITransferController newController) external
```

TransferController address setter

Can be executed only by TrancheVault manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract ITransferController | New TransferController address |

<br />

### setPortfolio

```solidity
function setPortfolio(contract IStructuredPortfolio _portfolio) external
```

Sets address of StructuredPortfolio associated with TrancheVault

Can be executed only once

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _portfolio | contract IStructuredPortfolio | StructuredPortfolio address |

<br />

### setManagerFeeRate

```solidity
function setManagerFeeRate(uint256 newFeeRate) external
```

Manager fee rate setter

Can be executed only by TrancheVault manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New manager fee rate (expressed in bps) |

<br />

### setManagerFeeBeneficiary

```solidity
function setManagerFeeBeneficiary(address newBeneficiary) external
```

Manager fee beneficiary setter

Can be executed only by TrancheVault manager

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newBeneficiary | address | New manager fee beneficiary address |

<br />

### initialize

```solidity
function initialize(string _name, string _symbol, contract IERC20WithDecimals _token, contract IDepositController _depositController, contract IWithdrawController _withdrawController, contract ITransferController _transferController, contract IProtocolConfig _protocolConfig, uint256 _waterfallIndex, address manager, uint256 _managerFeeRate) external
```

Setup contract with given params

Used by Initializable contract (can be called only once)

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | Contract name |
| _symbol | string | Contract symbol |
| _token | contract IERC20WithDecimals | Address of ERC20 token used by TrancheVault |
| _depositController | contract IDepositController | Address of DepositController contract responsible for deposit-related operations on TrancheVault |
| _withdrawController | contract IWithdrawController | Address of WithdrawController contract responsible for withdraw-related operations on TrancheVault |
| _transferController | contract ITransferController | Address of TransferController contract deducing whether a specific transfer is allowed or not |
| _protocolConfig | contract IProtocolConfig | Address of ProtocolConfig contract storing TrueFi protocol-related data |
| _waterfallIndex | uint256 | TrancheVault index in StructuredPortfolio tranches order |
| manager | address | Address on which MANAGER_ROLE is granted |
| _managerFeeRate | uint256 | Annual rate of continuous fee accrued on every block on the top of checkpoint tranche total assets (expressed in bps) |

<br />

### updateCheckpoint

```solidity
function updateCheckpoint() external
```

Updates TrancheVault checkpoint with current total assets and pays pending fees

<br />

### updateCheckpointFromPortfolio

```solidity
function updateCheckpointFromPortfolio(uint256 _totalAssets) external
```

Updates TrancheVault checkpoint with total assets value calculated in StructuredPortfolio waterfall
@dev
- can be executed only by associated StructuredPortfolio
- is used by StructuredPortfolio only in Live portfolio status

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _totalAssets | uint256 | Total assets amount to save in the checkpoint |

<br />

### totalAssetsBeforeFees

```solidity
function totalAssetsBeforeFees() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total tranche assets including accrued but yet not paid fees |

<br />

### totalPendingFees

```solidity
function totalPendingFees() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of all unpaid fees and fees accrued since last checkpoint update |

<br />

### totalPendingFeesForAssets

```solidity
function totalPendingFeesForAssets(uint256 amount) external view returns (uint256)
```

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Asset amount with which fees should be calculated |

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of all unpaid fees and fees accrued on the given amount since last checkpoint update |

<br />

### pendingProtocolFee

```solidity
function pendingProtocolFee() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of unpaid protocol fees and protocol fees accrued since last checkpoint update |

<br />

### pendingManagerFee

```solidity
function pendingManagerFee() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of unpaid manager fees and manager fees accrued since last checkpoint update |

<br />

### getCheckpoint

```solidity
function getCheckpoint() external view returns (struct Checkpoint checkpoint)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| checkpoint | struct Checkpoint | Checkpoint tracking info about TrancheVault total assets and protocol fee rate at last checkpoint update, and timestamp of that update |

<br />

### unpaidProtocolFee

```solidity
function unpaidProtocolFee() external view returns (uint256 protocolFee)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| protocolFee | uint256 | Remembered value of fee unpaid to protocol due to insufficient TrancheVault funds at the moment of transfer |

<br />

### unpaidManagerFee

```solidity
function unpaidManagerFee() external view returns (uint256)
```

#####Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | managerFee Remembered value of fee unpaid to manager due to insufficient TrancheVault funds at the moment of transfer |

<br />

### onPortfolioStart

```solidity
function onPortfolioStart() external
```

Initializes TrancheVault checkpoint and transfers all TrancheVault assets to associated StructuredPortfolio
@dev
- can be executed only by associated StructuredPortfolio
- called by associated StructuredPortfolio on transition to Live status

<br />

### onTransfer

```solidity
function onTransfer(uint256 assets) external
```

Updates virtualTokenBalance and checkpoint after transferring assets from StructuredPortfolio to TrancheVault

Can be executed only by associated StructuredPortfolio

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Transferred assets amount |

<br />

### convertToSharesCeil

```solidity
function convertToSharesCeil(uint256 assets) external view returns (uint256)
```

Converts given amount of token assets to TrancheVault LP tokens at the current price, without respecting fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of assets to convert |

<br />

### convertToAssetsCeil

```solidity
function convertToAssetsCeil(uint256 shares) external view returns (uint256)
```

Converts given amount of TrancheVault LP tokens to token assets at the current price, without respecting fees

#####Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of TrancheVault LP tokens to convert |

<br />

### configure

```solidity
function configure(struct Configuration newConfiguration) external
```

Allows to change managerFeeRate, managerFeeBeneficiary, depositController and withdrawController

Can be executed only by TrancheVault manager

<br />

