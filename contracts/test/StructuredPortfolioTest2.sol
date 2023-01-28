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

import {StructuredPortfolio, PortfolioParams, TrancheInitData, ExpectedEquityRate} from "../StructuredPortfolio.sol";
import {IERC20WithDecimals} from "../interfaces/IERC20WithDecimals.sol";
import {IProtocolConfig} from "../interfaces/IProtocolConfig.sol";
import {IFixedInterestOnlyLoans} from "../interfaces/IFixedInterestOnlyLoans.sol";

contract StructuredPortfolioTest2 is StructuredPortfolio {
    constructor(
        address manager,
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans _fixedInterestOnlyLoans,
        IProtocolConfig _protocolConfig,
        PortfolioParams memory portfolioParams,
        TrancheInitData[] memory tranchesInitData,
        ExpectedEquityRate memory _expectedEquityRate
    ) {
        initialize(
            manager,
            underlyingToken,
            _fixedInterestOnlyLoans,
            _protocolConfig,
            portfolioParams,
            tranchesInitData,
            _expectedEquityRate
        );
    }
}
