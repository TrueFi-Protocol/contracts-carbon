// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    uint8 public _decimals;
    mapping(address => bool) private _failTransfers;

    constructor(uint8 __decimals) ERC20("MockToken", "MT") {
        _decimals = __decimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address receiver, uint256 amount) external {
        _mint(receiver, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    function forceApproval(
        address account,
        address spender,
        uint256 amount
    ) public {
        _approve(account, spender, amount);
    }

    function failTransfers(address recipient, bool newValue) external {
        _failTransfers[recipient] = newValue;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (_failTransfers[to]) {
            revert("MockToken: Transfer failed");
        } else {
            return super.transfer(to, amount);
        }
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (_failTransfers[to]) {
            revert("MockToken: Transfer failed");
        } else {
            return super.transferFrom(from, to, amount);
        }
    }
}
