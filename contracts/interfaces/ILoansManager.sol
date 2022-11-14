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

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

struct AddLoanParams {
    uint256 principal;
    uint16 periodCount;
    uint256 periodPayment;
    uint32 periodDuration;
    address recipient;
    uint32 gracePeriod;
    bool canBeRepaidAfterDefault;
}

/// @title Manager of a Structured Portfolio's active loans
interface ILoansManager is IAccessControlUpgradeable {

}
