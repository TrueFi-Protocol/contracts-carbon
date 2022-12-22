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
    /**
     * @notice Event emitted when new defaultProtocolFeeRate is set
     * @param newProtocolFeeRate Newly set protocol fee rate (in BPS)
     */
    event DefaultProtocolFeeRateChanged(uint256 newProtocolFeeRate);

    /**
     * @notice Event emitted when new custom fee rate for a specific address is set
     * @param contractAddress Address of the contract for which new custom fee rate has been set
     * @param newProtocolFeeRate Newly set custom protocol fee rate (in BPS)
     */
    event CustomProtocolFeeRateChanged(address contractAddress, uint16 newProtocolFeeRate);

    /**
     * @notice Event emitted when custom fee rate for a specific address is unset
     * @param contractAddress Address of the contract for which custom fee rate has been unset
     */
    event CustomProtocolFeeRateRemoved(address contractAddress);

    /**
     * @notice Event emitted when new protocolAdmin address is set
     * @param newProtocolAdmin Newly set protocolAdmin address
     */
    event ProtocolAdminChanged(address indexed newProtocolAdmin);

    /**
     * @notice Event emitted when new protocolTreasury address is set
     * @param newProtocolTreasury Newly set protocolTreasury address
     */
    event ProtocolTreasuryChanged(address indexed newProtocolTreasury);

    /**
     * @notice Event emitted when new pauser address is set
     * @param newPauserAddress Newly set pauser address
     */
    event PauserAddressChanged(address indexed newPauserAddress);

    /**
     * @notice Setups the contract with given params
     * @dev Used by Initializable contract (can be called only once)
     * @param _defaultProtocolFeeRate Default fee rate valid for every contract except those with custom fee rate set
     * @param _protocolAdmin Address of the account/contract that should be able to upgrade Upgradeable contracts
     * @param _protocolTreasury Address of the account/contract to which collected fee should be transferred
     * @param _pauserAddress Address of the account/contract that should be grnated PAUSER role on TrueFi Pausable contracts
     */
    function initialize(
        uint256 _defaultProtocolFeeRate,
        address _protocolAdmin,
        address _protocolTreasury,
        address _pauserAddress
    ) external;

    /// @return Protocol fee rate valid for the message sender
    function protocolFeeRate() external view returns (uint256);

    /**
     * @return Protocol fee rate valid for the given address
     * @param contractAddress Address of contract queried for it's protocol fee rate
     */
    function protocolFeeRate(address contractAddress) external view returns (uint256);

    /// @return Default fee rate valid for every contract except those with custom fee rate set
    function defaultProtocolFeeRate() external view returns (uint256);

    /// @return Address of the account/contract that should be able to upgrade Upgradeable contracts
    function protocolAdmin() external view returns (address);

    /// @return Address of the account/contract to which collected fee should be transferred
    function protocolTreasury() external view returns (address);

    /// @return Address of the account/contract that should be grnated PAUSER role on TrueFi Pausable contracts
    function pauserAddress() external view returns (address);

    /**
     * @notice Custom protocol fee rate setter
     * @param contractAddress Address of the contract for which new custom fee rate should be set
     * @param newFeeRate Custom protocol fee rate (in BPS) which should be set for the given address
     */
    function setCustomProtocolFeeRate(address contractAddress, uint16 newFeeRate) external;

    /**
     * @notice Removes custom protocol fee rate from the given contract address
     * @param contractAddress Address of the contract for which custom fee rate should be unset
     */
    function removeCustomProtocolFeeRate(address contractAddress) external;

    /**
     * @notice Default protocol fee rate setter
     * @param newFeeRate New protocol fee rate (in BPS) to set
     */
    function setDefaultProtocolFeeRate(uint256 newFeeRate) external;

    /**
     * @notice Protocol admin address setter
     * @param newProtocolAdmin New protocol admin address to set
     */
    function setProtocolAdmin(address newProtocolAdmin) external;

    /**
     * @notice Protocol treasury address setter
     * @param newProtocolTreasury New protocol treasury address to set
     */
    function setProtocolTreasury(address newProtocolTreasury) external;

    /**
     * @notice TrueFi contracts pauser address setter
     * @param newPauserAddress New pauser address to set
     */
    function setPauserAddress(address newPauserAddress) external;
}
