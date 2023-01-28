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

uint256 constant DAY = 1 days;

contract StructuredPortfolioFuzzingInit {
    MockToken public token;
    ProtocolConfig public protocolConfig;
    FixedInterestOnlyLoans public fixedInterestOnlyLoans;
    AllowAllLenderVerifier public lenderVerifier;
    TrancheVault public equityTranche;
    TrancheVault public juniorTranche;
    TrancheVault public seniorTranche;
    StructuredPortfolio public structuredPortfolio;

    constructor() {
        _initializeToken();
        _initializeProtocolConfig();
        _initializeFixedInterestOnlyLoans();
        _initializeLenderVerifier();
        equityTranche = _initializeTranche("Equity Tranche", "EQT", 0, 10**9 * 10**6);
        juniorTranche = _initializeTranche("Junior Tranche", "JNT", 1, 10**9 * 10**6);
        seniorTranche = _initializeTranche("Senior Tranche", "SNT", 2, 10**9 * 10**6);
        _initializePortfolio();
    }

    function _initializeToken() internal {
        token = new MockToken(
            6 /* decimals */
        );
        token.mint(address(this), 10**12);
    }

    function _initializeProtocolConfig() internal {
        protocolConfig = new ProtocolConfigTest(
            50, /* _defaultProtocolFeeRate */
            address(this), /* _protocolAdmin */
            address(this), /* _protocolTreasury */
            address(this) /* _pauserAddress */
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
            address(this), /* manager */
            address(lenderVerifier),
            50, /* _depositFeeRate */
            ceiling
        );
        WithdrawController withdrawController = new WithdrawController();
        withdrawController.initialize(
            address(this), /* manager */
            50, /* _withdrawFeeRate */
            10**6 /* _floor */
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
            address(this), /* manager */
            50 /* _managerFeeRate */
        );

        return tranche;
    }

    function _initializePortfolio() internal {
        PortfolioParams memory portfolioParams = PortfolioParams(
            "Portfolio",
            2 * YEAR, /* duration */
            90 * DAY, /* capitalFormationPeriod */
            0 /* minimumSize */
        );

        TrancheInitData[] memory tranchesInitData = new TrancheInitData[](3);
        tranchesInitData[0] = TrancheInitData(
            equityTranche,
            0, /* targetApy */
            0 /* minSubordinateRatio */
        );
        tranchesInitData[1] = TrancheInitData(
            juniorTranche,
            500, /* targetApy */
            0 /* minSubordinateRatio */
        );
        tranchesInitData[2] = TrancheInitData(
            seniorTranche,
            300, /* targetApy */
            0 /* minSubordinateRatio */
        );

        structuredPortfolio = new StructuredPortfolioTest2(
            address(this), /* manager */
            IERC20WithDecimals(address(token)),
            fixedInterestOnlyLoans,
            protocolConfig,
            portfolioParams,
            tranchesInitData,
            ExpectedEquityRate(200, 2000)
        );
    }
}
