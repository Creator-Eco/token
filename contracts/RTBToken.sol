// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract RTBToken is ERC20, ERC20Permit, Ownable {
    constructor() ERC20("RTB", "RTB") ERC20Permit("RTB") {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
