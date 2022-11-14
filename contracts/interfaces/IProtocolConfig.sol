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

interface IProtocolConfig {
    function protocolFeeRate() external view returns (uint256);

    function protocolFeeRate(address) external view returns (uint256);

    function defaultProtocolFeeRate() external view returns (uint256);

    function protocolAdmin() external view returns (address);

    function protocolTreasury() external view returns (address);

    function pauserAddress() external view returns (address);
}
