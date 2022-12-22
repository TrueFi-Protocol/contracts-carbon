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

import {ILenderVerifier} from "../interfaces/ILenderVerifier.sol";
import {Status} from "../interfaces/IStructuredPortfolio.sol";

struct DepositAllowed {
    /// @dev StructuredPortfolio status for which deposits should be enabled or disabled
    Status status;
    /// @dev Value indicating whether deposits should be enabled or disabled
    bool value;
}

/**
 * @title Contract for managing deposit related settings
 * @dev Used by TrancheVault contract
 */
interface IDepositController {
    /**
     * @notice Event emitted when new ceiling is set
     * @param newCeiling New ceiling value
     */
    event CeilingChanged(uint256 newCeiling);

    /**
     * @notice Event emitted when deposits are disabled or enabled for a specific StructuredPortfolio status
     * @param newDepositAllowed Value indicating whether deposits should be enabled or disabled
     * @param portfolioStatus StructuredPortfolio status for which changes are applied
     */
    event DepositAllowedChanged(bool newDepositAllowed, Status portfolioStatus);

    /**
     * @notice Event emitted when deposit fee rate is switched
     * @param newFeeRate New deposit fee rate value (in BPS)
     */
    event DepositFeeRateChanged(uint256 newFeeRate);

    /**
     * @notice Event emitted when lender verifier is switched
     * @param newLenderVerifier New lender verifier contract address
     */
    event LenderVerifierChanged(ILenderVerifier indexed newLenderVerifier);

    /// @return DepositController manager role used for access control
    function MANAGER_ROLE() external view returns (bytes32);

    /// @return Address of contract used for checking whether given address is allowed to put funds into an instrument according to implemented strategy
    function lenderVerifier() external view returns (ILenderVerifier);

    /// @return Max asset capacity defined for TrancheVaults interracting with DepositController
    function ceiling() external view returns (uint256);

    /// @return Rate (in BPS) of the fee applied to the deposit amount
    function depositFeeRate() external view returns (uint256);

    /// @return Value indicating whether deposits are allowed when related StructuredPortfolio is in given status
    /// @param status StructuredPortfolio status
    function depositAllowed(Status status) external view returns (bool);

    /**
     * @notice Setup contract with given params
     * @dev Used by Initializable contract (can be called only once)
     * @param manager Address to which MANAGER_ROLE should be granted
     * @param lenderVerfier Address of LenderVerifier contract
     * @param _depositFeeRate Deposit fee rate (in BPS)
     * @param ceiling Ceiling value
     */
    function initialize(
        address manager,
        address lenderVerfier,
        uint256 _depositFeeRate,
        uint256 ceiling
    ) external;

    /**
     * @return assets Max assets amount that can be deposited with TrancheVault shares minted to given receiver
     * @param receiver Shares receiver address
     */
    function maxDeposit(address receiver) external view returns (uint256 assets);

    /**
     * @return shares Max TrancheVault shares amount given address can receive
     * @param receiver Shares receiver address
     */
    function maxMint(address receiver) external view returns (uint256 shares);

    /**
     * @notice Simulates deposit assets conversion including fees
     * @return shares Shares amount that can be obtained from the given assets amount
     * @param assets Tested assets amount
     */
    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    /**
     * @notice Simulates mint shares conversion including fees
     * @return assets Assets amount that needs to be deposited to obtain given shares amount
     * @param shares Tested shares amount
     */
    function previewMint(uint256 shares) external view returns (uint256 assets);

    /**
     * @notice Simulates deposit result
     * @return shares Shares amount that can be obtained from the deposit with given params
     * @return depositFee Fee for a deposit with given params
     * @param sender Supposed deposit transaction sender address
     * @param assets Supposed assets amount
     * @param receiver Supposed shares receiver address
     */
    function onDeposit(
        address sender,
        uint256 assets,
        address receiver
    ) external returns (uint256 shares, uint256 depositFee);

    /**
     * @notice Simulates mint result
     * @return assets Assets amount that needs to be provided to execute mint with given params
     * @return mintFee Fee for a mint with given params
     * @param sender Supposed mint transaction sender address
     * @param shares Supposed shares amount
     * @param receiver Supposed shares receiver address
     */
    function onMint(
        address sender,
        uint256 shares,
        address receiver
    ) external returns (uint256 assets, uint256 mintFee);

    /**
     * @notice Ceiling setter
     * @param newCeiling New ceiling value
     */
    function setCeiling(uint256 newCeiling) external;

    /**
     * @notice Deposit allowed setter
     * @param newDepositAllowed Value indicating whether deposits should be allowed when related StructuredPortfolio is in given status
     * @param portfolioStatus StructuredPortfolio status for which changes are applied
     */
    function setDepositAllowed(bool newDepositAllowed, Status portfolioStatus) external;

    /**
     * @notice Deposit fee rate setter
     * @param newFeeRate New deposit fee rate (in BPS)
     */
    function setDepositFeeRate(uint256 newFeeRate) external;

    /**
     * @notice Lender verifier setter
     * @param newLenderVerifier New LenderVerifer contract address
     */
    function setLenderVerifier(ILenderVerifier newLenderVerifier) external;

    /**
     * @notice Allows to change ceiling, deposit fee rate, lender verifier and enable or disable deposits at once
     * @param newCeiling New ceiling value
     * @param newFeeRate New deposit fee rate (in BPS)
     * @param newLenderVerifier New LenderVerifier contract address
     * @param newDepositAllowed New deposit allowed settings
     */
    function configure(
        uint256 newCeiling,
        uint256 newFeeRate,
        ILenderVerifier newLenderVerifier,
        DepositAllowed memory newDepositAllowed
    ) external;
}
