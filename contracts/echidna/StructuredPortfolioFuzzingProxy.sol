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
import {Status, TrancheData} from "../interfaces/IStructuredPortfolio.sol";
import {StructuredPortfolio} from "../StructuredPortfolio.sol";
import {StructuredPortfolioFuzzingInit} from "./StructuredPortfolioFuzzingInit.sol";
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";
import {AddLoanParams} from "../interfaces/ILoansManager.sol";

uint256 constant DAY = 1 days;

contract StructuredPortfolioFuzzingProxy is StructuredPortfolioFuzzingInit {
    bool public echidna_check_updateCheckpointsContinuous = true;

    function echidna_check_statusIsNotCapitalFormation() public view returns (bool) {
        return structuredPortfolio.status() != Status.CapitalFormation;
    }

    uint256 internal previousTotalAssets;
    bool internal anyDefaultedLoans = false;
    bool public echidna_check_totalAssetsIncreases = true;

    function _echidna_check_totalAssetsIncreases() public {
        require(structuredPortfolio.loansValue() > structuredPortfolio.totalAssets() / 2);
        require(!anyDefaultedLoans);
        require(!_anyOverdueLoans());

        echidna_check_totalAssetsIncreases = structuredPortfolio.totalAssets() >= previousTotalAssets;
    }

    function _anyOverdueLoans() internal view returns (bool) {
        for (uint256 i = 0; i < activeLoansCount; i++) {
            uint256 activeLoanId = structuredPortfolio.activeLoanIds(i);
            if (fixedInterestOnlyLoans.currentPeriodEndDate(activeLoanId) < block.timestamp) {
                return true;
            }
        }

        return false;
    }

    function updateTotalAssets() public {
        previousTotalAssets = structuredPortfolio.totalAssets();
    }

    function markLoanAsDefaulted(uint256 rawLoanId) public {
        uint256 loanId = rawLoanId % structuredPortfolio.getActiveLoans().length;
        structuredPortfolio.markLoanAsDefaulted(loanId);
        anyDefaultedLoans = true;
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
        activeLoansCount += 1;
    }

    function fundLoan(uint256 rawLoanId) external {
        uint256 loanId = rawLoanId % 5;
        structuredPortfolio.fundLoan(loanId);
    }

    function repayLoan(uint256 rawLoanId) external {
        uint256 loanId = rawLoanId % 5;
        borrower.repayLoan(structuredPortfolio, fixedInterestOnlyLoans, loanId);
    }

    function close() public {
        structuredPortfolio.close();
    }

    function updateCheckpoints() public {
        structuredPortfolio.updateCheckpoints();
    }

    function _echidna_check_updateCheckpointsContinuous() public {
        uint256[] memory waterfall_old = structuredPortfolio.calculateWaterfall();
        structuredPortfolio.updateCheckpoints();
        TrancheData[] memory trancheData_old = _getTranchesData();
        Checkpoint[] memory trancheCheckpoints_old = _getTrancheCheckpoints();
        structuredPortfolio.updateCheckpoints();
        uint256[] memory waterfall_new = structuredPortfolio.calculateWaterfall();
        TrancheData[] memory trancheData_new = _getTranchesData();
        Checkpoint[] memory trancheCheckpoints_new = _getTrancheCheckpoints();

        for (uint256 i = 0; i < waterfall_old.length; i++) {
            if (waterfall_new[i] != waterfall_old[i]) {
                echidna_check_updateCheckpointsContinuous = false;
            }

            if (
                trancheData_new[i].loansDeficitCheckpoint.deficit != trancheData_old[i].loansDeficitCheckpoint.deficit ||
                trancheData_new[i].loansDeficitCheckpoint.timestamp != trancheData_old[i].loansDeficitCheckpoint.timestamp
            ) {
                echidna_check_updateCheckpointsContinuous = false;
            }

            if (
                trancheCheckpoints_new[i].totalAssets != trancheCheckpoints_old[i].totalAssets ||
                trancheCheckpoints_new[i].protocolFeeRate != trancheCheckpoints_old[i].protocolFeeRate ||
                trancheCheckpoints_new[i].timestamp != trancheCheckpoints_old[i].timestamp ||
                trancheCheckpoints_new[i].unpaidFees != trancheCheckpoints_old[i].unpaidFees
            ) {
                echidna_check_updateCheckpointsContinuous = false;
            }
        }
    }

    function _getTranchesData() internal view returns (TrancheData[] memory) {
        ITrancheVault[] memory trancheVaults = structuredPortfolio.getTranches();
        TrancheData[] memory tranchesData = new TrancheData[](trancheVaults.length);

        for (uint256 i = 0; i < trancheVaults.length; i++) {
            tranchesData[i] = structuredPortfolio.getTrancheData(i);
        }

        return tranchesData;
    }

    function _getTrancheCheckpoints() internal view returns (Checkpoint[] memory) {
        ITrancheVault[] memory trancheVaults = structuredPortfolio.getTranches();
        Checkpoint[] memory trancheCheckpoints = new Checkpoint[](trancheVaults.length);
        for (uint256 i = 0; i < trancheVaults.length; i++) {
            trancheCheckpoints[i] = trancheVaults[i].getCheckpoint();
        }

        return trancheCheckpoints;
    }

    function echidna_check_virtualTokenBalanceEqualsTokenBalance() public view returns (bool) {
        return structuredPortfolio.virtualTokenBalance() == token.balanceOf(address(structuredPortfolio));
    }
}
