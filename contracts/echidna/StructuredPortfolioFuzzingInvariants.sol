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
import {StructuredPortfolioFuzzingInteractions} from "./StructuredPortfolioFuzzingInteractions.sol";
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";
import {TrancheVault} from "../TrancheVault.sol";
import {AddLoanParams} from "../interfaces/ILoansManager.sol";

uint256 constant DAY = 1 days;

contract StructuredPortfolioFuzzingInvariants is StructuredPortfolioFuzzingInteractions {
    function echidna_check_statusIsNotCapitalFormation() public view returns (bool) {
        return structuredPortfolio.status() != Status.CapitalFormation;
    }

    bool public echidna_check_totalAssetsIncreases = true;

    function _echidna_check_totalAssetsIncreases() public {
        require(structuredPortfolio.loansValue() > structuredPortfolio.totalAssets() / 2);
        require(!anyDefaultedLoans);
        require(!_anyOverdueLoans());

        echidna_check_totalAssetsIncreases = structuredPortfolio.totalAssets() >= previousTotalAssets;
    }

    bool public echidna_check_updateCheckpointsContinuous = true;

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

    function echidna_check_virtualTokenBalanceEqualsTokenBalance() public view returns (bool) {
        return structuredPortfolio.virtualTokenBalance() == token.balanceOf(address(structuredPortfolio));
    }

    bool public echidna_check_onlyValidTransitions = true;

    function _echidna_check_onlyValidTransitions() public {
        Status currentStatus = structuredPortfolio.status();
        if (
            (previousStatus == Status.Live && currentStatus == Status.CapitalFormation) ||
            (previousStatus == Status.Closed && currentStatus == Status.CapitalFormation) ||
            (previousStatus == Status.Closed && currentStatus == Status.Live)
        ) {
            echidna_check_onlyValidTransitions = false;
        }
    }

    function echidna_check_onlyValidStatuses() public view returns (bool) {
        Status status = structuredPortfolio.status();

        return status == Status.CapitalFormation || status == Status.Live || status == Status.Closed;
    }

    bool public echidna_check_activeLoanIdsLengthLTEActiveLoansCount = true;

    function _echidna_check_activeLoanIdsLengthLTEActiveLoansCount() public {
        structuredPortfolio.activeLoanIds(activeLoansCount); // should revert

        echidna_check_activeLoanIdsLengthLTEActiveLoansCount = false;
    }

    function echidna_check_activeLoanIdsLengthGTEActiveLoansCount() public view returns (bool) {
        if (activeLoansCount == 0) {
            return true;
        }

        structuredPortfolio.activeLoanIds(activeLoansCount - 1); // should not revert

        return true;
    }

    bool public echidna_check_tokensAreDistributedCorrectlyOnClose = true;

    function _echidna_check_tokensAreDistributedCorrectlyOnClose() public {
        structuredPortfolio.updateCheckpoints();

        uint256[] memory assumedTrancheValues = new uint256[](3);
        for (uint256 i = 1; i < 3; i++) {
            assumedTrancheValues[i] = structuredPortfolio.assumedTrancheValue(i);
        }

        manager.close(structuredPortfolio);

        ITrancheVault[] memory trancheVaults = structuredPortfolio.getTranches();
        for (uint256 i = 2; i > 0; i--) {
            TrancheVault trancheVault = TrancheVault(address(trancheVaults[i]));
            TrancheVault lowerTrancheVault = TrancheVault(address(trancheVaults[i - 1]));

            uint256 trancheBalance = trancheVault.virtualTokenBalance();
            if (trancheBalance == assumedTrancheValues[i]) {
                continue;
            }

            if (trancheBalance > assumedTrancheValues[i]) {
                echidna_check_tokensAreDistributedCorrectlyOnClose = false;
                return;
            }

            assert(trancheBalance < assumedTrancheValues[i]);
            uint256 lowerTrancheBalance = lowerTrancheVault.virtualTokenBalance();
            if (lowerTrancheBalance != 0) {
                echidna_check_tokensAreDistributedCorrectlyOnClose = false;
                return;
            }
        }
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
}
