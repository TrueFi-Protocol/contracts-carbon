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
import {Upgradeable} from "../proxy/Upgradeable.sol";
import {IERC20WithDecimals} from "../interfaces/IERC20WithDecimals.sol";
import {IFixedInterestOnlyLoans, FixedInterestOnlyLoanStatus} from "../interfaces/IFixedInterestOnlyLoans.sol";
import {FixedInterestOnlyLoans} from "../test/FixedInterestOnlyLoans.sol";
import {FixedInterestOnlyLoansTest} from "../test/FixedInterestOnlyLoansTest.sol";
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";
import {TrancheVault} from "../TrancheVault.sol";
import {TrancheVaultTest2} from "../test/TrancheVaultTest2.sol";
import {IProtocolConfig} from "../interfaces/IProtocolConfig.sol";
import {ProtocolConfig} from "../ProtocolConfig.sol";
import {ProtocolConfigTest} from "../test/ProtocolConfigTest.sol";
import {AllowAllLenderVerifier} from "../lenderVerifiers/AllowAllLenderVerifier.sol";
import {IDepositController} from "../interfaces/IDepositController.sol";
import {DepositController} from "../controllers/DepositController.sol";
import {IWithdrawController} from "../interfaces/IWithdrawController.sol";
import {WithdrawController} from "../controllers/WithdrawController.sol";
import {TransferController} from "../controllers/TransferController.sol";
import {MockToken} from "../mocks/MockToken.sol";
import {IStructuredPortfolio, Status, TrancheData, TrancheInitData, PortfolioParams, ExpectedEquityRate, LoansDeficitCheckpoint, BASIS_PRECISION, YEAR} from "../interfaces/IStructuredPortfolio.sol";
import {StructuredPortfolio} from "../StructuredPortfolio.sol";
import {StructuredPortfolioTest2} from "../test/StructuredPortfolioTest2.sol";
import {LoansManager, AddLoanParams} from "../LoansManager.sol";
import {StructuredPortfolioTest} from "../test/StructuredPortfolioTest.sol";

contract StructuredPortfolioFuzzingProxy {
    MockToken public token;
    ProtocolConfig public protocolConfig;
    FixedInterestOnlyLoans public fixedInterestOnlyLoans;
    AllowAllLenderVerifier public lenderVerifier;
    TrancheVault public equityTranche;
    TrancheVault public juniorTranche;
    TrancheVault public seniorTranche;
    StructuredPortfolio public structuredPortfolio;

    bool public echidna_check_waterfallContinuous;

    constructor() {
        _initializeToken();
        _initializeProtocolConfig();
        _initializeFixedInterestOnlyLoans();
        _initializeLenderVerifier();
        equityTranche = _initializeTranche("Equity Tranche", "EQT", 0, 10**9 * 10**6);
        juniorTranche = _initializeTranche("Junior Tranche", "JNT", 1, 10**9 * 10**6);
        seniorTranche = _initializeTranche("Senior Tranche", "SNT", 2, 10**9 * 10**6);
        _initializePortfolio();

        echidna_check_waterfallContinuous = true;
    }

    function _initializeToken() internal {
        token = new MockToken(
            /* decimals */
            6
        );
        token.mint(address(this), 10**12);
    }

    function _initializeProtocolConfig() internal {
        protocolConfig = new ProtocolConfigTest(
            /* _defaultProtocolFeeRate */
            50,
            /* _protocolAdmin */
            address(this),
            /* _protocolTreasury */
            address(this),
            /* _pauserAddress */
            address(this)
        );
    }

    function _initializeFixedInterestOnlyLoans() internal {
        fixedInterestOnlyLoans = new FixedInterestOnlyLoansTest(protocolConfig);
    }

    function _initializeLenderVerifier() internal {
        lenderVerifier = new AllowAllLenderVerifier();
    }

    function _initializeTranche(
        string memory name,
        string memory symbol,
        uint256 waterfallIndex,
        uint256 ceiling
    ) internal returns (TrancheVault) {
        DepositController depositController = new DepositController();
        depositController.initialize(
            /* manager */
            address(this),
            address(lenderVerifier),
            /* _depositFeeRate */
            50,
            ceiling
        );
        WithdrawController withdrawController = new WithdrawController();
        withdrawController.initialize(
            /* manager */
            address(this),
            /* _withdrawFeeRate */
            50,
            /* _floor */
            10**6
        );
        TransferController transferController = new TransferController();

        TrancheVault tranche = new TrancheVaultTest2(
            name,
            symbol,
            IERC20WithDecimals(address(token)),
            depositController,
            withdrawController,
            transferController,
            protocolConfig,
            waterfallIndex,
            /* manager */
            address(this),
            /* _managerFeeRate */
            50
        );

        return tranche;
    }

    function _initializePortfolio() internal {
        PortfolioParams memory portfolioParams = PortfolioParams(
            "Portfolio",
            /* duration */
            2 * YEAR,
            /* capitalFormationPeriod */
            90 * DAY,
            /* minimumSize */
            0
        );

        TrancheInitData[] memory tranchesInitData = new TrancheInitData[](3);
        tranchesInitData[0] = TrancheInitData(
            equityTranche,
            /* targetApy */
            0,
            /* minSubordinateRatio */
            0
        );
        tranchesInitData[1] = TrancheInitData(
            juniorTranche,
            /* targetApy */
            500,
            /* minSubordinateRatio */
            0
        );
        tranchesInitData[2] = TrancheInitData(
            seniorTranche,
            /* targetApy */
            300,
            /* minSubordinateRatio */
            0
        );

        structuredPortfolio = new StructuredPortfolioTest2(
            /* manager */
            address(this),
            IERC20WithDecimals(address(token)),
            fixedInterestOnlyLoans,
            protocolConfig,
            portfolioParams,
            tranchesInitData,
            ExpectedEquityRate(200, 2000)
        );
    }

    function echidna_check_statusIsNotCapitalFormation() public view returns (bool) {
        return structuredPortfolio.status() != Status.CapitalFormation;
    }

    function echidna_check_statusIsCapitalFormation() public view returns (bool) {
        return structuredPortfolio.status() == Status.CapitalFormation;
    }

    function markLoanAsDefaulted(uint256 loanId) public {
        structuredPortfolio.markLoanAsDefaulted(loanId % 2);
    }

    function _echidna_check_waterfallContinuous() public {
        uint256[] memory waterfall_old = structuredPortfolio.calculateWaterfall();
        structuredPortfolio.updateCheckpoints();
        uint256[] memory waterfall_new = structuredPortfolio.calculateWaterfall();

        for (uint256 i = 0; i < waterfall_old.length; i++) {
            if (waterfall_new[i] != waterfall_old[i]) {
                echidna_check_waterfallContinuous = false;
            }
        }
    }

    function updateCheckpoints() public {
        structuredPortfolio.updateCheckpoints();
    }

    uint256 DAY = 1 * 60 * 60 * 24;
    uint256 first;
    uint256 second;
    uint256 third;

    function setFirst() public {
        first = block.timestamp;
    }

    function setSecond() public {
        require(first != 0);
        second = block.timestamp;
        require(second > first + 2 * DAY);
    }

    function setThird() public {
        require(second != 0);
        third = block.timestamp;
        require(third > second + 2 * DAY);
    }

    function echidna_check_thirdIsZero() public view returns (bool) {
        return third == 0;
    }
}
