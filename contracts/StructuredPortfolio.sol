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
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Upgradeable} from "./proxy/Upgradeable.sol";
import {IERC20WithDecimals} from "./interfaces/IERC20WithDecimals.sol";
import {IFixedInterestOnlyLoans, FixedInterestOnlyLoanStatus} from "./interfaces/IFixedInterestOnlyLoans.sol";
import {ITrancheVault, Checkpoint} from "./interfaces/ITrancheVault.sol";
import {IProtocolConfig} from "./interfaces/IProtocolConfig.sol";
import {IDepositController} from "./interfaces/IDepositController.sol";
import {IWithdrawController} from "./interfaces/IWithdrawController.sol";
import {IStructuredPortfolio, Status, TrancheData, TrancheInitData, PortfolioParams, ExpectedEquityRate, LoansDeficitCheckpoint, BASIS_PRECISION, YEAR} from "./interfaces/IStructuredPortfolio.sol";
import {LoansManager, AddLoanParams} from "./LoansManager.sol";

contract StructuredPortfolio is IStructuredPortfolio, LoansManager, Upgradeable {
    using SafeERC20 for IERC20WithDecimals;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE"); // 0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08

    IProtocolConfig public protocolConfig;

    Status public status;
    string public name;
    /// @notice Expected end date, updated to actual on portfolio close
    uint256 public endDate;
    uint256 public startDate;
    uint256 internal portfolioDuration;
    uint256 public startDeadline;
    uint256 public minimumSize;
    uint256 public virtualTokenBalance;

    ITrancheVault[] public tranches;
    TrancheData[] public tranchesData;
    ExpectedEquityRate public expectedEquityRate;

    function initialize(
        address manager,
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans _fixedInterestOnlyLoans,
        IProtocolConfig _protocolConfig,
        PortfolioParams memory portfolioParams,
        TrancheInitData[] memory tranchesInitData,
        ExpectedEquityRate calldata _expectedEquityRate
    ) external initializer {
        _initialize(_fixedInterestOnlyLoans, underlyingToken);
        __Upgradeable_init(_protocolConfig.protocolAdmin(), _protocolConfig.pauserAddress());
        _grantRole(MANAGER_ROLE, manager);

        require(portfolioParams.duration > 0, "SP: Duration cannot be zero");

        uint256 tranchesCount = tranchesInitData.length;

        uint8 tokenDecimals = underlyingToken.decimals();
        for (uint256 i = 0; i < tranchesCount; i++) {
            require(tokenDecimals == tranchesInitData[i].tranche.decimals(), "SP: Decimals mismatched");
        }

        require(tranchesInitData[0].targetApy == 0, "SP: Target APY in tranche 0");
        require(tranchesInitData[0].minSubordinateRatio == 0, "SP: Min sub ratio in tranche 0");

        protocolConfig = _protocolConfig;

        asset = underlyingToken;
        name = portfolioParams.name;
        portfolioDuration = portfolioParams.duration;
        startDeadline = block.timestamp + portfolioParams.capitalFormationPeriod;
        minimumSize = portfolioParams.minimumSize;
        expectedEquityRate = _expectedEquityRate;

        LoansDeficitCheckpoint memory emptyLoansDeficitCheckpoint = LoansDeficitCheckpoint({deficit: 0, timestamp: 0});

        for (uint256 i = 0; i < tranchesCount; i++) {
            TrancheInitData memory initData = tranchesInitData[i];
            tranches.push(initData.tranche);
            initData.tranche.setPortfolio(this);
            underlyingToken.safeApprove(address(initData.tranche), type(uint256).max);
            tranchesData.push(TrancheData(initData.targetApy, initData.minSubordinateRatio, 0, 0, emptyLoansDeficitCheckpoint));
        }

        emit PortfolioInitialized(tranches);
    }

    function getTranches() external view returns (ITrancheVault[] memory) {
        return tranches;
    }

    function updateCheckpoints() public whenNotPaused {
        require(status == Status.Live, "SP: Portfolio is not live");

        uint256[] memory _totalAssetsBefore = new uint256[](tranches.length);
        for (uint256 i = 0; i < tranches.length; i++) {
            _totalAssetsBefore[i] = tranches[i].getCheckpoint().totalAssets;
        }

        uint256[] memory _totalAssetsAfter = calculateWaterfall();
        for (uint256 i = 0; i < _totalAssetsAfter.length; i++) {
            tranches[i].updateCheckpointFromPortfolio(_totalAssetsAfter[i]);
        }

        uint256 timestamp = _limitedBlockTimestamp();
        for (uint256 i = 1; i < _totalAssetsAfter.length; i++) {
            uint256 currentDeficit = _defaultedLoansDeficit(tranchesData[i], timestamp);

            int256 deficitDelta = SafeCast.toInt256(_totalAssetsBefore[i]) - SafeCast.toInt256(_totalAssetsAfter[i]);
            uint256 newDeficit = _getNewLoansDeficit(currentDeficit, deficitDelta);

            tranchesData[i].loansDeficitCheckpoint = LoansDeficitCheckpoint({deficit: newDeficit, timestamp: timestamp});
        }
    }

    function _getNewLoansDeficit(uint256 currentDeficit, int256 delta) internal pure returns (uint256) {
        require(delta > type(int256).min, "SP: Delta out of range");
        if (delta < 0 && currentDeficit < uint256(-delta)) {
            return 0;
        }
        return _addSigned(currentDeficit, delta);
    }

    function increaseVirtualTokenBalance(uint256 increment) external {
        _changeVirtualTokenBalance(SafeCast.toInt256(increment));
    }

    function decreaseVirtualTokenBalance(uint256 decrement) external {
        _changeVirtualTokenBalance(-SafeCast.toInt256(decrement));
    }

    function _changeVirtualTokenBalance(int256 delta) internal {
        uint256 tranchesCount = tranches.length;
        for (uint256 i = 0; i < tranchesCount; i++) {
            if (msg.sender == address(tranches[i])) {
                virtualTokenBalance = _addSigned(virtualTokenBalance, delta);
                return;
            }
        }
        revert("SP: Not a tranche");
    }

    function totalAssets() public view returns (uint256) {
        if (status == Status.Live) {
            return liquidAssets() + loansValue();
        }
        return _sum(_tranchesTotalAssets());
    }

    function liquidAssets() public view returns (uint256) {
        uint256 _totalPendingFees = totalPendingFees();
        return _saturatingSub(virtualTokenBalance, _totalPendingFees);
    }

    function totalPendingFees() public view returns (uint256) {
        uint256 sum = 0;
        uint256 tranchesCount = tranches.length;
        uint256[] memory _totalAssets = calculateWaterfallWithoutFees();

        for (uint256 i = 0; i < tranchesCount; i++) {
            sum += tranches[i].totalPendingFeesForAssets(_totalAssets[i]);
        }

        return sum;
    }

    function loansValue() public view returns (uint256) {
        uint256[] memory _loans = activeLoanIds;

        uint256 _value = 0;
        for (uint256 i = 0; i < _loans.length; i++) {
            _value += _calculateLoanValue(_loans[i]);
        }

        return _value;
    }

    function _calculateLoanValue(uint256 instrumentId) internal view returns (uint256) {
        IFixedInterestOnlyLoans.LoanMetadata memory loan = fixedInterestOnlyLoans.loanData(instrumentId);

        uint256 accruedInterest = _calculateAccruedInterest(loan.periodPayment, loan.periodDuration, loan.periodCount, loan.endDate);
        uint256 interestPaidSoFar = loan.periodsRepaid * loan.periodPayment;

        if (loan.principal + accruedInterest <= interestPaidSoFar) {
            return 0;
        } else {
            return loan.principal + accruedInterest - interestPaidSoFar;
        }
    }

    function start() external whenNotPaused {
        _requireManagerRole();
        require(status == Status.CapitalFormation, "SP: Portfolio is not in capital formation");
        uint256[] memory _totalAssets = _tranchesTotalAssets();
        _checkTranchesRatios(_totalAssets);
        require(_sum(_totalAssets) >= minimumSize, "SP: Portfolio minimum size not reached");

        _changePortfolioStatus(Status.Live);

        startDate = block.timestamp;
        endDate = block.timestamp + portfolioDuration;

        uint256 tranchesCount = tranches.length;
        for (uint256 i = 0; i < tranchesCount; i++) {
            tranches[i].onPortfolioStart();
        }
    }

    function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external view {
        uint256[] memory _totalAssets = calculateWaterfall();
        for (uint256 i = 0; i < _totalAssets.length; i++) {
            if (msg.sender == address(tranches[i])) {
                _totalAssets[i] = newTotalAssets;
            }
        }
        _checkTranchesRatios(_totalAssets);
    }

    function checkTranchesRatios() external view {
        _checkTranchesRatios(_tranchesTotalAssets());
    }

    function _tranchesTotalAssets() internal view returns (uint256[] memory) {
        if (status == Status.Live) {
            return calculateWaterfall();
        }

        uint256[] memory _totalAssets = new uint256[](tranches.length);
        for (uint256 i = 0; i < _totalAssets.length; i++) {
            _totalAssets[i] = tranches[i].totalAssets();
        }
        return _totalAssets;
    }

    function _checkTranchesRatios(uint256[] memory _totalAssets) internal view {
        uint256 subordinateValue = _totalAssets[0];

        for (uint256 i = 1; i < _totalAssets.length; i++) {
            uint256 minSubordinateRatio = tranchesData[i].minSubordinateRatio;
            uint256 trancheValue = _totalAssets[i];

            bool isMinRatioRequired = minSubordinateRatio != 0;
            if (isMinRatioRequired) {
                uint256 subordinateValueInBps = subordinateValue * BASIS_PRECISION;
                uint256 lowerBound = trancheValue * minSubordinateRatio;
                bool isMinRatioSatisfied = subordinateValueInBps >= lowerBound;
                require(isMinRatioSatisfied, "SP: Tranche min ratio not met");
            }

            subordinateValue += trancheValue;
        }
    }

    function close() external whenNotPaused {
        require(status != Status.Closed, "SP: Portfolio already closed");
        bool isAfterEndDate = block.timestamp > endDate;
        require(isAfterEndDate || activeLoanIds.length == 0, "SP: Active loans exist");

        bool isManager = hasRole(MANAGER_ROLE, msg.sender);

        if (status == Status.Live) {
            require(isManager || isAfterEndDate, "SP: Cannot close before end date");
            _closeTranches();
        } else {
            require(isManager || block.timestamp >= startDeadline, "SP: Cannot close before end date");
        }

        _changePortfolioStatus(Status.Closed);

        if (!isAfterEndDate) {
            endDate = block.timestamp;
        }
    }

    function _closeTranches() internal {
        uint256 limitedBlockTimestamp = _limitedBlockTimestamp();

        uint256[] memory waterfallTranchesAssets = calculateWaterfall();
        uint256[] memory distributedAssets = new uint256[](waterfallTranchesAssets.length);
        uint256 assetsLeft = virtualTokenBalance;

        for (uint256 i = waterfallTranchesAssets.length - 1; i > 0; i--) {
            tranchesData[i].maxValueOnClose = _assumedTrancheValue(i, limitedBlockTimestamp);

            uint256 trancheDistributedAssets = _min(waterfallTranchesAssets[i], assetsLeft);
            distributedAssets[i] = trancheDistributedAssets;
            tranches[i].updateCheckpointFromPortfolio(trancheDistributedAssets);

            assetsLeft -= trancheDistributedAssets;
        }

        distributedAssets[0] = _min(waterfallTranchesAssets[0], assetsLeft);
        tranches[0].updateCheckpointFromPortfolio(distributedAssets[0]);

        for (uint256 i = 0; i < distributedAssets.length; i++) {
            uint256 trancheDistributedAssets = distributedAssets[i];
            tranchesData[i].distributedAssets = trancheDistributedAssets;
            _transfer(tranches[i], trancheDistributedAssets);
        }
    }

    function _transfer(ITrancheVault tranche, uint256 amount) internal {
        asset.safeTransfer(address(tranche), amount);
        tranche.onTransfer(amount);
        virtualTokenBalance -= amount;
    }

    function calculateWaterfallForTranche(uint256 trancheIdx) external view returns (uint256) {
        require(trancheIdx < tranches.length, "SP: Tranche index out of bounds");
        return calculateWaterfall()[trancheIdx];
    }

    function calculateWaterfallForTrancheWithoutFee(uint256 trancheIdx) external view returns (uint256) {
        require(trancheIdx < tranches.length, "SP: Tranche index out of bounds");
        return calculateWaterfallWithoutFees()[trancheIdx];
    }

    function calculateWaterfall() public view returns (uint256[] memory) {
        uint256[] memory waterfall = calculateWaterfallWithoutFees();
        for (uint256 i = 0; i < waterfall.length; i++) {
            uint256 pendingFees = tranches[i].totalPendingFeesForAssets(waterfall[i]);
            waterfall[i] = _saturatingSub(waterfall[i], pendingFees);
        }
        return waterfall;
    }

    function calculateWaterfallWithoutFees() public view returns (uint256[] memory) {
        uint256[] memory waterfall = new uint256[](tranches.length);
        if (status != Status.Live) {
            return waterfall;
        }

        uint256 assetsLeft = virtualTokenBalance + loansValue();
        uint256 limitedBlockTimestamp = _limitedBlockTimestamp();

        for (uint256 i = waterfall.length - 1; i > 0; i--) {
            uint256 assumedTrancheValue = _assumedTrancheValue(i, limitedBlockTimestamp);

            if (assumedTrancheValue >= assetsLeft) {
                waterfall[i] = assetsLeft;
                return waterfall;
            }

            waterfall[i] = assumedTrancheValue;
            assetsLeft -= assumedTrancheValue;
        }

        waterfall[0] = assetsLeft;

        return waterfall;
    }

    function _assumedTrancheValue(uint256 trancheIdx, uint256 timestamp) internal view returns (uint256) {
        Checkpoint memory checkpoint = tranches[trancheIdx].getCheckpoint();
        TrancheData memory trancheData = tranchesData[trancheIdx];

        uint256 assumedTotalAssets = _assumedTotalAssets(checkpoint, trancheData, timestamp);
        uint256 defaultedLoansDeficit = _defaultedLoansDeficit(trancheData, timestamp);

        return assumedTotalAssets + defaultedLoansDeficit;
    }

    function _assumedTotalAssets(
        Checkpoint memory checkpoint,
        TrancheData memory trancheData,
        uint256 timestamp
    ) internal pure returns (uint256) {
        uint256 timePassed = _saturatingSub(timestamp, checkpoint.timestamp);
        return _withInterest(checkpoint.totalAssets, trancheData.targetApy, timePassed);
    }

    function _defaultedLoansDeficit(TrancheData memory trancheData, uint256 timestamp) internal pure returns (uint256) {
        if (trancheData.loansDeficitCheckpoint.deficit == 0) {
            return 0;
        }
        uint256 timePassed = _saturatingSub(timestamp, trancheData.loansDeficitCheckpoint.timestamp);
        return _withInterest(trancheData.loansDeficitCheckpoint.deficit, trancheData.targetApy, timePassed);
    }

    function _withInterest(
        uint256 initialValue,
        uint256 targetApy,
        uint256 timePassed
    ) internal pure returns (uint256) {
        uint256 interest = (initialValue * targetApy * timePassed) / YEAR / BASIS_PRECISION;
        return initialValue + interest;
    }

    function addLoan(AddLoanParams calldata params) external whenNotPaused {
        _requireManagerRole();
        require(status == Status.Live, "SP: Portfolio is not live");
        _addLoan(params);
    }

    function fundLoan(uint256 loanId) external whenNotPaused {
        _requireManagerRole();
        updateCheckpoints();

        uint256 principal = _fundLoan(loanId);
        require(virtualTokenBalance >= principal, "SP: Principal exceeds balance");
        virtualTokenBalance -= principal;
        updateCheckpoints();
    }

    function repayLoan(uint256 loanId) external whenNotPaused {
        require(status != Status.CapitalFormation, "SP: Cannot repay in capital formation");
        if (status == Status.Closed) {
            _repayLoanInClosed(loanId);
        } else {
            _repayLoanInLive(loanId);
        }
    }

    function _repayLoanInLive(uint256 loanId) internal {
        updateCheckpoints();
        uint256 repayAmount = _repayLoan(loanId);
        virtualTokenBalance += repayAmount;
        updateCheckpoints();
    }

    function _repayLoanInClosed(uint256 loanId) internal {
        uint256 undistributedAssets = _repayFixedInterestOnlyLoan(loanId);

        for (uint256 i = tranches.length - 1; i > 0; i--) {
            if (undistributedAssets == 0) {
                return;
            }

            TrancheData memory trancheData = tranchesData[i];
            uint256 trancheFreeCapacity = trancheData.maxValueOnClose - trancheData.distributedAssets;
            if (trancheFreeCapacity == 0) {
                continue;
            }

            uint256 trancheShare = _min(trancheFreeCapacity, undistributedAssets);
            undistributedAssets -= trancheShare;
            _repayInClosed(i, trancheShare);
        }

        if (undistributedAssets == 0) {
            return;
        }

        _repayInClosed(0, undistributedAssets);
    }

    function _repayInClosed(uint256 trancheIdx, uint256 amount) internal {
        ITrancheVault tranche = tranches[trancheIdx];
        tranchesData[trancheIdx].distributedAssets += amount;
        asset.safeTransferFrom(msg.sender, address(tranche), amount);
        tranche.onTransfer(amount);
        tranche.updateCheckpoint();
    }

    function updateLoanGracePeriod(uint256 loanId, uint32 newGracePeriod) external {
        _requireManagerRole();
        _updateLoanGracePeriod(loanId, newGracePeriod);
    }

    function cancelLoan(uint256 loanId) external {
        _requireManagerRole();
        _cancelLoan(loanId);
    }

    function markLoanAsDefaulted(uint256 loanId) external whenNotPaused {
        _requireManagerRole();

        updateCheckpoints();
        _markLoanAsDefaulted(loanId);
        updateCheckpoints();
    }

    function getActiveLoans() external view returns (uint256[] memory) {
        return activeLoanIds;
    }

    function _changePortfolioStatus(Status newStatus) internal {
        status = newStatus;
        emit PortfolioStatusChanged(newStatus);
    }

    function _min(uint256 x, uint256 y) internal pure returns (uint256) {
        return x > y ? y : x;
    }

    function _saturatingSub(uint256 x, uint256 y) internal pure returns (uint256) {
        return x > y ? x - y : 0;
    }

    function _addSigned(uint256 x, int256 y) internal pure returns (uint256) {
        return y < 0 ? x - uint256(-y) : x + uint256(y);
    }

    function _sum(uint256[] memory components) internal pure returns (uint256) {
        uint256 sum;
        for (uint256 i = 0; i < components.length; i++) {
            sum += components[i];
        }
        return sum;
    }

    function _limitedBlockTimestamp() internal view returns (uint256) {
        return _min(block.timestamp, endDate);
    }

    function _requireManagerRole() internal view {
        require(hasRole(MANAGER_ROLE, msg.sender), "SP: Only manager");
    }
}
