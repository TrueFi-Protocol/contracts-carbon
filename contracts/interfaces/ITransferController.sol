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

interface ITransferController {
    /**
     * @notice Setup contract with given params
     * @dev Used by Initializable contract (can be called only once)
     * @param manager Address to which MANAGER_ROLE should be granted
     */
    function initialize(address manager) external;

    /**
     * @notice Verifies TrancheVault shares transfers
     * @return isTransferAllowed Value indicating whether TrancheVault shares transfer with given params is allowed
     * @param sender Transfer transaction sender address
     * @param from Transferred funds owner address
     * @param to Transferred funds recipient address
     * @param value Transferred assets amount
     */
    function onTransfer(
        address sender,
        address from,
        address to,
        uint256 value
    ) external view returns (bool isTransferAllowed);
}
