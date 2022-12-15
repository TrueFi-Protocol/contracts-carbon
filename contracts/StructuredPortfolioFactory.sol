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

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20WithDecimals} from "./interfaces/IERC20WithDecimals.sol";
import {IFixedInterestOnlyLoans} from "./interfaces/IFixedInterestOnlyLoans.sol";
import {IProtocolConfig} from "./interfaces/IProtocolConfig.sol";
import {IStructuredPortfolio, TrancheInitData, PortfolioParams, ExpectedEquityRate} from "./interfaces/IStructuredPortfolio.sol";
import {ITrancheVault} from "./interfaces/ITrancheVault.sol";
import {ProxyWrapper} from "./proxy/ProxyWrapper.sol";

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
contract StructuredPortfolioFactory is AccessControlEnumerable {
    using Address for address;
    bytes32 public constant WHITELISTED_MANAGER_ROLE = keccak256("WHITELISTED_MANAGER_ROLE");

    IStructuredPortfolio[] public portfolios;
    address public immutable trancheImplementation;
    address public immutable portfolioImplementation;
    IProtocolConfig public immutable protocolConfig;

    /**
     * @notice Event fired on portfolio creation
     * @param newPortfolio Address of the newly created portfolio
     * @param manager Address of the portfolio manager
     * @param tranches List of adressess of tranche vaults deployed to store assets
     */
    event PortfolioCreated(IStructuredPortfolio indexed newPortfolio, address indexed manager, ITrancheVault[] tranches);

    /**
     * @dev Grants admin role to message sender, allowing for whitelisting of portfolio managers
     * @dev Portfolio and tranche implementation addresses are stored in order to create proxies
     * @param _portfolioImplementation Portfolio implementation address
     * @param _trancheImplementation Tranche vault implementation address
     * @param _protocolConfig Protocol config address
     */
    constructor(
        address _portfolioImplementation,
        address _trancheImplementation,
        IProtocolConfig _protocolConfig
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        portfolioImplementation = _portfolioImplementation;
        trancheImplementation = _trancheImplementation;
        protocolConfig = _protocolConfig;
    }

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
    ) external {
        require(hasRole(WHITELISTED_MANAGER_ROLE, msg.sender), "SPF: Only whitelisted manager");

        (TrancheInitData[] memory tranchesInitData, ITrancheVault[] memory tranches) = _deployTranches(underlyingToken, tranchesData);

        IStructuredPortfolio newPortfolio = IStructuredPortfolio(
            address(
                new ProxyWrapper(
                    portfolioImplementation,
                    abi.encodeWithSelector(
                        IStructuredPortfolio.initialize.selector,
                        msg.sender,
                        underlyingToken,
                        fixedInterestOnlyLoans,
                        protocolConfig,
                        portfolioParams,
                        tranchesInitData,
                        expectedEquityRate
                    )
                )
            )
        );
        portfolios.push(newPortfolio);

        emit PortfolioCreated(newPortfolio, msg.sender, tranches);
    }

    /**
     * @notice Deploys all tranche vaults for a portfolio
     * @param underlyingToken Token used as an underlying asset
     * @param tranchesData Data used for tranche vaults deployment
     */
    function _deployTranches(IERC20WithDecimals underlyingToken, TrancheData[] calldata tranchesData)
        internal
        returns (TrancheInitData[] memory trancheInitData, ITrancheVault[] memory tranches)
    {
        uint256 tranchesCount = tranchesData.length;
        trancheInitData = new TrancheInitData[](tranchesCount);
        tranches = new ITrancheVault[](tranchesCount);

        for (uint256 i = 0; i < tranchesCount; i++) {
            TrancheData memory trancheData = tranchesData[i];

            address depositController = Clones.clone(trancheData.depositControllerImplementation);
            depositController.functionCall(trancheData.depositControllerInitData);

            address withdrawController = Clones.clone(trancheData.withdrawControllerImplementation);
            withdrawController.functionCall(trancheData.withdrawControllerInitData);

            address transferController = Clones.clone(trancheData.transferControllerImplementation);
            transferController.functionCall(trancheData.transferControllerInitData);

            ITrancheVault tranche = ITrancheVault(
                address(
                    new ProxyWrapper(
                        trancheImplementation,
                        abi.encodeWithSelector(
                            ITrancheVault.initialize.selector,
                            trancheData.name,
                            trancheData.symbol,
                            underlyingToken,
                            depositController,
                            withdrawController,
                            transferController,
                            protocolConfig,
                            i,
                            msg.sender,
                            trancheData.managerFeeRate
                        )
                    )
                )
            );

            trancheInitData[i] = TrancheInitData(tranche, trancheData.targetApy, trancheData.minSubordinateRatio);

            tranches[i] = tranche;
        }
    }

    /// @return All created portfolios
    function getPortfolios() external view returns (IStructuredPortfolio[] memory) {
        return portfolios;
    }
}
