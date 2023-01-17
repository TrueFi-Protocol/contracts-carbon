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
import {IERC20WithDecimals} from "../interfaces/IERC20WithDecimals.sol";
import {TrancheVault} from "../TrancheVault.sol";

contract TrancheVaultHarness is TrancheVault {
    using SafeERC20 for IERC20WithDecimals;

    function tokenTransferHarness(
        address from,
        address to,
        uint256 amount
    ) external {
        require(from != address(this) && from != address(portfolio));
        token.safeTransferFrom(from, to, amount);
    }

    function setCustomProtocolFeeRateHarness(address contractAddress, uint16 newFeeRate) public {
        protocolConfig.setCustomProtocolFeeRate(contractAddress, newFeeRate);
    }

    function removeCustomProtocolFeeRateHarness(address contractAddress) public {
        protocolConfig.removeCustomProtocolFeeRate(contractAddress);
    }

    function setDefaultProtocolFeeRate(uint256 newFeeRate) public {
        protocolConfig.setDefaultProtocolFeeRate(newFeeRate);
    }
}
