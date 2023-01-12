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

import {IProtocolConfig} from "./interfaces/IProtocolConfig.sol";
import {Upgradeable} from "./proxy/Upgradeable.sol";

struct CustomFeeRate {
    bool isSet;
    uint16 feeRate;
}

contract ProtocolConfig is Upgradeable, IProtocolConfig {
    uint256 public defaultProtocolFeeRate;
    address public protocolAdmin;
    address public protocolTreasury;
    address public pauserAddress;

    mapping(address => CustomFeeRate) internal customFeeRates;

    function initialize(
        uint256 _defaultProtocolFeeRate,
        address _protocolAdmin,
        address _protocolTreasury,
        address _pauserAddress
    ) external initializer {
        __Upgradeable_init(msg.sender, _pauserAddress);
        defaultProtocolFeeRate = _defaultProtocolFeeRate;
        protocolAdmin = _protocolAdmin;
        protocolTreasury = _protocolTreasury;
        pauserAddress = _pauserAddress;
    }

    function protocolFeeRate() external view returns (uint256) {
        return _protocolFeeRate(msg.sender);
    }

    function protocolFeeRate(address contractAddress) external view returns (uint256) {
        return _protocolFeeRate(contractAddress);
    }

    function _protocolFeeRate(address contractAddress) internal view returns (uint256) {
        CustomFeeRate memory customFeeRate = customFeeRates[contractAddress];
        return customFeeRate.isSet ? customFeeRate.feeRate : defaultProtocolFeeRate;
    }

    function setCustomProtocolFeeRate(address contractAddress, uint16 newFeeRate) external {
        _requireDefaultAdminRole();

        CustomFeeRate memory customFeeRate = customFeeRates[contractAddress];
        require(!customFeeRate.isSet || newFeeRate != customFeeRate.feeRate, "PC: Fee already set");

        customFeeRates[contractAddress] = CustomFeeRate({isSet: true, feeRate: newFeeRate});

        emit CustomProtocolFeeRateChanged(contractAddress, newFeeRate);
    }

    function removeCustomProtocolFeeRate(address contractAddress) external {
        _requireDefaultAdminRole();
        require(customFeeRates[contractAddress].isSet, "PC: No fee rate to remove");
        customFeeRates[contractAddress] = CustomFeeRate({isSet: false, feeRate: 0});
        emit CustomProtocolFeeRateRemoved(contractAddress);
    }

    function setDefaultProtocolFeeRate(uint256 newFeeRate) external {
        _requireDefaultAdminRole();
        require(newFeeRate != defaultProtocolFeeRate, "PC: Fee already set");
        defaultProtocolFeeRate = newFeeRate;
        emit DefaultProtocolFeeRateChanged(newFeeRate);
    }

    function setProtocolAdmin(address newProtocolAdmin) external {
        _requireDefaultAdminRole();
        require(newProtocolAdmin != protocolAdmin, "PC: Admin already set");
        protocolAdmin = newProtocolAdmin;
        emit ProtocolAdminChanged(newProtocolAdmin);
    }

    function setProtocolTreasury(address newProtocolTreasury) external {
        _requireDefaultAdminRole();
        require(newProtocolTreasury != protocolTreasury, "PC: Treasury already set");
        protocolTreasury = newProtocolTreasury;
        emit ProtocolTreasuryChanged(newProtocolTreasury);
    }

    function setPauserAddress(address newPauserAddress) external {
        _requireDefaultAdminRole();
        require(newPauserAddress != pauserAddress, "PC: Pauser already set");
        pauserAddress = newPauserAddress;
        emit PauserAddressChanged(newPauserAddress);
    }

    function _requireDefaultAdminRole() internal view {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "PC: Only default admin");
    }
}
