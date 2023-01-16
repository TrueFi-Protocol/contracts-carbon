# TrancheVault API

## TrancheVault

<br />

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
```

Tranche manager role used for access control

<br />

### TRANCHE_CONTROLLER_OWNER_ROLE

```solidity
bytes32 TRANCHE_CONTROLLER_OWNER_ROLE
```

Role used to access tranche controllers setters

<br />

### portfolio

```solidity
contract IStructuredPortfolio portfolio
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### depositController

```solidity
contract IDepositController depositController
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### withdrawController

```solidity
contract IWithdrawController withdrawController
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### transferController

```solidity
contract ITransferController transferController
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### protocolConfig

```solidity
contract IProtocolConfig protocolConfig
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### waterfallIndex

```solidity
uint256 waterfallIndex
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### unpaidProtocolFee

```solidity
uint256 unpaidProtocolFee
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### unpaidManagerFee

```solidity
uint256 unpaidManagerFee
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### managerFeeBeneficiary

```solidity
address managerFeeBeneficiary
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### managerFeeRate

```solidity
uint256 managerFeeRate
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |

<br />

### virtualTokenBalance

```solidity
uint256 virtualTokenBalance
```

<br />

### constructor

```solidity
constructor() public
```

<br />

### initialize

```solidity
function initialize(string _name, string _symbol, contract IERC20WithDecimals _token, contract IDepositController _depositController, contract IWithdrawController _withdrawController, contract ITransferController _transferController, contract IProtocolConfig _protocolConfig, uint256 _waterfallIndex, address manager, uint256 _managerFeeRate) external
```

Setup contract with given params

Used by Initializable contract (can be called only once)

##### Arguments
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

### decimals

```solidity
function decimals() public view virtual returns (uint8)
```

<br />

### asset

```solidity
function asset() external view returns (address)
```

Returns the address of the underlying token used for the Vault for accounting, depositing, and withdrawing.

- MUST be an ERC-20 token contract.
- MUST NOT revert.

<br />

### totalAssets

```solidity
function totalAssets() public view virtual returns (uint256)
```

Returns the total amount of the underlying asset that is “managed” by Vault.

- SHOULD include any compounding that occurs from yield.
- MUST be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT revert.

<br />

### totalAssetsBeforeFees

```solidity
function totalAssetsBeforeFees() public view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total tranche assets including accrued but yet not paid fees |

<br />

### convertToShares

```solidity
function convertToShares(uint256 assets) public view returns (uint256)
```

Returns the amount of shares that the Vault would exchange for the amount of assets provided, in an ideal
scenario where all the conditions are met.

- MUST NOT be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT show any variations depending on the caller.
- MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.
- MUST NOT revert.

NOTE: This calculation MAY NOT reflect the “per-user” price-per-share, and instead should reflect the
“average-user’s” price-per-share, meaning what the average user should expect to see when exchanging to and
from.

<br />

### convertToSharesCeil

```solidity
function convertToSharesCeil(uint256 assets) public view returns (uint256)
```

Converts given amount of token assets to TrancheVault LP tokens at the current price, without respecting fees

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of assets to convert |

<br />

### convertToAssets

```solidity
function convertToAssets(uint256 shares) public view returns (uint256)
```

Returns the amount of assets that the Vault would exchange for the amount of shares provided, in an ideal
scenario where all the conditions are met.

- MUST NOT be inclusive of any fees that are charged against assets in the Vault.
- MUST NOT show any variations depending on the caller.
- MUST NOT reflect slippage or other on-chain conditions, when performing the actual exchange.
- MUST NOT revert.

NOTE: This calculation MAY NOT reflect the “per-user” price-per-share, and instead should reflect the
“average-user’s” price-per-share, meaning what the average user should expect to see when exchanging to and
from.

<br />

### convertToAssetsCeil

```solidity
function convertToAssetsCeil(uint256 shares) public view returns (uint256)
```

Converts given amount of TrancheVault LP tokens to token assets at the current price, without respecting fees

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of TrancheVault LP tokens to convert |

<br />

### maxDeposit

```solidity
function maxDeposit(address receiver) external view returns (uint256)
```

Returns the maximum amount of the underlying asset that can be deposited into the Vault for the receiver,
through a deposit call.

- MUST return a limited value if receiver is subject to some deposit limit.
- MUST return 2 ** 256 - 1 if there is no limit on the maximum amount of assets that may be deposited.
- MUST NOT revert.

<br />

### previewDeposit

