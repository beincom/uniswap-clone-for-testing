// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
import "@uniswap/v3-periphery/contracts/interfaces/external/IWETH9.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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
