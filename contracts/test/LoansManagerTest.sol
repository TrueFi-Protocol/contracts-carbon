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

import {LoansManager, IFixedInterestOnlyLoans, AddLoanParams} from "../LoansManager.sol";
import {IERC20WithDecimals} from "../interfaces/IERC20WithDecimals.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LoansManagerTest is LoansManager {
    using SafeERC20 for IERC20WithDecimals;

    function initialize(IFixedInterestOnlyLoans _fixedInterestOnlyLoans, IERC20WithDecimals _asset) external {
        _initialize(_fixedInterestOnlyLoans, _asset);
    }

    function addLoan(AddLoanParams calldata params) external {
        _addLoan(params);
    }

    function fundLoan(uint256 loanId) external {
        _fundLoan(loanId);
    }

    function repayLoan(uint256 loanId) external {
        _repayLoan(loanId);
    }

    function cancelLoan(uint256 loanId) external {
        _cancelLoan(loanId);
    }

    function updateLoanGracePeriod(uint256 loanId, uint32 newGracePeriod) external {
        _updateLoanGracePeriod(loanId, newGracePeriod);
    }

    function transferAllAssets(address to) external {
        asset.safeTransfer(to, asset.balanceOf(address(this)));
    }

    function tryToExcludeLoan(uint256 loanId) external {
        _tryToExcludeLoan(loanId);
    }

    function markLoanAsDefaulted(uint256 loanId) external {
        _markLoanAsDefaulted(loanId);
    }

    function setLoanAsDefaulted(uint256 loanId) external {
        fixedInterestOnlyLoans.markAsDefaulted(loanId);
    }

    function getActiveLoans() external view returns (uint256[] memory) {
        return activeLoanIds;
    }
}