```solidity
function previewDeposit(uint256 assets) public view returns (uint256)
```

Allows an on-chain or off-chain user to simulate the effects of their deposit at the current block, given
current on-chain conditions.

- MUST return as close to and no more than the exact amount of Vault shares that would be minted in a deposit
  call in the same transaction. I.e. deposit should return the same or more shares as previewDeposit if called
  in the same transaction.
- MUST NOT account for deposit limits like those returned from maxDeposit and should always act as though the
  deposit would be accepted, regardless if the user has enough tokens approved, etc.
- MUST be inclusive of deposit fees. Integrators should be aware of the existence of deposit fees.
- MUST NOT revert.

NOTE: any unfavorable discrepancy between convertToShares and previewDeposit SHOULD be considered slippage in
share price or some other type of condition, meaning the depositor will lose assets by depositing.

<br />

### deposit

```solidity
function deposit(uint256 amount, address receiver) external returns (uint256)
```

<br />

### maxMint

```solidity
function maxMint(address receiver) external view returns (uint256)
```

Returns the maximum amount of the Vault shares that can be minted for the receiver, through a mint call.
- MUST return a limited value if receiver is subject to some mint limit.
- MUST return 2 ** 256 - 1 if there is no limit on the maximum amount of shares that may be minted.
- MUST NOT revert.

<br />

### previewMint

```solidity
function previewMint(uint256 shares) public view returns (uint256)
```

Allows an on-chain or off-chain user to simulate the effects of their mint at the current block, given
current on-chain conditions.

- MUST return as close to and no fewer than the exact amount of assets that would be deposited in a mint call
  in the same transaction. I.e. mint should return the same or fewer assets as previewMint if called in the
  same transaction.
- MUST NOT account for mint limits like those returned from maxMint and should always act as though the mint
  would be accepted, regardless if the user has enough tokens approved, etc.
- MUST be inclusive of deposit fees. Integrators should be aware of the existence of deposit fees.
- MUST NOT revert.

NOTE: any unfavorable discrepancy between convertToAssets and previewMint SHOULD be considered slippage in
share price or some other type of condition, meaning the depositor will lose assets by minting.

<br />

### mint

```solidity
function mint(uint256 shares, address receiver) external returns (uint256)
```

Mints exactly shares Vault shares to receiver by depositing amount of underlying tokens.

- MUST emit the Deposit event.
- MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the mint
  execution, and are accounted for during mint.
- MUST revert if all of shares cannot be minted (due to deposit limit being reached, slippage, the user not
  approving enough underlying tokens to the Vault contract, etc).

NOTE: most implementations will require pre-approval of the Vault with the Vault’s underlying asset token.

<br />

### _maxWithdraw

```solidity
function _maxWithdraw(address owner) public view returns (uint256)
```

<br />

### maxWithdraw

```solidity
function maxWithdraw(address owner) external view returns (uint256)
```

Returns the maximum amount of the underlying asset that can be withdrawn from the owner balance in the
Vault, through a withdraw call.

- MUST return a limited value if owner is subject to some withdrawal limit or timelock.
- MUST NOT revert.

<br />

### previewWithdraw

```solidity
function previewWithdraw(uint256 assets) public view returns (uint256)
```

Allows an on-chain or off-chain user to simulate the effects of their withdrawal at the current block,
given current on-chain conditions.

- MUST return as close to and no fewer than the exact amount of Vault shares that would be burned in a withdraw
  call in the same transaction. I.e. withdraw should return the same or fewer shares as previewWithdraw if
  called
  in the same transaction.
- MUST NOT account for withdrawal limits like those returned from maxWithdraw and should always act as though
  the withdrawal would be accepted, regardless if the user has enough shares, etc.
- MUST be inclusive of withdrawal fees. Integrators should be aware of the existence of withdrawal fees.
- MUST NOT revert.

NOTE: any unfavorable discrepancy between convertToShares and previewWithdraw SHOULD be considered slippage in
share price or some other type of condition, meaning the depositor will lose assets by depositing.

<br />

### withdraw

```solidity
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)
```

Burns shares from owner and sends exactly assets of underlying tokens to receiver.

- MUST emit the Withdraw event.
- MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
  withdraw execution, and are accounted for during withdraw.
- MUST revert if all of assets cannot be withdrawn (due to withdrawal limit being reached, slippage, the owner
  not having enough shares, etc).

Note that some implementations will require pre-requesting to the Vault before a withdrawal may be performed.
Those methods should be performed separately.

<br />

