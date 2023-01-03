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
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20WithDecimals} from "./interfaces/IERC20WithDecimals.sol";
import {IFixedInterestOnlyLoans, FixedInterestOnlyLoanStatus} from "./interfaces/IFixedInterestOnlyLoans.sol";
import {IERC20WithDecimals} from "./interfaces/IERC20WithDecimals.sol";
import {ILoansManager, AddLoanParams} from "./interfaces/ILoansManager.sol";

/// @title Manager of portfolio's active loans
abstract contract LoansManager is ILoansManager {
    using SafeERC20 for IERC20WithDecimals;

    IFixedInterestOnlyLoans public fixedInterestOnlyLoans;
    IERC20WithDecimals public asset;

    uint256[] public activeLoanIds;
    mapping(uint256 => bool) public issuedLoanIds;

    function _initialize(IFixedInterestOnlyLoans _fixedInterestOnlyLoans, IERC20WithDecimals _asset) internal {
        fixedInterestOnlyLoans = _fixedInterestOnlyLoans;
        asset = _asset;
    }

    function _markLoanAsDefaulted(uint256 loanId) internal {
        fixedInterestOnlyLoans.markAsDefaulted(loanId);
        _tryToExcludeLoan(loanId);
        emit LoanDefaulted(loanId);
    }

    function _addLoan(AddLoanParams calldata params) internal {
        uint256 loanId = fixedInterestOnlyLoans.issueLoan(
            IERC20WithDecimals(address(asset)),
            params.principal,
            params.periodCount,
            params.periodPayment,
            params.periodDuration,
            params.recipient,
            params.gracePeriod,
            params.canBeRepaidAfterDefault
        );

        issuedLoanIds[loanId] = true;

        emit LoanAdded(loanId);
    }

    function _fundLoan(uint256 loanId) internal returns (uint256 principal) {
        require(issuedLoanIds[loanId], "LM: Not issued by this contract");

        principal = fixedInterestOnlyLoans.principal(loanId);
        require(asset.balanceOf(address(this)) >= principal, "LM: Insufficient funds");

        fixedInterestOnlyLoans.start(loanId);
        activeLoanIds.push(loanId);
        address borrower = fixedInterestOnlyLoans.recipient(loanId);
        asset.safeTransfer(borrower, principal);

        emit LoanFunded(loanId);
    }

    function _repayLoan(uint256 loanId) internal returns (uint256 amount) {
        amount = _repayFixedInterestOnlyLoan(loanId);
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit LoanRepaid(loanId, amount);
    }

    function _updateLoanGracePeriod(uint256 loanId, uint32 newGracePeriod) internal {
        fixedInterestOnlyLoans.updateInstrument(loanId, newGracePeriod);
        emit LoanGracePeriodUpdated(loanId, newGracePeriod);
    }

    function _cancelLoan(uint256 loanId) internal {
        fixedInterestOnlyLoans.cancel(loanId);
        emit LoanCancelled(loanId);
    }

    function _repayFixedInterestOnlyLoan(uint256 loanId) internal returns (uint256) {
        require(issuedLoanIds[loanId], "LM: Not issued by this contract");
        require(fixedInterestOnlyLoans.recipient(loanId) == msg.sender, "LM: Not an instrument recipient");

        uint256 amount = fixedInterestOnlyLoans.expectedRepaymentAmount(loanId);
        fixedInterestOnlyLoans.repay(loanId, amount);
        _tryToExcludeLoan(loanId);

        return amount;
    }

    function _tryToExcludeLoan(uint256 loanId) internal {
        FixedInterestOnlyLoanStatus loanStatus = fixedInterestOnlyLoans.status(loanId);

        if (
            loanStatus == FixedInterestOnlyLoanStatus.Started ||
            loanStatus == FixedInterestOnlyLoanStatus.Accepted ||
            loanStatus == FixedInterestOnlyLoanStatus.Created
        ) {
            return;
        }

        uint256 loansLength = activeLoanIds.length;
        for (uint256 i = 0; i < loansLength; i++) {
            if (activeLoanIds[i] == loanId) {
                if (i < loansLength - 1) {
                    activeLoanIds[i] = activeLoanIds[loansLength - 1];
                }
                activeLoanIds.pop();
                emit ActiveLoanRemoved(loanId);
                return;
            }
        }
    }

    function _calculateAccruedInterest(
        uint256 periodPayment,
        uint256 periodDuration,
        uint256 periodCount,
        uint256 loanEndDate
    ) internal view returns (uint256) {
        uint256 fullInterest = periodPayment * periodCount;
        if (block.timestamp >= loanEndDate) {
            return fullInterest;
        }

        uint256 loanDuration = (periodDuration * periodCount);
        uint256 passed = block.timestamp + loanDuration - loanEndDate;

        return (fullInterest * passed) / loanDuration;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
