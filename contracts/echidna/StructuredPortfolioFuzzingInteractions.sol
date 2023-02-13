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
import {FixedInterestOnlyLoanStatus} from "../interfaces/IFixedInterestOnlyLoans.sol";
import {Status, TrancheData} from "../interfaces/IStructuredPortfolio.sol";
import {StructuredPortfolio} from "../StructuredPortfolio.sol";
import {StructuredPortfolioFuzzingInit} from "./StructuredPortfolioFuzzingInit.sol";
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";
import {AddLoanParams} from "../interfaces/ILoansManager.sol";

uint256 constant DAY = 1 days;

contract StructuredPortfolioFuzzingInteractions is StructuredPortfolioFuzzingInit {
    uint256 internal previousTotalAssets;
    Status internal previousStatus;
    bool internal anyDefaultedLoans = false;

    function updateTotalAssets() public {
        previousTotalAssets = structuredPortfolio.totalAssets();
    }

    function markLoanAsDefaulted(uint256 rawLoanId) public {
        uint256 loanId = rawLoanId % structuredPortfolio.getActiveLoans().length;
        structuredPortfolio.markLoanAsDefaulted(loanId);
        anyDefaultedLoans = true;
        activeLoansCount -= 1;
    }

    function deposit(uint256 rawAmount, uint8 rawTrancheId) public {
        uint256 trancheId = rawTrancheId % 3;
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

    function addLoan(AddLoanParams calldata rawParams) external {
        AddLoanParams memory params = AddLoanParams(
            rawParams.principal % structuredPortfolio.virtualTokenBalance(),
            rawParams.periodCount % 10,
            rawParams.periodPayment % (structuredPortfolio.virtualTokenBalance() / 10),
            rawParams.periodDuration % uint32(7 * DAY),
            address(borrower), /* recipient */
            uint32(DAY), /* gracePeriod */
            true /* canBeRepaidAfterDefault */
        );

        structuredPortfolio.addLoan(params);
    }

    function acceptLoan(uint256 rawLoanId) external {
        uint256 loanId = rawLoanId % 5;
        borrower.acceptLoan(fixedInterestOnlyLoans, loanId);
    }

    function fundLoan(uint256 rawLoanId) external {
        uint256 loanId = rawLoanId % 5;
        structuredPortfolio.fundLoan(loanId);
        activeLoansCount += 1;
    }

    function repayLoan(uint256 rawLoanId) external {
        uint256 loanId = rawLoanId % 5;
        FixedInterestOnlyLoanStatus statusBefore = fixedInterestOnlyLoans.status(loanId);
        borrower.repayLoan(structuredPortfolio, fixedInterestOnlyLoans, loanId);
        if (
            fixedInterestOnlyLoans.status(loanId) == FixedInterestOnlyLoanStatus.Repaid &&
            statusBefore != FixedInterestOnlyLoanStatus.Defaulted
        ) {
            activeLoansCount -= 1;
        }
        borrower.repayLoan(structuredPortfolio, fixedInterestOnlyLoans, loanId);
    }

    function close() public {
        structuredPortfolio.close();
    }

    function updateCheckpoints() public {
        structuredPortfolio.updateCheckpoints();
    }

    function updatePreviousStatus() public {
        previousStatus = structuredPortfolio.status();
    }
}
