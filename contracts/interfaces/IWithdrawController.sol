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

import {Status} from "../interfaces/IStructuredPortfolio.sol";

struct WithdrawAllowed {
    Status status;
    bool value;
}

interface IWithdrawController {
    event FloorChanged(uint256 newFloor);

    event WithdrawAllowedChanged(bool newWithdrawAllowed, Status portfolioStatus);

    event WithdrawFeeRateChanged(uint256 newFeeRate);

    function MANAGER_ROLE() external view returns (bytes32);

    function floor() external view returns (uint256);

    function withdrawFeeRate() external view returns (uint256);

    function withdrawAllowed(Status status) external view returns (bool);

    function initialize(
        address,
        uint256,
        uint256 floor
    ) external;

    function maxWithdraw(address receiver) external view returns (uint256 assets);

    function maxRedeem(address receiver) external view returns (uint256 shares);

    function previewWithdraw(uint256 assets) external view returns (uint256 shares);

    function previewRedeem(uint256 shares) external view returns (uint256 assets);

    function onWithdraw(
        address sender,
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares, uint256 withdrawFee);

    function onRedeem(
        address sender,
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets, uint256 redeemFee);

    function setFloor(uint256 newFloor) external;

    function setWithdrawAllowed(bool newWithdrawAllowed, Status portfolioStatus) external;

    function setWithdrawFeeRate(uint256 newFeeRate) external;

    function configure(
        uint256 newFloor,
        uint256 newFeeRate,
        WithdrawAllowed memory newWithdrawAllowed
    ) external;
}
