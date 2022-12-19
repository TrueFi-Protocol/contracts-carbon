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

import {IAccessControlEnumerable} from "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";
import {IStructuredPortfolio} from "./IStructuredPortfolio.sol";
import {IProtocolConfig} from "./IProtocolConfig.sol";
import {ITrancheVault} from "./ITrancheVault.sol";
import {IERC20WithDecimals} from "./IERC20WithDecimals.sol";
import {IFixedInterestOnlyLoans} from "./IFixedInterestOnlyLoans.sol";
import {IProtocolConfig} from "./IProtocolConfig.sol";
import {IStructuredPortfolio, TrancheInitData, PortfolioParams, ExpectedEquityRate} from "./IStructuredPortfolio.sol";

struct TrancheData {
    string name;
    string symbol;
    /// @dev Implementation of the controller applied when calling deposit-related functions
    address depositControllerImplementation;
    /// @dev Encoded args with initialize method selector from deposit controller
    bytes depositControllerInitData;
    /// @dev Implementation of the controller applied when calling withdraw-related functions
    address withdrawControllerImplementation;
    /// @dev Encoded args with initialize method selector from withdraw controller
    bytes withdrawControllerInitData;
    /// @dev Implementation of the controller used when calling transfer-related functions
    address transferControllerImplementation;
    /// @dev Encoded args with initialize method selector from transfer controller
    bytes transferControllerInitData;
    /// @dev The APY expected to be granted at the end of the portfolio
    uint128 targetApy;
    /// @dev The minimum ratio of funds obtained in a tranche vault to its subordinate tranches
    uint128 minSubordinateRatio;
    /// @dev Manager fee expressed in BPS
    uint256 managerFeeRate;
}

/**
 * @title A factory for deploying Structured Portfolios
 * @dev Only whitelisted users can create portfolios
 */
interface IStructuredPortfolioFactory is IAccessControlEnumerable {
    function WHITELISTED_MANAGER_ROLE() external view returns (bytes32);

    function portfolios(uint256 portfolioId) external view returns (IStructuredPortfolio);

    function trancheImplementation() external view returns (address);

    function portfolioImplementation() external view returns (address);

    function protocolConfig() external view returns (IProtocolConfig);

    /**
     * @notice Event fired on portfolio creation
     * @param newPortfolio Address of the newly created portfolio
     * @param manager Address of the portfolio manager
     * @param tranches List of adressess of tranche vaults deployed to store assets
     */
    event PortfolioCreated(IStructuredPortfolio indexed newPortfolio, address indexed manager, ITrancheVault[] tranches);

    /**
     * @notice Creates a portfolio alongside with its tranche vaults
     * @dev Tranche vaults are ordered from the most volatile to the most stable
     * @param fixedInterestOnlyLoans Address of a Fixed Intereset Only Loans used for managing loans
     * @param portfolioParams Parameters used for portfolio deployment
     * @param tranchesData Data used for tranche vaults deployment
     */
    function createPortfolio(
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans fixedInterestOnlyLoans,
        PortfolioParams calldata portfolioParams,
        TrancheData[] calldata tranchesData,
        ExpectedEquityRate calldata expectedEquityRate
    ) external;

    /// @return All created portfolios
    function getPortfolios() external view returns (IStructuredPortfolio[] memory);
}
