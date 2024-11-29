// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor() ERC20("Fake Tether", "FAKE USDT") {
        _mint(msg.sender, 1_000_000_000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
