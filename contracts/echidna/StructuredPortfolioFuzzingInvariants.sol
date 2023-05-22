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

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {FixedInterestOnlyLoans} from "../test/FixedInterestOnlyLoans.sol";
import {Status, TrancheData, BASIS_PRECISION} from "../interfaces/IStructuredPortfolio.sol";
import {StructuredPortfolio} from "../StructuredPortfolio.sol";
import {StructuredPortfolioFuzzingInteractions} from "./StructuredPortfolioFuzzingInteractions.sol";
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";
import {TrancheVault} from "../TrancheVault.sol";
import {AddLoanParams} from "../interfaces/ILoansManager.sol";
import "./ABDKMath64x64.sol";

uint256 constant DAY = 1 days;
uint256 constant YEAR = 365 days;

contract StructuredPortfolioFuzzingInvariants is StructuredPortfolioFuzzingInteractions {
    using ABDKMath64x64 for int128;

    function verify_assumedTrancheValueIsWithinBounds() public {
        require(structuredPortfolio.status() != Status.Closed);
        structuredPortfolio.updateCheckpoints(); // reset pendingFees

        uint256 limitedBlockTimestamp = Math.min(block.timestamp, structuredPortfolio.endDate());
        uint256 timePassed = limitedBlockTimestamp - structuredPortfolio.startDate();
        emit LogUint256("time passed since portfolio start", timePassed);
        for (uint256 i = 1; i < 3; i++) {
            TrancheData memory trancheData = structuredPortfolio.getTrancheData(i);
            int128 initialTrancheValue = ABDKMath64x64.fromUInt(initialTrancheValues[i]);
            int128 upperBound = initialTrancheValue.mul(_exp(trancheData.targetApy * timePassed, BASIS_PRECISION * YEAR));
            int128 lowerBound = initialTrancheValue.mul(
                _exp((trancheData.targetApy - 4 * FEE_RATE) * timePassed, BASIS_PRECISION * YEAR)
            );
            int128 assumedTrancheValue = ABDKMath64x64.fromUInt(structuredPortfolio.effectiveAssumedTrancheValue(i));
            int128 epsilon = ABDKMath64x64.fromUInt(100);
            assertLt(assumedTrancheValue.toUInt(), upperBound.add(epsilon).toUInt(), "assumed tranche value is under upper bound");
            assertGt(assumedTrancheValue.toUInt(), lowerBound.sub(epsilon).toUInt(), "assumed tranche value is over lower bound");
        }
    }

    function _exp(uint256 numerator, uint256 denominator) internal pure returns (int128) {
        int128 _numerator = ABDKMath64x64.fromUInt(numerator);
        int128 _denominator = ABDKMath64x64.fromUInt(denominator);
        int128 x = _numerator.div(_denominator);
        return ABDKMath64x64.exp(x);
    }
}
