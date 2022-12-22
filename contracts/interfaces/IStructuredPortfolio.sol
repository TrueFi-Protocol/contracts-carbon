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

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import {ITrancheVault} from "./ITrancheVault.sol";
import {ILoansManager, AddLoanParams} from "./ILoansManager.sol";
import {IFixedInterestOnlyLoans} from "./IFixedInterestOnlyLoans.sol";
import {IERC20WithDecimals} from "./IERC20WithDecimals.sol";
import {IProtocolConfig} from "./IProtocolConfig.sol";

uint256 constant BASIS_PRECISION = 10000;
uint256 constant YEAR = 365 days;

enum Status {
    CapitalFormation,
    Live,
    Closed
}

struct LoansDeficitCheckpoint {
    /// @dev Tranche missing funds due to defaulted loans
    uint256 deficit;
    /// @dev Timestamp of checkpoint
    uint256 timestamp;
}

struct TrancheData {
    /// @dev The APY expected to be granted at the end of the portfolio Live phase (in BPS)
    uint128 targetApy;
    /// @dev The minimum required ratio of the sum of subordinate tranches assets to the tranche assets (in BPS)
    uint128 minSubordinateRatio;
    /// @dev The amount of assets transferred to the tranche after close() was called
    uint256 distributedAssets;
    /// @dev The potential maximum amount of tranche assets available for withdraw after close() was called
    uint256 maxValueOnClose;
    /// @dev Checkpoint tracking how many assets should be returned to the tranche due to defaulted loans
    LoansDeficitCheckpoint loansDeficitCheckpoint;
}

struct TrancheInitData {
    /// @dev Address of the tranche vault
    ITrancheVault tranche;
    /// @dev The APY expected to be granted at the end of the portfolio Live phase (in BPS)
    uint128 targetApy;
    /// @dev The minimum ratio of the sum of subordinate tranches assets to the tranche assets (in BPS)
    uint128 minSubordinateRatio;
}

struct PortfolioParams {
    /// @dev Portfolio name
    string name;
    /// @dev Portfolio duration in seconds
    uint256 duration;
    /// @dev Capital formation period in seconds, used to calculate portfolio start deadline
    uint256 capitalFormationPeriod;
    /// @dev Minimum deposited amount needed to start the portfolio
    uint256 minimumSize;
}

struct ExpectedEquityRate {
    /// @dev Minimum expected APY on tranche 0 (expressed in bps)
    uint256 from;
    /// @dev Maximum expected APY on tranche 0 (expressed in bps)
    uint256 to;
}

/**
 * @title Structured Portfolio used for obtaining funds and managing loans
 * @notice Portfolio consists of multiple tranches, each offering a different yield for the lender
 * based on the respective risk.
 */

interface IStructuredPortfolio is IAccessControlUpgradeable {
    /**
     * @notice Event emitted when portfolio is initialized
     * @param tranches Array of tranches addresses
     */
    event PortfolioInitialized(ITrancheVault[] tranches);

    /**
     * @notice Event emitted when portfolio status is changed
     * @param newStatus Portfolio status set
     */
    event PortfolioStatusChanged(Status newStatus);

    /**
     * @notice Event emitted when tranches checkpoint is changed
     * @param totalAssets New values of tranches
     * @param protocolFeeRates New protocol fee rates for each tranche
     */
    event CheckpointUpdated(uint256[] totalAssets, uint256[] protocolFeeRates);

    /// @return Portfolio manager role used for access control
    function MANAGER_ROLE() external view returns (bytes32);

    /// @return Name of the StructuredPortfolio
    function name() external view returns (string memory);

    /// @return Current portfolio status
    function status() external view returns (Status);

    /// @return Timestamp of block in which StructuredPortfolio was switched to Live phase
    function startDate() external view returns (uint256);

    /**
     * @dev Returns expected end date or actual end date if portfolio was closed prematurely.
     * @return The date by which the manager is supposed to close the portfolio.
     */
    function endDate() external view returns (uint256);

    /**
     * @dev Timestamp after which anyone can close the portfolio if it's in capital formation.
     * @return The date by which the manager is supposed to launch the portfolio.
     */
    function startDeadline() external view returns (uint256);

    /// @return Minimum sum of all tranches assets required to be met to switch StructuredPortfolio to Live phase
    function minimumSize() external view returns (uint256);

    /**
     * @notice Launches the portfolio making it possible to issue loans.
     * @dev
     * - reverts if tranches ratios and portfolio min size are not met,
     * - changes status to `Live`,
     * - sets `startDate` and `endDate`,
     * - transfers assets obtained in tranches to the portfolio.
     */
    function start() external;

    /**
     * @notice Closes the portfolio, making it possible to withdraw funds from tranche vaults.
     * @dev
     * - reverts if there are any active loans before end date,
     * - changes status to `Closed`,
     * - calculates waterfall values for tranches and transfers the funds to the vaults,
     * - updates `endDate`.
     */
    function close() external;

