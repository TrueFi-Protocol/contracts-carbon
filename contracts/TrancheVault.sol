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

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IDepositController} from "./interfaces/IDepositController.sol";
import {IWithdrawController} from "./interfaces/IWithdrawController.sol";
import {ITrancheVault, SizeRange, Checkpoint, Configuration} from "./interfaces/ITrancheVault.sol";
import {ITransferController} from "./interfaces/ITransferController.sol";
import {IERC20WithDecimals} from "./interfaces/IERC20WithDecimals.sol";
import {IStructuredPortfolio, Status, BASIS_PRECISION, YEAR} from "./interfaces/IStructuredPortfolio.sol";
import {IProtocolConfig} from "./interfaces/IProtocolConfig.sol";
import {IPausable} from "./interfaces/IPausable.sol";
import {Upgradeable} from "./proxy/Upgradeable.sol";

contract TrancheVault is ITrancheVault, ERC20Upgradeable, Upgradeable {
    using SafeERC20 for IERC20WithDecimals;

    /// @dev Tranche manager role used for access control
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE"); // 0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08

    /// @dev Role used to access tranche controllers setters
    bytes32 public constant TRANCHE_CONTROLLER_OWNER_ROLE = keccak256("TRANCHE_CONTROLLER_OWNER_ROLE"); // 0x5b4e632df2edce09667a379f949ff4559a6f6e163b09e2e961c6950a280403b4

    IERC20WithDecimals internal token;
    IStructuredPortfolio public portfolio;
    IDepositController public depositController;
    IWithdrawController public withdrawController;
    ITransferController public transferController;
    IProtocolConfig public protocolConfig;
    uint256 public waterfallIndex;
    Checkpoint public checkpoint;
    uint256 public unpaidProtocolFee;
    uint256 public unpaidManagerFee;
    address public managerFeeBeneficiary;
    uint256 public managerFeeRate;
    uint256 public virtualTokenBalance;
    uint256 internal totalAssetsCache;

    event DepositControllerChanged(IDepositController indexed newController);
    event WithdrawControllerChanged(IWithdrawController indexed newController);
    event TransferControllerChanged(ITransferController indexed newController);

    modifier portfolioNotPaused() {
        require(!IPausable(address(portfolio)).paused(), "TV: Portfolio is paused");
        _;
    }

    constructor() {}

    modifier cacheTotalAssets() {
        totalAssetsCache = totalAssets();
        _;
        totalAssetsCache = 0;
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        IERC20WithDecimals _token,
        IDepositController _depositController,
        IWithdrawController _withdrawController,
        ITransferController _transferController,
        IProtocolConfig _protocolConfig,
        uint256 _waterfallIndex,
        address manager,
        uint256 _managerFeeRate
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __Upgradeable_init(_protocolConfig.protocolAdmin(), address(0));

        _grantRole(TRANCHE_CONTROLLER_OWNER_ROLE, manager);
        _grantRole(MANAGER_ROLE, manager);

        token = _token;
        depositController = _depositController;
        withdrawController = _withdrawController;
        transferController = _transferController;
        protocolConfig = _protocolConfig;
        waterfallIndex = _waterfallIndex;
        managerFeeBeneficiary = manager;
        managerFeeRate = _managerFeeRate;
    }

    // -- ERC4626 methods --
    function decimals() public view virtual override(ERC20Upgradeable, IERC20MetadataUpgradeable) returns (uint8) {
        return token.decimals();
    }

    function asset() external view returns (address) {
        return address(token);
    }

    function totalAssets() public view virtual override returns (uint256) {
        if (totalAssetsCache != 0) {
            return totalAssetsCache;
        }
        uint256 balance = totalAssetsWithoutFees();
        uint256 pendingFees = totalPendingFees();
        return balance > pendingFees ? balance - pendingFees : 0;
    }

    function totalAssetsWithoutFees() public view returns (uint256) {
        if (portfolio.status() == Status.Live) {
            return portfolio.calculateWaterfallForTrancheWithoutFee(waterfallIndex);
        }

        return virtualTokenBalance;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 _totalAssets = totalAssets();
        if (portfolio.status() == Status.CapitalFormation || _totalAssets == 0) {
            return assets;
        }
        return (assets * totalSupply()) / _totalAssets;
    }

    function convertToSharesCeil(uint256 assets) public view returns (uint256) {
        uint256 _totalAssets = totalAssets();
        if (portfolio.status() == Status.CapitalFormation || _totalAssets == 0) {
            return assets;
        }
        return Math.ceilDiv(assets * totalSupply(), _totalAssets);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (portfolio.status() == Status.CapitalFormation || _totalSupply == 0) {
            return shares;
        }

        return (shares * totalAssets()) / _totalSupply;
    }

    function convertToAssetsCeil(uint256 shares) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (portfolio.status() == Status.CapitalFormation || _totalSupply == 0) {
            return shares;
        }

        return Math.ceilDiv(shares * totalAssets(), _totalSupply);
    }

    function maxDeposit(address receiver) public view returns (uint256) {
        if (portfolio.status() == Status.Live) {
            if (totalSupply() != 0 && totalAssets() == 0) {
                return 0;
            }
        }

        return depositController.maxDeposit(receiver);
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        return depositController.previewDeposit(assets);
    }

    function deposit(uint256 amount, address receiver) external cacheTotalAssets portfolioNotPaused returns (uint256) {
        require(amount <= maxDeposit(msg.sender), "TV: Amount exceeds max deposit");
        (uint256 shares, uint256 depositFee) = depositController.onDeposit(msg.sender, amount, receiver);

        _payDepositFee(depositFee);
        _depositAssets(amount - depositFee, shares, receiver);

        return shares;
    }

    function _depositAssets(
        uint256 amount,
        uint256 shares,
        address receiver
    ) internal {
        Status status = portfolio.status();

        if (status == Status.Live) {
            uint256 newTotalAssets = totalAssets() + amount;
            portfolio.checkTranchesRatiosFromTranche(newTotalAssets);
            _updateCheckpoint(newTotalAssets);
            token.safeTransferFrom(msg.sender, address(portfolio), amount);
            portfolio.increaseVirtualTokenBalance(amount);
        } else {
            token.safeTransferFrom(msg.sender, address(this), amount);
            virtualTokenBalance += amount;
        }

        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, amount, shares);
    }

    function maxMint(address receiver) external view returns (uint256) {
        return depositController.maxMint(receiver);
    }

    function previewMint(uint256 shares) public view returns (uint256) {
        return depositController.previewMint(shares);
    }

    function mint(uint256 shares, address receiver) external cacheTotalAssets portfolioNotPaused returns (uint256) {
        (uint256 assetAmount, uint256 depositFee) = depositController.onMint(msg.sender, shares, receiver);
        require(assetAmount > 0, "TV: Cannot deposit 0 assets");
        require(assetAmount <= maxDeposit(msg.sender), "TV: Exceeds max mint amount");

        _payDepositFee(depositFee);
        _depositAssets(assetAmount, shares, receiver);

        return assetAmount;
    }

    function maxWithdraw(address owner) public view returns (uint256) {
        if (totalAssets() == 0) {
            return 0;
        }

        return withdrawController.maxWithdraw(owner);
    }

    function previewWithdraw(uint256 assets) public view returns (uint256) {
        return withdrawController.previewWithdraw(assets);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external cacheTotalAssets portfolioNotPaused returns (uint256) {
        require(assets <= maxWithdraw(owner), "TV: Amount exceeds max withdraw");

        (uint256 shares, uint256 withdrawFee) = withdrawController.onWithdraw(msg.sender, assets, receiver, owner);

        _payWithdrawFee(withdrawFee);
        _withdrawAssets(assets, shares, owner, receiver);

        return shares;
    }

    function _withdrawAssets(
        uint256 assets,
        uint256 shares,
        address owner,
        address receiver
    ) internal {
        _safeBurn(owner, shares);

        Status status = portfolio.status();

        if (status != Status.CapitalFormation) {
            uint256 newTotalAssets = totalAssets() - assets;
            if (status == Status.Live) {
                portfolio.checkTranchesRatiosFromTranche(newTotalAssets);
            }
            _updateCheckpoint(newTotalAssets);
        }

        _transferAssets(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function maxRedeem(address owner) public view returns (uint256) {
        if (totalAssets() == 0) {
            return 0;
        }

        return withdrawController.maxRedeem(owner);
    }

    function previewRedeem(uint256 shares) public view returns (uint256) {
        return withdrawController.previewRedeem(shares);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external cacheTotalAssets portfolioNotPaused returns (uint256) {
        require(shares <= maxRedeem(owner), "TV: Amount exceeds max redeem");

        (uint256 assets, uint256 withdrawFee) = withdrawController.onRedeem(msg.sender, shares, receiver, owner);

        _payWithdrawFee(withdrawFee);
        _withdrawAssets(assets, shares, owner, receiver);

        return assets;
    }

    // -- ERC20 methods --
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override portfolioNotPaused {
        bool canTransfer = transferController.onTransfer(sender, sender, recipient, amount);
        require(canTransfer, "TV: Transfer not allowed");
        super._transfer(sender, recipient, amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal override portfolioNotPaused {
        super._approve(owner, spender, amount);
    }

    // -- ERC165 methods --
    function supportsInterface(bytes4 interfaceID) public view override(AccessControlEnumerableUpgradeable, IERC165) returns (bool) {
        return (interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IERC20).interfaceId ||
            interfaceID == type(IERC4626).interfaceId ||
            super.supportsInterface(interfaceID));
    }

    // -- non ERC methods --
    function getCheckpoint() external view returns (Checkpoint memory) {
        return checkpoint;
    }

    function configure(Configuration memory newConfiguration) external {
        if (newConfiguration.managerFeeRate != managerFeeRate) {
            setManagerFeeRate(newConfiguration.managerFeeRate);
        }
        if (newConfiguration.managerFeeBeneficiary != managerFeeBeneficiary) {
            setManagerFeeBeneficiary(newConfiguration.managerFeeBeneficiary);
        }
        if (newConfiguration.depositController != depositController) {
            setDepositController(newConfiguration.depositController);
        }
        if (newConfiguration.withdrawController != withdrawController) {
            setWithdrawController(newConfiguration.withdrawController);
        }
    }

    function onPortfolioStart() external returns (uint256) {
        _requirePortfolio();

        uint256 balance = virtualTokenBalance;
        _transferFromTranche(address(portfolio), balance);
        _updateCheckpoint(balance);

        return balance;
    }

    function onTransfer(uint256 assets) external {
        _requirePortfolio();
        virtualTokenBalance += assets;
    }

    function updateCheckpoint() external portfolioNotPaused {
        require(portfolio.status() == Status.Closed, "TV: Only in Closed status");
        _updateCheckpoint(totalAssets());
    }

    function updateCheckpointFromPortfolio(uint256 newTotalAssets) external {
        _requirePortfolio();
        _updateCheckpoint(newTotalAssets);
    }

    /**
     * @param newTotalAssets Total assets value to save in checkpoint with fees deducted
     */
    function _updateCheckpoint(uint256 newTotalAssets) internal {
        if (portfolio.status() == Status.CapitalFormation) {
            return;
        }

        uint256 _pendingProtocolFee = pendingProtocolFee();
        uint256 _pendingManagerFee = pendingManagerFee();

        _payProtocolFee(_pendingProtocolFee);
        _payManagerFee(_pendingManagerFee);

        uint256 protocolFeeRate = protocolConfig.protocolFeeRate();
        checkpoint = Checkpoint({totalAssets: newTotalAssets, protocolFeeRate: protocolFeeRate, timestamp: block.timestamp});

        emit CheckpointUpdated(newTotalAssets, protocolFeeRate);
    }

    function _payProtocolFee(uint256 pendingFee) internal {
        address protocolAddress = protocolConfig.protocolTreasury();
        (uint256 paidProtocolFee, uint256 _unpaidProtocolFee) = _payFee(pendingFee, protocolAddress);
        unpaidProtocolFee += _unpaidProtocolFee;
        emit ProtocolFeePaid(protocolAddress, paidProtocolFee);
    }

    function _payManagerFee(uint256 pendingFee) internal {
        (uint256 paidManagerFee, uint256 _unpaidManagerFee) = _payFee(pendingFee, managerFeeBeneficiary);
        unpaidManagerFee += _unpaidManagerFee;
        emit ManagerFeePaid(managerFeeBeneficiary, paidManagerFee);
    }

    function _payDepositFee(uint256 fee) internal {
        if (fee == 0) {
            return;
        }
        token.safeTransferFrom(msg.sender, managerFeeBeneficiary, fee);
        emit ManagerFeePaid(managerFeeBeneficiary, fee);
    }

    function _payWithdrawFee(uint256 fee) internal {
        if (fee == 0) {
            return;
        }
        _transferAssets(managerFeeBeneficiary, fee);
        emit ManagerFeePaid(managerFeeBeneficiary, fee);
    }

    function _transferAssets(address to, uint256 assets) internal {
        if (portfolio.status() == Status.Live) {
            _transferFromPortfolio(to, assets);
        } else {
            _transferFromTranche(to, assets);
        }
    }

    function _transferFromTranche(address to, uint256 assets) internal {
        token.safeTransfer(to, assets);
        virtualTokenBalance -= assets;
    }

    function _transferFromPortfolio(address to, uint256 assets) internal {
        token.safeTransferFrom(address(portfolio), to, assets);
        portfolio.decreaseVirtualTokenBalance(assets);
    }

    function _payFee(uint256 fee, address recipient) internal returns (uint256 paidFee, uint256 unpaidFee) {
        if (fee == 0) {
            return (0, 0);
        }

        if (portfolio.status() == Status.Live) {
            return _payFeeInLive(recipient, fee);
        } else {
            return _payFeeInClosed(recipient, fee);
        }
    }

    function _payFeeInLive(address recipient, uint256 fee) internal returns (uint256 paidFee, uint256 unpaidFee) {
        uint256 balance = portfolio.virtualTokenBalance();
        if (fee > balance) {
            paidFee = balance;
            unpaidFee = fee - balance;
        } else {
            paidFee = fee;
            unpaidFee = 0;
        }

        _transferFromPortfolio(recipient, paidFee);
    }

    function _payFeeInClosed(address recipient, uint256 fee) internal returns (uint256 paidFee, uint256 unpaidFee) {
        uint256 balance = virtualTokenBalance;
        if (fee > balance) {
            paidFee = balance;
            unpaidFee = fee - balance;
        } else {
            paidFee = fee;
            unpaidFee = 0;
        }

        _transferFromTranche(recipient, paidFee);
    }

    function totalPendingFees() public view returns (uint256) {
        return pendingProtocolFee() + pendingManagerFee();
    }

    function pendingProtocolFee() public view returns (uint256) {
        return _accruedProtocolFee() + unpaidProtocolFee;
    }

    function pendingManagerFee() public view returns (uint256) {
        return _accruedManagerFee() + unpaidManagerFee;
    }

    function totalAccruedFees() external view returns (uint256) {
        return _accruedProtocolFee() + _accruedManagerFee();
    }

    function _accruedProtocolFee() internal view returns (uint256) {
        return _accruedFee(checkpoint.protocolFeeRate);
    }

    function _accruedManagerFee() internal view returns (uint256) {
        if (portfolio.status() != Status.Live) {
            return 0;
        }
        return _accruedFee(managerFeeRate);
    }

    function _accruedFee(uint256 feeRate) internal view returns (uint256) {
        if (checkpoint.timestamp == 0) {
            return 0;
        }
        uint256 adjustedTotalAssets = (block.timestamp - checkpoint.timestamp) * totalAssetsWithoutFees();
        return (adjustedTotalAssets * feeRate) / YEAR / BASIS_PRECISION;
    }

    function setDepositController(IDepositController newController) public {
        _requireTrancheControllerOwnerRole();
        depositController = newController;
        emit DepositControllerChanged(newController);
    }

    function setWithdrawController(IWithdrawController newController) public {
        _requireTrancheControllerOwnerRole();
        withdrawController = newController;
        emit WithdrawControllerChanged(newController);
    }

    function setTransferController(ITransferController newController) public {
        _requireTrancheControllerOwnerRole();
        transferController = newController;
        emit TransferControllerChanged(newController);
    }

    function setManagerFeeRate(uint256 _managerFeeRate) public {
        _requireManagerRole();
        _updateCheckpoint(totalAssets());

        managerFeeRate = _managerFeeRate;

        emit ManagerFeeRateChanged(_managerFeeRate);
    }

    function setManagerFeeBeneficiary(address _managerFeeBeneficiary) public {
        _requireManagerRole();
        _updateCheckpoint(totalAssets());

        managerFeeBeneficiary = _managerFeeBeneficiary;

        emit ManagerFeeBeneficiaryChanged(_managerFeeBeneficiary);
    }

    function _requireManagerRole() internal view {
        require(hasRole(MANAGER_ROLE, msg.sender), "TV: Only manager");
    }

    function _requireTrancheControllerOwnerRole() internal view {
        require(hasRole(TRANCHE_CONTROLLER_OWNER_ROLE, msg.sender), "TV: Only tranche controller owner");
    }

    function _requirePortfolio() internal view {
        require(msg.sender == address(portfolio), "TV: Sender is not portfolio");
    }

    function setPortfolio(IStructuredPortfolio _portfolio) external {
        require(address(portfolio) == address(0), "TV: Portfolio already set");
        portfolio = _portfolio;
    }

    function _safeBurn(address owner, uint256 shares) internal {
        if (owner == msg.sender) {
            _burn(owner, shares);
            return;
        }

        uint256 sharesAllowance = allowance(owner, msg.sender);
        require(sharesAllowance >= shares, "TV: Insufficient allowance");
        _burn(owner, shares);
        _approve(owner, msg.sender, sharesAllowance - shares);
    }
}
