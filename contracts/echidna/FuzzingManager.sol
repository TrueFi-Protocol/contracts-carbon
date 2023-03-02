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
import {IStructuredPortfolio} from "../StructuredPortfolio.sol";
import {DepositController} from "../controllers/DepositController.sol";
import {WithdrawController} from "../controllers/WithdrawController.sol";
import {StructuredPortfolio, Status} from "../StructuredPortfolio.sol";
import {AddLoanParams} from "../LoansManager.sol";

contract FuzzingManager {
    function setDepositAllowed(
        DepositController depositController,
        bool newDepositAllowed,
        Status portfolioStatus
    ) public {
        depositController.setDepositAllowed(newDepositAllowed, portfolioStatus);
    }

    function setWithdrawAllowed(
        WithdrawController withdrawController,
        bool newWithdrawAllowed,
        Status portfolioStatus
    ) public {
        withdrawController.setWithdrawAllowed(newWithdrawAllowed, portfolioStatus);
    }

    function start(StructuredPortfolio structuredPortfolio) public {
        structuredPortfolio.start();
    }

    function close(StructuredPortfolio structuredPortfolio) public {
        structuredPortfolio.close();
    }

    function addLoan(StructuredPortfolio structuredPortfolio, AddLoanParams memory params) public {
        structuredPortfolio.addLoan(params);
    }

    function fundLoan(StructuredPortfolio structuredPortfolio, uint256 loanId) public {
        structuredPortfolio.fundLoan(loanId);
    }

    function markLoanAsDefaulted(StructuredPortfolio structuredPortfolio, uint256 loanId) public {
        structuredPortfolio.markLoanAsDefaulted(loanId);
    }
}
