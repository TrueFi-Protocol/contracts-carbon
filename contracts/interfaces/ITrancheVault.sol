// SPDX-License-Identifier: BUSL-1.1
// Business Source License 1.1
// License text copyright (c) 2017 MariaDB Corporation Ab, All Rights Reserved. "Business Source License" is a trademark of MariaDB Corporation Ab.

// Parameters
// Licensor: TrueFi Foundation Ltd.
// Licensed Work: Structured Credit Vaults. The Licensed Work is (c) 2022 TrueFi Foundation Ltd.
// Additional Use Grant: Any uses listed and defined at this [LICENSE](https://github.com/trusttoken/contracts-carbon/license.md)
// Change Date: December 31, 2025
// Change License: MIT

pragma solidity ^0.8.16;

import {IERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC4626Upgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDepositController} from "./IDepositController.sol";
import {IWithdrawController} from "./IWithdrawController.sol";
import {ITransferController} from "./ITransferController.sol";
import {IStructuredPortfolio} from "./IStructuredPortfolio.sol";
import {IProtocolConfig} from "./IProtocolConfig.sol";
import {IERC20WithDecimals} from "./IERC20WithDecimals.sol";

struct SizeRange {
    uint256 floor;
    uint256 ceiling;
}

struct Checkpoint {
    uint256 totalAssets;
    uint256 protocolFeeRate;
    uint256 timestamp;
}

struct Configuration {
    uint256 managerFeeRate;
    address managerFeeBeneficiary;
    IDepositController depositController;
    IWithdrawController withdrawController;
    ITransferController transferController;
}

interface ITrancheVault is IERC4626Upgradeable, IERC165 {
    /**
     * @notice Event emitted when checkpoint is changed
     * @param totalAssets Tranche total assets at the moment of checkpoint creation
     * @param protocolFeeRate Protocol fee rate at the moment of checkpoint creation
     */
    event CheckpointUpdated(uint256 totalAssets, uint256 protocolFeeRate);

    /**
     * @notice Event emitted when fee is transfered to protocol
     * @param protocolAddress Address to which protocol fees are transfered
     * @param fee Fee amount paid to protocol
     */
    event ProtocolFeePaid(address indexed protocolAddress, uint256 fee);

    /**
     * @notice Event emitted when fee is transfered to manager
     * @param managerFeeBeneficiary Address to which manager fees are transfered
     * @param fee Fee amount paid to protocol
     */
    event ManagerFeePaid(address indexed managerFeeBeneficiary, uint256 fee);

    /**
     * @notice Event emitted when manager fee rate is changed by the manager
     * @param newManagerFeeRate New fee rate
     */
    event ManagerFeeRateChanged(uint256 newManagerFeeRate);

    /**
     * @notice Event emitted when manager fee beneficiary is changed by the manager
     * @param newManagerFeeBeneficiary New beneficiary address to which manager fee will be transferred
     */
    event ManagerFeeBeneficiaryChanged(address newManagerFeeBeneficiary);

    event DepositControllerChanged(IDepositController indexed newController);

    event WithdrawControllerChanged(IWithdrawController indexed newController);

    event TransferControllerChanged(ITransferController indexed newController);

    /// @dev Tranche manager role used for access control
    function MANAGER_ROLE() external view returns (bytes32);

    /// @dev Role used to access tranche controllers setters
    function TRANCHE_CONTROLLER_OWNER_ROLE() external view returns (bytes32);

    /**
     * @return Associated StructuredPortfolio address
     */
    function portfolio() external view returns (IStructuredPortfolio);

    /**
     * @return Address of DepositController contract responsible for deposit-related operations on TrancheVault
     */
    function depositController() external view returns (IDepositController);

    /**
     * @return Address of WithdrawController contract responsible for withdraw-related operations on TrancheVault
     */
    function withdrawController() external view returns (IWithdrawController);

    /**
     * @return Address of TransferController contract deducing whether a specific transfer is allowed or not
     */
    function transferController() external view returns (ITransferController);

    /**
     * @return TrancheVault index in StructuredPortfolio tranches order
     */
    function waterfallIndex() external view returns (uint256);

    /**
     * @return Annual rate of continuous fee accrued on every block on the top of checkpoint tranche total assets (expressed in bps)
     */
    function managerFeeRate() external view returns (uint256);

    /**
     * @return Address to which manager fee should be transferred
     */
    function managerFeeBeneficiary() external view returns (address);

    function protocolConfig() external view returns (IProtocolConfig);

    /**
     * @notice DepositController address setter
     * @dev Can be executed only by TrancheVault manager
     * @param newController New DepositController address
     */
    function setDepositController(IDepositController newController) external;

    /**
     * @notice WithdrawController address setter
     * @dev Can be executed only by TrancheVault manager
     * @param newController New WithdrawController address
     */
    function setWithdrawController(IWithdrawController newController) external;

    /**
     * @notice TransferController address setter
     * @dev Can be executed only by TrancheVault manager
     * @param newController New TransferController address
     */
    function setTransferController(ITransferController newController) external;

