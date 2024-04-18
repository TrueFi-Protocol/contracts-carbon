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
import {IStructuredPortfolioFactory, TrancheData, ITrancheVault, IERC20WithDecimals, IStructuredPortfolio, IProtocolConfig, IFixedInterestOnlyLoans, PortfolioParams, ExpectedEquityRate, TrancheInitData} from "./interfaces/IStructuredPortfolioFactory.sol";
import {ProxyWrapper} from "./proxy/ProxyWrapper.sol";

contract StructuredPortfolioFactory is IStructuredPortfolioFactory, AccessControlEnumerable {
    using Address for address;
    bytes32 public constant WHITELISTED_MANAGER_ROLE = keccak256("WHITELISTED_MANAGER_ROLE");

    IStructuredPortfolio[] public portfolios;
    address public immutable trancheImplementation;
    address public immutable portfolioImplementation;
    IProtocolConfig public immutable protocolConfig;

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

    function createPortfolio(
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans fixedInterestOnlyLoans,
        PortfolioParams calldata portfolioParams,
        TrancheData[] calldata tranchesData,
        ExpectedEquityRate calldata expectedEquityRate
    ) external virtual {
        require(hasRole(WHITELISTED_MANAGER_ROLE, msg.sender), "SPF: Only whitelisted manager");
        _createPortfolio(underlyingToken, fixedInterestOnlyLoans, portfolioParams, tranchesData, expectedEquityRate);
    }

    function _createPortfolio(
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans fixedInterestOnlyLoans,
        PortfolioParams calldata portfolioParams,
        TrancheData[] calldata tranchesData,
        ExpectedEquityRate calldata expectedEquityRate
    ) internal {
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

    function getPortfolios() external view returns (IStructuredPortfolio[] memory) {
        return portfolios;
    }
}
