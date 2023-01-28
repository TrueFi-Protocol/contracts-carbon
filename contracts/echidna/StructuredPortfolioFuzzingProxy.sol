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

import {FixedInterestOnlyLoans} from "../test/FixedInterestOnlyLoans.sol";
import {Status} from "../interfaces/IStructuredPortfolio.sol";
import {StructuredPortfolio} from "../StructuredPortfolio.sol";
import {StructuredPortfolioFuzzingInit} from "./StructuredPortfolioFuzzingInit.sol";

contract StructuredPortfolioFuzzingProxy is StructuredPortfolioFuzzingInit {
    bool public echidna_check_waterfallContinuous = true;

    function echidna_check_statusIsNotCapitalFormation() public view returns (bool) {
        return structuredPortfolio.status() != Status.CapitalFormation;
    }

    function echidna_check_statusIsCapitalFormation() public view returns (bool) {
        return structuredPortfolio.status() == Status.CapitalFormation;
    }

    function markLoanAsDefaulted(uint256 loanId) public {
        structuredPortfolio.markLoanAsDefaulted(loanId % 2);
    }

    function _echidna_check_waterfallContinuous() public {
        uint256[] memory waterfall_old = structuredPortfolio.calculateWaterfall();
        structuredPortfolio.updateCheckpoints();
        uint256[] memory waterfall_new = structuredPortfolio.calculateWaterfall();

        for (uint256 i = 0; i < waterfall_old.length; i++) {
            if (waterfall_new[i] != waterfall_old[i]) {
                echidna_check_waterfallContinuous = false;
            }
        }
    }

    function updateCheckpoints() public {
        structuredPortfolio.updateCheckpoints();
    }

    uint256 DAY = 1 * 60 * 60 * 24;
    uint256 first;
    uint256 second;
    uint256 third;

    function setFirst() public {
        first = block.timestamp;
    }

    function setSecond() public {
        require(first != 0);
        second = block.timestamp;
        require(second > first + 2 * DAY);
    }

    function setThird() public {
        require(second != 0);
        third = block.timestamp;
        require(third > second + 2 * DAY);
    }

    function echidna_check_thirdIsZero() public view returns (bool) {
        return third == 0;
    }
}
