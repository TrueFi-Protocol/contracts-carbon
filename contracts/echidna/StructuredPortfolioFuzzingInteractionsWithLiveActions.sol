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

import {StructuredPortfolioFuzzingInteractions} from "./StructuredPortfolioFuzzingInteractions.sol";
import {ITrancheVault} from "../interfaces/ITrancheVault.sol";

uint256 constant DAY = 1 days;

contract StructuredPortfolioFuzzingInteractionsWithLiveActions is StructuredPortfolioFuzzingInteractions {
    function deposit(uint256 rawAmount, uint8 rawTrancheId) public {
        uint256 trancheId = rawTrancheId % _getNumberOfTranches();
        uint256 amount = rawAmount % token.balanceOf(address(lender));
        ITrancheVault tranche;
        if (trancheId == 0) {
            tranche = equityTranche;
        } else if (trancheId == 1) {
            tranche = juniorTranche;
        } else {
            tranche = seniorTranche;
        }

        lender.deposit(tranche, amount);
    }

    function withdraw(uint256 rawAmount, uint8 rawTrancheId) public {
        uint256 trancheId = rawTrancheId % _getNumberOfTranches();
        ITrancheVault tranche;
        if (trancheId == 0) {
            tranche = equityTranche;
        } else if (trancheId == 1) {
            tranche = juniorTranche;
        } else {
            tranche = seniorTranche;
        }
        uint256 amount = rawAmount % tranche.maxWithdraw(address(lender));

        lender.withdraw(tranche, amount);
    }
}
