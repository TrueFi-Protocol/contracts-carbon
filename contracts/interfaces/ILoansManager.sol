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

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import {IFixedInterestOnlyLoans} from "./IFixedInterestOnlyLoans.sol";
import {IERC20WithDecimals} from "./IERC20WithDecimals.sol";

struct AddLoanParams {
    uint256 principal;
    uint16 periodCount;
    uint256 periodPayment;
    uint32 periodDuration;
    address recipient;
    uint32 gracePeriod;
    bool canBeRepaidAfterDefault;
}

/// @title Manager of a Structured Portfolio's active loans
interface ILoansManager {
    /**
     * @notice Event emitted when the loan is added
     * @param loanId Loan id
     */
    event LoanAdded(uint256 indexed loanId);

    /**
     * @notice Event emitted when the loan is funded
     * @param loanId Loan id
     */
    event LoanFunded(uint256 indexed loanId);

    /**
     * @notice Event emitted when the loan is repaid
     * @param loanId Loan id
     * @param amount Repaid amount
     */
    event LoanRepaid(uint256 indexed loanId, uint256 amount);

    /**
     * @notice Event emitted when the loan is marked as defaulted
     * @param loanId Loan id
     */
    event LoanDefaulted(uint256 indexed loanId);

    /**
     * @notice Event emitted when the loan grace period is updated
     * @param loanId Loan id
     * @param newGracePeriod New loan grace period
     */
    event LoanGracePeriodUpdated(uint256 indexed loanId, uint32 newGracePeriod);

    /**
     * @notice Event emitted when the loan is cancelled
     * @param loanId Loan id
     */
    event LoanCancelled(uint256 indexed loanId);

    /**
     * @notice Event emitted when the loan is fully repaid, cancelled or defaulted
     * @param loanId Loan id
     */
    event ActiveLoanRemoved(uint256 indexed loanId);

    /// @return FixedInterestOnlyLoans contract address
    function fixedInterestOnlyLoans() external view returns (IFixedInterestOnlyLoans);

    /// @return Underlying asset address
    function asset() external view returns (IERC20WithDecimals);

    /**
     * @param index Index of loan in array
     * @return Loan id
     */
    function activeLoanIds(uint256 index) external view returns (uint256);

    /**
     * @param loanId Loan id
     * @return Value indicating whether loan with given id was issued by this contract
     */
    function issuedLoanIds(uint256 loanId) external view returns (bool);
}
