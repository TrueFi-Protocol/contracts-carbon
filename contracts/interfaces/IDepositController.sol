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

interface IDepositController {
    function initialize(
        address manager,
        address lenderVerfier,
        uint256 _depositFeeRate,
        uint256 ceiling
    ) external;

    function maxDeposit(address receiver) external view returns (uint256 assets);

    function maxMint(address receiver) external view returns (uint256 shares);

    function previewDeposit(uint256 assets) external view returns (uint256 shares);

    function previewMint(uint256 shares) external view returns (uint256 assets);

    function onDeposit(
        address sender,
        uint256 assets,
        address receiver
    ) external returns (uint256 shares, uint256 depositFee);

    function onMint(
        address sender,
        uint256 shares,
        address receiver
    ) external returns (uint256 assets, uint256 mintFee);
}