    /**
     * @notice Distributes portfolio value among tranches respecting their target apys and fees.
     * Returns zeros for CapitalFormation and Closed portfolio status.
     * @return Array of current tranche values
     */
    function calculateWaterfall() external view returns (uint256[] memory);

    /**
     * @notice Distributes portfolio value among tranches respecting their target apys, but not fees.
     * Returns zeros for CapitalFormation and Closed portfolio status.
     * @return Array of current tranche values (with pending fees not deducted)
     */
    function calculateWaterfallWithoutFees() external view returns (uint256[] memory);

    /**
     * @param trancheIndex Index of tranche
     * @return Current value of tranche in Live status, 0 for other statuses
     */
    function calculateWaterfallForTranche(uint256 trancheIndex) external view returns (uint256);

    /**
     * @param trancheIndex Index of tranche
     * @return Current value of tranche (with pending fees not deducted) in Live status, 0 for other statuses
     */
    function calculateWaterfallForTrancheWithoutFee(uint256 trancheIndex) external view returns (uint256);

    /**
     * @notice Setup contract with given params
     * @dev Used by Initializable contract (can be called only once)
     * @param manager Address on which MANAGER_ROLE is granted
     * @param underlyingToken Address of ERC20 token used by portfolio
     * @param fixedInterestOnlyLoans Address of FixedInterestOnlyLoans contract
     * @param _protocolConfig Address of ProtocolConfig contract
     * @param portfolioParams Parameters to configure portfolio
     * @param tranchesInitData Parameters to configure tranches
     * @param _expectedEquityRate APY range that is expected to be reached by Equity tranche
     */
    function initialize(
        address manager,
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans fixedInterestOnlyLoans,
        IProtocolConfig _protocolConfig,
        PortfolioParams memory portfolioParams,
        TrancheInitData[] memory tranchesInitData,
        ExpectedEquityRate memory _expectedEquityRate
    ) external;

    /// @return Array of portfolio's tranches addresses
    function getTranches() external view returns (ITrancheVault[] memory);

    /**
     * @notice Updates checkpoints on each tranche and pay pending fees
     * @dev Can be executed only in Live status
     */
    function updateCheckpoints() external;

    /// @return Total value locked in the contract including yield from outstanding loans
    function totalAssets() external view returns (uint256);

    /// @return Underlying token balance of portfolio reduced by pending fees
    function liquidAssets() external view returns (uint256);

    /// @return Sum of current values of all active loans
    function loansValue() external view returns (uint256);

    /// @return Sum of all unsettled fees that tranches should pay
    function totalPendingFees() external view returns (uint256);

    /// @return Array of all active loans' ids
    function getActiveLoans() external view returns (uint256[] memory);

    /**
     * @notice Creates a loan that should be accepted next by the loan recipient
     * @dev
     * - can be executed only by StructuredPortfolio manager
     * - can be executed only in Live status
     */
    function addLoan(AddLoanParams calldata params) external;

    /**
     * @notice Starts a loan with given id and transfers assets to loan recipient
     * @dev
     * - can be executed only by StructuredPortfolio manager
     * - can be executed only in Live status
     * @param loanId Id of the loan that should be started
     */
    function fundLoan(uint256 loanId) external;

    /**
     * @notice Allows sender to repay a loan with given id
     * @dev
     * - cannot be executed in CapitalFormation
     * - can be executed only by loan recipient
     * - automatically calculates amount to repay based on data stored in FixedInterestOnlyLoans contract
     * @param loanId Id of the loan that should be repaid
     */
    function repayLoan(uint256 loanId) external;

    /**
     * @notice Cancels the loan with provided loan id
     * @dev Can be executed only by StructuredPortfolio manager
     * @param loanId Id of the loan to cancel
     */
    function cancelLoan(uint256 loanId) external;

    /**
     * @notice Sets the status of a loan with given id to Defaulted and excludes it from active loans array
     * @dev Can be executed only by StructuredPortfolio manager
     * @param loanId Id of the loan that should be defaulted
     */
    function markLoanAsDefaulted(uint256 loanId) external;

    /**
     * @notice Sets new grace period for the existing loan
     * @dev Can be executed only by StructuredPortfolio manager
     * @param loanId Id of the loan which grace period should be updated
     * @param newGracePeriod New grace period to set (in seconds)
     */
    function updateLoanGracePeriod(uint256 loanId, uint32 newGracePeriod) external;

    /**
     * @notice Virtual value of the portfolio
     */
    function virtualTokenBalance() external view returns (uint256);

    /**
     * @notice Increase virtual portfolio value
     * @dev Must be called by a tranche
     */
    function increaseVirtualTokenBalance(uint256 delta) external;

    /**
     * @notice Decrease virtual portfolio value
     * @dev Must be called by a tranche
     */
    function decreaseVirtualTokenBalance(uint256 delta) external;

    /**
     * @notice Reverts if tranche ratios are not met
     * @param newTotalAssets new total assets value of the tranche calling this function.
     * Is ignored if not called by tranche
     */
    function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external view;
}
