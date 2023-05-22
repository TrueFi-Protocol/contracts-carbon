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

import {IERC20WithDecimals} from "../interfaces/IERC20WithDecimals.sol";
import {FixedInterestOnlyLoans} from "../test/FixedInterestOnlyLoans.sol";
import {FixedInterestOnlyLoansTest} from "../test/FixedInterestOnlyLoansTest.sol";
import {TrancheVault} from "../TrancheVault.sol";
import {TrancheVaultTest2} from "../test/TrancheVaultTest2.sol";
import {ProtocolConfig} from "../ProtocolConfig.sol";
import {ProtocolConfigTest} from "../test/ProtocolConfigTest.sol";
import {AllowAllLenderVerifier} from "../lenderVerifiers/AllowAllLenderVerifier.sol";
import {DepositController} from "../controllers/DepositController.sol";
import {WithdrawController} from "../controllers/WithdrawController.sol";
import {TransferController} from "../controllers/TransferController.sol";
import {MockToken} from "../mocks/MockToken.sol";
import {TrancheInitData, PortfolioParams, ExpectedEquityRate, YEAR, BASIS_PRECISION} from "../interfaces/IStructuredPortfolio.sol";
import {StructuredPortfolio, Status} from "../StructuredPortfolio.sol";
import {StructuredPortfolioTest2} from "../test/StructuredPortfolioTest2.sol";
import {AddLoanParams} from "../LoansManager.sol";
import {StructuredPortfolioTest} from "../test/StructuredPortfolioTest.sol";
import {FuzzingBorrower} from "./FuzzingBorrower.sol";
import {FuzzingLender} from "./FuzzingLender.sol";
import {FuzzingManager} from "./FuzzingManager.sol";
import {PropertiesAsserts} from "@crytic/properties/contracts/util/PropertiesHelper.sol";

uint256 constant DAY = 1 days;

contract StructuredPortfolioFuzzingInit is PropertiesAsserts {
    MockToken public token;
    ProtocolConfig public protocolConfig;
    FixedInterestOnlyLoans public fixedInterestOnlyLoans;
    AllowAllLenderVerifier public lenderVerifier;
    TrancheVault public equityTranche;
    TrancheVault public juniorTranche;
    TrancheVault public seniorTranche;
    StructuredPortfolioTest2 public structuredPortfolio;
    FuzzingBorrower public borrower;
    FuzzingLender public lender;
    FuzzingManager public manager;

    uint256 internal activeLoansCount;
    uint256 internal totalLoansCount;

    uint256[] internal initialTrancheValues;

    uint256 internal constant FEE_RATE = (BASIS_PRECISION * 5) / 1000;

    constructor() {
        _initializeToken();
        _initializeManager();
        _initializeProtocolConfig();
        _initializeFixedInterestOnlyLoans();
        _initializeLenderVerifier();
        equityTranche = _initializeTranche(
            "Equity Tranche",
            "EQT",
            0,
            10**9 * 10**token.decimals() /* ceiling */
        );
        juniorTranche = _initializeTranche(
            "Junior Tranche",
            "JNT",
            1,
            10**9 * 10**token.decimals() /* ceiling */
        );
        seniorTranche = _initializeTranche(
            "Senior Tranche",
            "SNT",
            2,
            10**9 * 10**token.decimals() /* ceiling */
        );
        _initializePortfolio();

        _initializeLender();
        _initializeBorrower();

        _fillTranches();
        _startPortfolio();
        _createAndFundLoans();

        _initializeAuxiliaryVariables();
    }

    function _initializeToken() internal {
        token = new MockToken(
            6 /* decimals */
        );
        token.mint(address(this), 1e6 * 10**token.decimals());
    }

    function _initializeManager() internal {
        manager = new FuzzingManager();
        token.mint(address(manager), 1e6 * 10**token.decimals());
    }

    function _initializeProtocolConfig() internal {
        protocolConfig = new ProtocolConfigTest(
            FEE_RATE, /* _defaultProtocolFeeRate */
            address(manager), /* _protocolAdmin */
            address(manager), /* _protocolTreasury */
            address(manager) /* _pauserAddress */
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
            address(manager), /* manager */
            address(lenderVerifier),
            FEE_RATE, /* _depositFeeRate */
            ceiling
        );
        manager.setDepositAllowed(depositController, true, Status.Live);
        WithdrawController withdrawController = new WithdrawController();
        withdrawController.initialize(
            address(manager), /* manager */
            FEE_RATE, /* _withdrawFeeRate */
            10**token.decimals() /* _floor */
        );
        manager.setWithdrawAllowed(withdrawController, true, Status.Live);
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
            address(manager), /* manager */
            FEE_RATE /* _managerFeeRate */
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
            uint128((BASIS_PRECISION * 5) / 100), /* targetApy */
            0 /* minSubordinateRatio */
        );
        tranchesInitData[2] = TrancheInitData(
            seniorTranche,
            uint128((BASIS_PRECISION * 3) / 100), /* targetApy */
            0 /* minSubordinateRatio */
        );

        structuredPortfolio = new StructuredPortfolioTest2(
            address(manager), /* manager */
            IERC20WithDecimals(address(token)),
            fixedInterestOnlyLoans,
            protocolConfig,
            portfolioParams,
            tranchesInitData,
            ExpectedEquityRate((BASIS_PRECISION * 2) / 100, (BASIS_PRECISION * 20) / 100)
        );
    }

    function _initializeLender() internal {
        lender = new FuzzingLender();
        token.mint(address(lender), 1e10 * 10**token.decimals());
    }

    function _initializeBorrower() internal {
        borrower = new FuzzingBorrower();
        token.mint(address(borrower), 1e10 * 10**token.decimals());
    }

    function _fillTranches() internal {
        lender.deposit(equityTranche, 2e6 * 10**token.decimals());
        lender.deposit(juniorTranche, 3e6 * 10**token.decimals());
        lender.deposit(seniorTranche, 5e6 * 10**token.decimals());
    }

    function _startPortfolio() internal {
        manager.start(structuredPortfolio);
    }

    function _createAndFundLoans() internal {
        AddLoanParams memory params1 = AddLoanParams(
            3e6 * 10**token.decimals(), /* principal */
            3, /* periodCount */
            2e4 * 10**token.decimals(), /* periodPayment */
            uint32(DAY), /* periodDuration */
            address(borrower), /* recipient */
            uint32(DAY), /* gracePeriod */
            true /* canBeRepaidAfterDefault */
        );
        manager.addLoan(structuredPortfolio, params1);
        totalLoansCount += 1;
        borrower.acceptLoan(fixedInterestOnlyLoans, 0);
        manager.fundLoan(structuredPortfolio, 0);
        activeLoansCount += 1;

        AddLoanParams memory params2 = AddLoanParams(
            6e6 * 10**token.decimals(), /* principal */
            10, /* periodCount */
            2e4 * 10**token.decimals(), /* periodPayment */
            uint32(DAY), /* periodDuration */
            address(borrower), /* recipient */
            uint32(DAY), /* gracePeriod */
            true /* canBeRepaidAfterDefault */
        );
        manager.addLoan(structuredPortfolio, params2);
        totalLoansCount += 1;
        borrower.acceptLoan(fixedInterestOnlyLoans, 1);
        manager.fundLoan(structuredPortfolio, 1);
        activeLoansCount += 1;
    }

    function _initializeAuxiliaryVariables() internal {
        initialTrancheValues = [equityTranche.totalAssets(), juniorTranche.totalAssets(), seniorTranche.totalAssets()];
    }
}
