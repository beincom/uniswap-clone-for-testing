// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ThisIsFineToken is ERC20 {
    constructor() ERC20("This is fine", "TIF") {
        _mint(msg.sender, 1234567890 * 10 ** 18);
    }

    function burn() external {
        revert("This is fine");
    }
}