### _maxRedeem

```solidity
function _maxRedeem(address owner) public view returns (uint256)
```

<br />

### maxRedeem

```solidity
function maxRedeem(address owner) external view returns (uint256)
```

Returns the maximum amount of Vault shares that can be redeemed from the owner balance in the Vault,
through a redeem call.

- MUST return a limited value if owner is subject to some withdrawal limit or timelock.
- MUST return balanceOf(owner) if owner is not subject to any withdrawal limit or timelock.
- MUST NOT revert.

<br />

### previewRedeem

```solidity
function previewRedeem(uint256 shares) public view returns (uint256)
```

Allows an on-chain or off-chain user to simulate the effects of their redeemption at the current block,
given current on-chain conditions.

- MUST return as close to and no more than the exact amount of assets that would be withdrawn in a redeem call
  in the same transaction. I.e. redeem should return the same or more assets as previewRedeem if called in the
  same transaction.
- MUST NOT account for redemption limits like those returned from maxRedeem and should always act as though the
  redemption would be accepted, regardless if the user has enough shares, etc.
- MUST be inclusive of withdrawal fees. Integrators should be aware of the existence of withdrawal fees.
- MUST NOT revert.

NOTE: any unfavorable discrepancy between convertToAssets and previewRedeem SHOULD be considered slippage in
share price or some other type of condition, meaning the depositor will lose assets by redeeming.

<br />

### redeem

```solidity
function redeem(uint256 shares, address receiver, address owner) external returns (uint256)
```

Burns exactly shares from owner and sends assets of underlying tokens to receiver.

- MUST emit the Withdraw event.
- MAY support an additional flow in which the underlying tokens are owned by the Vault contract before the
  redeem execution, and are accounted for during redeem.
- MUST revert if all of shares cannot be redeemed (due to withdrawal limit being reached, slippage, the owner
  not having enough shares, etc).

NOTE: some implementations will require pre-requesting to the Vault before a withdrawal may be performed.
Those methods should be performed separately.

<br />

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceID) public view returns (bool)
```

<br />

### getCheckpoint

```solidity
function getCheckpoint() external view returns (struct Checkpoint)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct Checkpoint |  |

<br />

### configure

```solidity
function configure(struct Configuration newConfiguration) external
```

Allows to change managerFeeRate, managerFeeBeneficiary, depositController and withdrawController

Can be executed only by TrancheVault manager

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

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Transferred assets amount |

<br />

### updateCheckpoint

```solidity
function updateCheckpoint() external
```

Updates TrancheVault checkpoint with current total assets and pays pending fees

<br />

### updateCheckpointFromPortfolio

```solidity
function updateCheckpointFromPortfolio(uint256 newTotalAssets) external
```

<br />

### totalPendingFees

```solidity
function totalPendingFees() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of all unpaid fees and fees accrued since last checkpoint update |

<br />

### totalPendingFeesForAssets

```solidity
function totalPendingFeesForAssets(uint256 _totalAssetsBeforeFees) public view returns (uint256)
```

<br />

### pendingProtocolFee

```solidity
function pendingProtocolFee() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of unpaid protocol fees and protocol fees accrued since last checkpoint update |

<br />

### pendingManagerFee

```solidity
function pendingManagerFee() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Sum of unpaid manager fees and manager fees accrued since last checkpoint update |

<br />

### setDepositController

```solidity
function setDepositController(contract IDepositController newController) public
```

DepositController address setter

Can be executed only by TrancheVault manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract IDepositController | New DepositController address |

<br />

### setWithdrawController

```solidity
function setWithdrawController(contract IWithdrawController newController) public
```

WithdrawController address setter

Can be executed only by TrancheVault manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract IWithdrawController | New WithdrawController address |

<br />

### setTransferController

```solidity
function setTransferController(contract ITransferController newController) public
```

TransferController address setter

Can be executed only by TrancheVault manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | contract ITransferController | New TransferController address |

<br />

### setManagerFeeRate

```solidity
function setManagerFeeRate(uint256 _managerFeeRate) public
```

<br />

### setManagerFeeBeneficiary

```solidity
function setManagerFeeBeneficiary(address _managerFeeBeneficiary) public
```

<br />

### setPortfolio

```solidity
function setPortfolio(contract IStructuredPortfolio _portfolio) external
```

Sets address of StructuredPortfolio associated with TrancheVault

Can be executed only once

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _portfolio | contract IStructuredPortfolio | StructuredPortfolio address |

<br />

