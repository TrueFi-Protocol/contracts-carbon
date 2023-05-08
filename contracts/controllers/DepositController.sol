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
import {IDepositController, ILenderVerifier, Status, DepositAllowed} from "../interfaces/IDepositController.sol";
import {ITrancheVault} from "../interfaces/ITrancheVault.sol";

uint256 constant BASIS_PRECISION = 10000;

contract DepositController is IDepositController, Initializable, AccessControlEnumerable {
    /// @dev Manager role used for access control
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    ILenderVerifier public lenderVerifier;
    uint256 public ceiling;
    uint256 public depositFeeRate;

    mapping(Status => bool) public depositAllowed;

    constructor() {}

    function initialize(
        address manager,
        address _lenderVerifier,
        uint256 _depositFeeRate,
        uint256 _ceiling
    ) external initializer {
        _grantRole(MANAGER_ROLE, manager);
        lenderVerifier = ILenderVerifier(_lenderVerifier);
        depositFeeRate = _depositFeeRate;
        depositAllowed[Status.CapitalFormation] = true;

        ceiling = _ceiling;
    }

    function maxDeposit(address receiver) public view returns (uint256) {
        if (!lenderVerifier.isAllowed(receiver)) {
            return 0;
        }

        ITrancheVault tranche = ITrancheVault(msg.sender);
        if (!depositAllowed[tranche.portfolio().status()]) {
            return 0;
        }

        uint256 totalAssets = tranche.totalAssets();
        if (ceiling <= totalAssets) {
            return 0;
        }
        return ceiling - totalAssets;
    }

    function maxMint(address receiver) external view returns (uint256) {
        return previewDeposit(maxDeposit(receiver));
    }

    function onDeposit(
        address,
        uint256 assets,
        address
    ) external view returns (uint256, uint256) {
        uint256 depositFee = _getDepositFee(assets);
        return (previewDeposit(assets), depositFee);
    }

    /**
     * @dev We want to reverse calculations of onDeposit:
     *      onDeposit(assets) = (assets - assets * feeRate) * totalSupply / totalAmount = shares
     *      assets = shares * totalAmount / totalSupply / (1-feeRate) =
     *             = convertToAssetsCeil(shares / (1-feeRate))
     */
    function onMint(
        address,
        uint256 shares,
        address
    ) public view returns (uint256, uint256) {
        uint256 netAssets = ITrancheVault(msg.sender).convertToAssetsCeil(shares);
        uint256 grossAssets = (netAssets * BASIS_PRECISION) / (BASIS_PRECISION - depositFeeRate);
        uint256 depositFee = _getDepositFee(grossAssets);
        return (grossAssets - depositFee, depositFee);
    }

    function previewDeposit(uint256 assets) public view returns (uint256 shares) {
        uint256 depositFee = _getDepositFee(assets);
        return ITrancheVault(msg.sender).convertToShares(assets - depositFee);
    }

    function previewMint(uint256 shares) public view returns (uint256) {
        (uint256 assets, uint256 depositFee) = onMint(address(0), shares, address(0));
        return assets + depositFee;
    }

    function setCeiling(uint256 newCeiling) public {
        _requireManagerRole();
        ceiling = newCeiling;
        emit CeilingChanged(newCeiling);
    }

    function setDepositAllowed(bool newDepositAllowed, Status portfolioStatus) public {
        _requireManagerRole();
        require(portfolioStatus == Status.CapitalFormation || portfolioStatus == Status.Live, "DC: No custom value in Closed");
        depositAllowed[portfolioStatus] = newDepositAllowed;
        emit DepositAllowedChanged(newDepositAllowed, portfolioStatus);
    }

    function setDepositFeeRate(uint256 newFeeRate) public {
        _requireManagerRole();
        depositFeeRate = newFeeRate;
        emit DepositFeeRateChanged(newFeeRate);
    }

    function setLenderVerifier(ILenderVerifier newLenderVerifier) public {
        _requireManagerRole();
        lenderVerifier = newLenderVerifier;
        emit LenderVerifierChanged(newLenderVerifier);
    }

    function configure(
        uint256 newCeiling,
        uint256 newFeeRate,
        ILenderVerifier newLenderVerifier,
        DepositAllowed memory newDepositAllowed
    ) external {
        if (ceiling != newCeiling) {
            setCeiling(newCeiling);
        }
        if (depositFeeRate != newFeeRate) {
            setDepositFeeRate(newFeeRate);
        }
        if (lenderVerifier != newLenderVerifier) {
            setLenderVerifier(newLenderVerifier);
        }
        if (depositAllowed[newDepositAllowed.status] != newDepositAllowed.value) {
            setDepositAllowed(newDepositAllowed.value, newDepositAllowed.status);
        }
    }

    function _getDepositFee(uint256 assets) internal view returns (uint256) {
        return (assets * depositFeeRate) / BASIS_PRECISION;
    }

    function _requireManagerRole() internal view {
        require(hasRole(MANAGER_ROLE, msg.sender), "DC: Only manager");
    }
}
