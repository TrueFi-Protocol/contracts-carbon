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

import {TrancheVault} from "../TrancheVault.sol";
import {IERC20WithDecimals} from "../interfaces/IERC20WithDecimals.sol";
import {IDepositController} from "../interfaces/IDepositController.sol";
import {IWithdrawController} from "../interfaces/IWithdrawController.sol";
import {ITransferController} from "../interfaces/ITransferController.sol";
import {IProtocolConfig} from "../interfaces/IProtocolConfig.sol";

contract TrancheVaultTest2 is TrancheVault {
    constructor(
        string memory _name,
        string memory _symbol,
        IERC20WithDecimals _token,
        IDepositController _depositController,
        IWithdrawController _withdrawController,
        ITransferController _transferController,
        IProtocolConfig _protocolConfig,
        uint256 _waterfallIndex,
        address manager,
        uint256 _managerFeeRate
    ) {
        initialize(
            _name,
            _symbol,
            _token,
            _depositController,
            _withdrawController,
            _transferController,
            _protocolConfig,
            _waterfallIndex,
            manager,
            _managerFeeRate
        );
    }
}
