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

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {ITrancheVault} from "../interfaces/ITrancheVault.sol";
import {IWithdrawController} from "../interfaces/IWithdrawController.sol";
import {Status} from "../interfaces/IStructuredPortfolio.sol";

uint256 constant BASIS_PRECISION = 10000;

struct WithdrawAllowed {
    Status status;
    bool value;
}

contract WithdrawController is IWithdrawController, Initializable, AccessControlEnumerable {
    /// @dev Manager role used for access control
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    uint256 public floor;
    uint256 public withdrawFeeRate;
    mapping(Status => bool) public withdrawAllowed;

    event FloorChanged(uint256 newFloor);
    event WithdrawAllowedChanged(bool newWithdrawAllowed, Status portfolioStatus);
    event WithdrawFeeRateChanged(uint256 newFeeRate);

    constructor() {}

    function initialize(
        address manager,
        uint256 _withdrawFeeRate,
        uint256 _floor
    ) external initializer {
        withdrawFeeRate = _withdrawFeeRate;
        _grantRole(MANAGER_ROLE, manager);
        withdrawAllowed[Status.Closed] = true;

        floor = _floor;
    }

    function maxWithdraw(address owner) public view returns (uint256) {
        ITrancheVault vault = ITrancheVault(msg.sender);
        Status status = vault.portfolio().status();
        if (!withdrawAllowed[status]) {
            return 0;
        }

        uint256 ownerShares = vault.balanceOf(owner);
        uint256 userMaxWithdraw = vault.convertToAssets(ownerShares);
        if (status == Status.Closed) {
            return userMaxWithdraw;
        }

        uint256 globalMaxWithdraw = _globalMaxWithdraw(vault);

        return Math.min(userMaxWithdraw, globalMaxWithdraw);
    }

    function maxRedeem(address owner) external view returns (uint256) {
        ITrancheVault vault = ITrancheVault(msg.sender);
        Status status = vault.portfolio().status();
        if (!withdrawAllowed[status]) {
            return 0;
        }

        uint256 userMaxRedeem = vault.balanceOf(owner);
        if (status == Status.Closed) {
            return userMaxRedeem;
        }

        uint256 globalMaxWithdraw = _globalMaxWithdraw(vault);
        uint256 globalMaxRedeem = vault.convertToShares(globalMaxWithdraw);

        return Math.min(userMaxRedeem, globalMaxRedeem);
    }

    function _globalMaxWithdraw(ITrancheVault vault) internal view returns (uint256) {
        uint256 totalAssets = vault.totalAssets();
        return totalAssets > floor ? totalAssets - floor : 0;
    }

    function onWithdraw(
        address,
        uint256 assets,
        address,
        address
    ) external view returns (uint256, uint256) {
        uint256 withdrawFee = _getWithdrawFee(assets);
        return (previewWithdraw(assets), withdrawFee);
    }

    function onRedeem(
        address,
        uint256 shares,
        address,
        address
    ) external view returns (uint256, uint256) {
        uint256 assets = ITrancheVault(msg.sender).convertToAssets(shares);
        uint256 withdrawFee = _getWithdrawFee(assets);
        return (assets - withdrawFee, withdrawFee);
    }

    function previewRedeem(uint256 shares) public view returns (uint256) {
        uint256 assets = ITrancheVault(msg.sender).convertToAssets(shares);
        uint256 withdrawFee = _getWithdrawFee(assets);
        return assets - withdrawFee;
    }

    function previewWithdraw(uint256 assets) public view returns (uint256) {
        uint256 withdrawFee = _getWithdrawFee(assets);
        return ITrancheVault(msg.sender).convertToSharesCeil(assets + withdrawFee);
    }

    function setFloor(uint256 newFloor) public {
        _requireManagerRole();
        floor = newFloor;
        emit FloorChanged(newFloor);
    }

    function setWithdrawAllowed(bool newWithdrawAllowed, Status portfolioStatus) public {
        _requireManagerRole();
        require(portfolioStatus == Status.CapitalFormation || portfolioStatus == Status.Live, "WC: No custom value in Closed");
        withdrawAllowed[portfolioStatus] = newWithdrawAllowed;
        emit WithdrawAllowedChanged(newWithdrawAllowed, portfolioStatus);
    }

    function setWithdrawFeeRate(uint256 newFeeRate) public {
        _requireManagerRole();
        withdrawFeeRate = newFeeRate;
        emit WithdrawFeeRateChanged(newFeeRate);
    }

    function configure(
        uint256 newFloor,
        uint256 newFeeRate,
        WithdrawAllowed memory newWithdrawAllowed
    ) external {
        if (floor != newFloor) {
            setFloor(newFloor);
        }
        if (withdrawFeeRate != newFeeRate) {
            setWithdrawFeeRate(newFeeRate);
        }
        if (withdrawAllowed[newWithdrawAllowed.status] != newWithdrawAllowed.value) {
            setWithdrawAllowed(newWithdrawAllowed.value, newWithdrawAllowed.status);
        }
    }

    function _getWithdrawFee(uint256 assets) internal view returns (uint256) {
        return (assets * withdrawFeeRate) / BASIS_PRECISION;
    }

    function _requireManagerRole() internal view {
        require(hasRole(MANAGER_ROLE, msg.sender), "WC: Only manager");
    }
}
