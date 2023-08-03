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
import {StructuredPortfolioFuzzingInteractionsWithLiveActions} from "./StructuredPortfolioFuzzingInteractionsWithLiveActions.sol";
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";
import {TrancheVault} from "../TrancheVault.sol";
import {AddLoanParams} from "../interfaces/ILoansManager.sol";

uint256 constant DAY = 1 days;
uint256 constant YEAR = 365 days;

contract StructuredPortfolioFuzzingInvariantsWithLiveActions is StructuredPortfolioFuzzingInteractionsWithLiveActions {
    function verify_statusIsNotCapitalFormation() public view {
        assert(structuredPortfolio.status() != Status.CapitalFormation);
    }

    function verify_totalAssetsIncreases() public {
        require(structuredPortfolio.loansValue() > structuredPortfolio.totalAssets() / 2);
        require(!anyDefaultedLoans);
        require(!_anyOverdueLoans());

        assertGte(structuredPortfolio.totalAssets(), previousTotalAssets, "total assets increase assuming no defaulted loans");
    }

    function verify_updateCheckpointsContinuous() public {
        uint256[] memory waterfall_old = structuredPortfolio.calculateWaterfall();
        structuredPortfolio.updateCheckpoints();
        Checkpoint[] memory trancheCheckpoints_old = _getTrancheCheckpoints();
        structuredPortfolio.updateCheckpoints();
        uint256[] memory waterfall_new = structuredPortfolio.calculateWaterfall();
        Checkpoint[] memory trancheCheckpoints_new = _getTrancheCheckpoints();

        for (uint256 i = 0; i < waterfall_old.length; i++) {
            emit LogUint256("tranche id", i);
            assertEq(waterfall_new[i], waterfall_old[i], "waterfall value is equal before and after update");

            assertEq(
                trancheCheckpoints_new[i].deficit,
                trancheCheckpoints_old[i].deficit,
                "deficit value is preserved after subsequent update"
            );
            assertEq(
                trancheCheckpoints_new[i].timestamp,
                trancheCheckpoints_old[i].timestamp,
                "deficit timestamp is preserved after subsequent update"
            );

            assertEq(
                trancheCheckpoints_new[i].totalAssets,
                trancheCheckpoints_old[i].totalAssets,
                "total assets are preserved after subsequent update"
            );
            assertEq(
                trancheCheckpoints_new[i].protocolFeeRate,
                trancheCheckpoints_old[i].protocolFeeRate,
                "protocol fee rate is preserved after subsequent update"
            );
            assertEq(
                trancheCheckpoints_new[i].timestamp,
                trancheCheckpoints_old[i].timestamp,
                "timestamp is preserved after subsequent update"
            );
            assertEq(
                trancheCheckpoints_new[i].unpaidFees,
                trancheCheckpoints_old[i].unpaidFees,
                "unpaid fees are preserved after subsequent update"
            );
        }
    }

    function verify_virtualTokenBalanceEqualsTokenBalance() public {
        assertEq(
            structuredPortfolio.virtualTokenBalance(),
            token.balanceOf(address(structuredPortfolio)),
            "token balance is equal to virtualTokenBalance"
        );
    }

    function verify_onlyValidTransitions() public {
        Status currentStatus = structuredPortfolio.status();
        assertWithMsg(
            (previousStatus == Status.Live && currentStatus == Status.Live) ||
                (previousStatus == Status.Live && currentStatus == Status.Closed) ||
                (previousStatus == Status.Closed && currentStatus == Status.Closed),
            "only valid state transitions"
        );
    }

    function verify_onlyValidStatuses() public {
        Status status = structuredPortfolio.status();

        assertWithMsg(status == Status.CapitalFormation || status == Status.Live || status == Status.Closed, "only valid statuses");
    }

    function verify_activeLoanIdsLengthEqualsActiveLoansCount() public {
        try structuredPortfolio.activeLoanIds(activeLoansCount) returns (uint256) {
            assertWithMsg(false, "number of active loans is equal to activeLoansCount");
        } catch {
            // correct
        }

        try structuredPortfolio.activeLoanIds(activeLoansCount - 1) returns (uint256) {
            // correct
        } catch {
            assertWithMsg(false, "number of active loans is equal to activeLoansCount");
        }
    }

    function verify_tokensAreDistributedCorrectlyOnClose() public {
        structuredPortfolio.updateCheckpoints();

        uint256[] memory assumedTrancheValues = new uint256[](3);
        for (uint256 i = 1; i < 3; i++) {
            assumedTrancheValues[i] = structuredPortfolio.assumedTrancheValue(i);
        }

        manager.close(structuredPortfolio);
        emit LogString("close portfolio");

        ITrancheVault[] memory trancheVaults = structuredPortfolio.getTranches();
        for (uint256 i = 2; i > 0; i--) {
            emit LogUint256("tranche id", i);
            TrancheVault trancheVault = TrancheVault(address(trancheVaults[i]));
            TrancheVault lowerTrancheVault = TrancheVault(address(trancheVaults[i - 1]));

            uint256 trancheBalance = trancheVault.virtualTokenBalance();
            if (trancheBalance == assumedTrancheValues[i]) {
                continue;
            }

            assertLt(trancheBalance, assumedTrancheValues[i], "tranche balance is not greater than the assumed tranche value");

            uint256 lowerTrancheBalance = lowerTrancheVault.virtualTokenBalance();
            assertEq(lowerTrancheBalance, 0, "lower tranche is empty if tranche doesn't meet assumed value");
        }

        revert();
    }

    function verify_liquidAssetsIsEqualToVirtualTokenBalanceAfterUpdate() external {
        uint256 liquidAssets = structuredPortfolio.liquidAssets();
        structuredPortfolio.updateCheckpoints();
        assertEq(
            liquidAssets,
            structuredPortfolio.virtualTokenBalance(),
            "liquid assets is the amount of tokens remaining after an update"
        );
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