    /**
     * @notice Sets address of StructuredPortfolio associated with TrancheVault
     * @dev Can be executed only once
     * @param _portfolio StructuredPortfolio address
     */
    function setPortfolio(IStructuredPortfolio _portfolio) external;

    /**
     * @notice Manager fee rate setter
     * @dev Can be executed only by TrancheVault manager
     * @param newFeeRate New manager fee rate (expressed in bps)
     */
    function setManagerFeeRate(uint256 newFeeRate) external;

    /**
     * @notice Manager fee beneficiary setter
     * @dev Can be executed only by TrancheVault manager
     * @param newBeneficiary New manager fee beneficiary address
     */
    function setManagerFeeBeneficiary(address newBeneficiary) external;

    /**
     * @notice Setup contract with given params
     * @dev Used by Initializable contract (can be called only once)
     * @param _name Contract name
     * @param _symbol Contract symbol
     * @param _token Address of ERC20 token used by TrancheVault
     * @param _depositController Address of DepositController contract responsible for deposit-related operations on TrancheVault
     * @param _withdrawController Address of WithdrawController contract responsible for withdraw-related operations on TrancheVault
     * @param _transferController Address of TransferController contract deducing whether a specific transfer is allowed or not
     * @param _protocolConfig Address of ProtocolConfig contract storing TrueFi protocol-related data
     * @param _waterfallIndex TrancheVault index in StructuredPortfolio tranches order
     * @param manager Address on which MANAGER_ROLE is granted
     * @param _managerFeeRate Annual rate of continuous fee accrued on every block on the top of checkpoint tranche total assets (expressed in bps)
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        IERC20WithDecimals _token,
        IDepositController _depositController,
        IWithdrawController _withdrawController,
        ITransferController _transferController,
        IProtocolConfig _protocolConfig,
        uint256 _waterfallIndex,
        address manager,
        uint256 _managerFeeRate
    ) external;

    /**
     * @notice Updates TrancheVault checkpoint with current total assets and pays pending fees
     */
    function updateCheckpoint() external;

    /**
     * @notice Updates TrancheVault checkpoint with total assets value calculated in StructuredPortfolio waterfall
     * @dev
     * - can be executed only by associated StructuredPortfolio
     * - can be executed only in Live portfolio status
     * @param _totalAssets Total assets amount to save in the checkpoint
     */
    function updateCheckpointFromPortfolio(uint256 _totalAssets) external;

    /**
     * @return Total tranche assets including accrued but yet not paid fees
     */
    function totalAssetsBeforeFees() external view returns (uint256);

    /**
     * @return Sum of all unpaid fees and fees accrued since last checkpoint update
     */
    function totalPendingFees() external view returns (uint256);

    /**
     * @return Sum of all unpaid fees and fees accrued on the given amount since last checkpoint update
     * @param amount Asset amount with which fees should be calculated
     */
    function totalPendingFees(uint256 amount) external view returns (uint256);

    function pendingProtocolFee() external view returns (uint256);

    function pendingManagerFee() external view returns (uint256);

    /**
     * @return Sum of continuous protocol and manager fees accrued on every block on the top of checkpoint tranche total assets since last checkpoint update
     */
    function totalAccruedFees() external view returns (uint256);

    /**
     * @return checkpoint Checkpoint tracking info about TrancheVault total assets and protocol fee rate at last checkpoint update, and timestamp of that update
     */
    function getCheckpoint() external view returns (Checkpoint memory checkpoint);

    /**
     * @return protocolFee Remembered value of fee unpaid to protocol due to insufficient TrancheVault funds at the moment of transfer
     */
    function unpaidProtocolFee() external view returns (uint256 protocolFee);

    /**
     * @return managerFee Remembered value of fee unpaid to manager due to insufficient TrancheVault funds at the moment of transfer
     */
    function unpaidManagerFee() external view returns (uint256);

    /**
     * @notice Initializes TrancheVault checkpoint and transfers all TrancheVault assets to associated StructuredPortfolio
     * @dev
     * - can be executed only by associated StructuredPortfolio
     * - called by associated StructuredPortfolio on transition to Live status
     */
    function onPortfolioStart() external;

    /**
     * @notice Updates virtualTokenBalance and checkpoint after transferring assets from StructuredPortfolio to TrancheVault
     * @dev Can be executed only by associated StructuredPortfolio
     * @param assets Transferred assets amount
     */
    function onTransfer(uint256 assets) external;

    /**
     * @notice Converts given amount of token assets to TrancheVault LP tokens at the current price, without respecting fees
     * @param assets Amount of assets to convert
     */
    function convertToSharesCeil(uint256 assets) external view returns (uint256);

    /**
     * @notice Converts given amount of TrancheVault LP tokens to token assets at the current price, without respecting fees
     * @param shares Amount of TrancheVault LP tokens to convert
     */
    function convertToAssetsCeil(uint256 shares) external view returns (uint256);

    /**
     * @notice Allows to change managerFeeRate, managerFeeBeneficiary, depositController and withdrawController
     * @dev Can be executed only by TrancheVault manager
     */
    function configure(Configuration memory newConfiguration) external;
}
