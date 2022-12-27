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

import "../StructuredPortfolio.sol";

/**
 * @dev This contract is used to test the StructuredPortfolio contract.
 * The intention is to easily set non-settable values and have access to private methods.
 * Please don't override any StructuredPortfolio methods in this contract.
 */
contract StructuredPortfolioTest is StructuredPortfolio {
    function setTrancheMinSubordinateRatio(uint256 trancheIdx, uint128 ratio) external {
        tranchesData[trancheIdx].minSubordinateRatio = ratio;
    }

    function onPortfolioStart(ITrancheVault tranche) external {
        tranche.onPortfolioStart();
    }

    function setMinimumSize(uint256 newSize) external {
        minimumSize = newSize;
    }

    function mockIncreaseVirtualTokenBalance(uint256 increment) external {
        virtualTokenBalance += increment;
    }

    function mockDecreaseVirtualTokenBalance(uint256 decrement) external {
        virtualTokenBalance -= decrement;
    }

    function getNewLoansDeficit(uint256 currentDeficit, int256 delta) external pure returns (uint256) {
        return _getNewLoansDeficit(currentDeficit, delta);
    }

    function someLoansDefaultedTest() external view returns (bool) {
        return someLoansDefaulted;
    }
}
