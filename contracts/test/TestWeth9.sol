// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IWETH9 is IERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external;
}


contract TestWeth9 is IWETH9, ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable override {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external override {
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
