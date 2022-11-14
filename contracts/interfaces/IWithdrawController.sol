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

interface IWithdrawController {
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
}
