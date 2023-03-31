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
import {ITrancheVault, Checkpoint} from "../interfaces/ITrancheVault.sol";

contract FuzzingLender {
    function deposit(ITrancheVault tranche, uint256 amount) external {
        IERC20WithDecimals(tranche.asset()).approve(address(tranche), amount);
        tranche.deposit(amount, address(this));
    }

    function withdraw(ITrancheVault tranche, uint256 amount) external {
        tranche.withdraw(amount, address(this), address(this));
    }
}
