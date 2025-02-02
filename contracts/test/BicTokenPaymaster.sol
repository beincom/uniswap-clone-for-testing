// // SPDX-License-Identifier: GPL-3.0
// pragma solidity ^0.8.12;

// /* solhint-disable reason-string */

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@account-abstraction/contracts/interfaces/IPaymaster.sol";
// import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
// import "@account-abstraction/contracts/core/BasePaymaster.sol";
// import "@account-abstraction/contracts/samples/IOracle.sol";
// import "@openzeppelin/contracts/utils/Pausable.sol";
// import "@openzeppelin/contracts/math/SafeMath.sol";

// /**
//  * @title A paymaster that defines itself also BIC main token
//  * @notice Using this paymaster mechanism for Account Abstraction bundler v0.6,
//  * when need to change to bundler v0.7 or higher, using TokenPaymaster instead
//  */
// contract BicTokenPaymaster is BasePaymaster, Pausable {
//     using SafeMath for uint256;
    
//     /// Calculated cost of the postOp, minimum value that need verificationGasLimit to be higher than
//     uint256 constant public COST_OF_POST = 60000;

//     /// The factory that creates accounts. used to validate account creation. Just to make sure not have any unexpected account creation trying to bug the system
//     mapping(address => bool) public factories;

//     /// The oracle to use for token exchange rate.
//     address public oracle;

//     /// tax fees
//     uint256 public sellTax;
//     uint256 public buyTax;

//     /// treasury
//     address public treasury;

//     /// excluded from tax fees
//     mapping(address => bool) private _isExcludedFromTax;

//     /// whitelist pools to tax on
//     mapping(address => bool) private _isPool;

//     /// The blocked users
//     mapping (address => bool) public isBlocked;

//     /// @dev Emitted when changing sell tax
//     event SellTaxUpdated(address updater, uint256 bps);

//     /// @dev Emitted when changing buy tax
//     event BuyTaxUpdated(address updater, uint256 bps);

//     /// @dev Emitted when updating treasury address
//     event TreasuryUpdated(address updater, address newTreasury);

//     /// @dev Emitted when updating excluded address from tax
//     event ExcludedFromTaxUpdated(address excludedAddress, bool status);

//     /// @dev Emitted when updating LP pools
//     event PoolUpdated(address pool, bool status);

//     /// @dev Emitted when a user is blocked
//     event BlockPlaced(address indexed _user, address indexed _operator);

//     /// @dev Emitted when a user is unblocked
//     event BlockReleased(address indexed _user, address indexed _operator);

//     /// @dev Emitted when a user is charged, using for indexing on subgraph
//     event ChargeFee(address sender, uint256 fee);

//     /// @dev Emitted when the oracle is set
//     event SetOracle(address oldOracle, address newOracle, address indexed _operator);

//     /// @dev Emitted when a factory is added
//     event AddFactory(address factory, address indexed _operator);

//     /**
//      * @notice Constructor that make this contract become ERC20 Paymaster and also Permit
//      * @param _entryPoint the entry point contract to use. Default is v0.6 public entry point: 0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789
//      * @param _owner is the owner of the paymaster. Using this param to set Safe wallet as default owner
//      * @dev BIC token required permit because of Account Abstraction feature
//      * @dev Using ERC20Permit because it is require for forwarder from Entrypoint
//      */
//     constructor(IEntryPoint _entryPoint, address _owner) ERC20("Beincom", "BIC") BasePaymaster(_entryPoint) ERC20Permit("Beincom") {
//         //owner is allowed to withdraw tokens from the paymaster's balance
//         _approve(address(this), _owner, type(uint).max);
//         _transferOwnership(_owner);
//         _mint(_owner, 5000000000 * 1e18);
//         buyTax = 0;
//         sellTax = 2000;
//         _isExcludedFromTax[_owner] = true;
//     }

//     /**
//      * @notice Set the oracle to use for token exchange rate.
//      * @param _oracle the oracle to use.
//      */
//     function setOracle(address _oracle) external onlyOwner {
//         emit SetOracle(oracle, _oracle, msg.sender);
//         oracle = _oracle;
//     }

//     /**
//      * @notice Add a factory that creates accounts.
//      * @param _factory the factory to add.
//      */
//     function addFactory(address _factory) external onlyOwner {
//         factories[_factory] = true;
//         emit AddFactory(_factory, msg.sender);
//     }

//     /**
//      * @notice Update sell tax.
//      * @param bps sell tax basic points.
//      */
//     function setSellTax(uint256 bps) external onlyOwner {
//         sellTax = bps;
//         emit SellTaxUpdated(_msgSender(), bps);
//     }

//     /**
//      * @notice Update buy tax.
//      * @param bps buy tax basic points.
//      */
//     function setBuyTax(uint256 bps) external onlyOwner {
//         buyTax = bps;
//         emit BuyTaxUpdated(_msgSender(), bps);
//     }

//     /**
//      * @notice Update treasury address
//      * @param newTreasury new treasury address
//      */
//     function setTreasury(address newTreasury) external onlyOwner {
//         treasury = newTreasury;
//         emit TreasuryUpdated(_msgSender(), newTreasury);
//     }

//     /**
//      * @notice Updated status of excluded address.
//      * @param excludedAddress excluded address
//      * @param status status of excluded address
//      */
//     function setIsExcludedFromTax(address excludedAddress, bool status) external onlyOwner {
//         _isExcludedFromTax[excludedAddress] = status;
//         emit ExcludedFromTaxUpdated(excludedAddress, status);
//     }

//     /**
//      * @notice Updated status of LP pool.
//      * @param pool pool address.
//      * @param status status of the pool.
//      */
//     function setPool(address pool, bool status) external onlyOwner {
//         _isPool[pool] = status;
//         emit PoolUpdated(pool, status);
//     }

//     /**
//      * @notice Transfer paymaster ownership.
//        * owner of this paymaster is allowed to withdraw funds (tokens transferred to this paymaster's balance)
//        * when changing owner, the old owner's withdrawal rights are revoked.
//      * @param newOwner the new owner of the paymaster.
//      */
//     function transferOwnership(address newOwner) public override virtual onlyOwner {
//         // remove allowance of current owner
//         _approve(address(this), owner(), 0);
//         super.transferOwnership(newOwner);
//         // new owner is allowed to withdraw tokens from the paymaster's balance
//         _approve(address(this), newOwner, type(uint).max);
//     }

//     /**
//      * @notice Token to eth exchange rate.
//      * @param valueEth the value in eth to convert to tokens.
//      * @return valueToken the value in tokens.
//      */
//     function getTokenValueOfEth(uint256 valueEth) internal view virtual returns (uint256 valueToken) {
//         if (oracle != address(0)) {
//             return IOracle(oracle).getTokenValueOfEth(valueEth);
//         }
//         return valueEth * 100;
//     }

//     /**
//       * @notice Validate the request:
//       *
//       * - If this is a constructor call, make sure it is a known account.
//       * - Verify the sender has enough tokens.
//       * @dev (since the paymaster is also the token, there is no notion of "approval")
//       * @param userOp the user operation to validate.
//       * @param requiredPreFund the required pre-fund for the operation.
//       * @return context the context to pass to postOp.
//       * @return validationData the validation data.
//       */
//     function _validatePaymasterUserOp(UserOperation calldata userOp, bytes32 /*userOpHash*/, uint256 requiredPreFund)
//     internal view override returns (bytes memory context, uint256 validationData) {
//         uint256 tokenPrefund = getTokenValueOfEth(requiredPreFund);

//         // verificationGasLimit is dual-purposed, as gas limit for postOp. make sure it is high enough
//         // make sure that verificationGasLimit is high enough to handle postOp
//         require(userOp.verificationGasLimit > COST_OF_POST, "BicTokenPaymaster: gas too low for postOp");

//         if (userOp.initCode.length != 0) {
//             _validateConstructor(userOp);
//             require(balanceOf(userOp.sender) >= tokenPrefund, "BicTokenPaymaster: no balance (pre-create)");
//         } else {

//             require(balanceOf(userOp.sender) >= tokenPrefund, "BicTokenPaymaster: no balance");
//         }

//         return (abi.encode(userOp.sender), 0);
//     }


//     /**
//         * @notice Validate the constructor code and parameters.
//         * @dev When constructing an account, validate constructor code and parameters
//         * @dev We trust our factory (and that it doesn't have any other public methods)
//         * @param userOp the user operation to validate.
//         */
//     function _validateConstructor(UserOperation calldata userOp) internal virtual view {
//         address factory = address(bytes20(userOp.initCode[0 : 20]));
//         require(factories[factory], "BicTokenPaymaster: wrong account factory");
//     }

//     /**
//      * @notice Actual charge of user.
//      * @dev This method will be called just after the user's TX with mode==OpSucceeded|OpReverted (account pays in both cases)
//      * @param mode the mode of the operation.
//      * @param context the context to pass to postOp.
//      * @param actualGasCost the actual gas cost of the operation.
//      */
//     function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
//         //we don't really care about the mode, we just pay the gas with the user's tokens.
//         (mode);
//         address sender = abi.decode(context, (address));
//         uint256 charge = getTokenValueOfEth(actualGasCost + COST_OF_POST);
//         //actualGasCost is known to be no larger than the above requiredPreFund, so the transfer should succeed.
//         _transfer(sender, address(this), charge);

//         emit ChargeFee(sender, charge);
//     }

//     /**
//      * @notice Blacklist a user.
//      * @param _user the user to blacklist.
//      */
//     function addToBlockedList (address _user) public onlyOwner {
//         isBlocked[_user] = true;
//         emit BlockPlaced(_user, msg.sender);
//     }

//     /**
//      * @notice Unblock a user.
//      * @param _user the user to unblock.
//      */
//     function removeFromBlockedList (address _user) public onlyOwner {
//         isBlocked[_user] = false;
//         emit BlockReleased(_user, msg.sender);
//     }

//     /**
//      * @notice Pause transfers using this token. For emergency use.
//      * @dev Event already defined and emitted in Pausable.sol
//      */
//     function pause() public onlyOwner {
//         _pause();
//     }

//     /**
//      * @notice Unpause transfers using this token.
//      * @dev Event already defined and emitted in Pausable.sol
//      */
//     function unpause() public onlyOwner {
//         _unpause();
//     }

//     /**
//      * @notice Override transfer to include tax fee logic.
//      * @dev Event already defined and emitted in ERC20.sol
//      */
//     function _transfer(address from, address to,uint256 amount) internal override {
//         bool _isTakenTax = true;

//         if (_isExcludedFromTax[from] || _isExcludedFromTax[to]) {
//             _isTakenTax = false;
//         }

//         uint256 _tax = 0;

//         if (_isTakenTax) {
//             // charge tax on sell
//             if (_isPool[to] && sellTax > 0) {
//                 _tax = amount.mul(sellTax).div(10000);
//             }else if (_isPool[from] && buyTax > 0) {
//                 _tax = amount.mul(buyTax).div(10000);
//             }
//         }

//         if (_tax > 0) {
//             super._transfer(from, treasury, _tax);
//         }

//         amount -= _tax;

//         super._transfer(from, to, amount);
//     }

//     /**
//      * @dev Hook that is called before any transfer of tokens.
//      * Override existing hook to add additional checks: paused and blocked users.
//      */
//     function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
//         super._beforeTokenTransfer(from, to, amount);

//         require(!paused(), "BicTokenPaymaster: token transfer while paused");
//         require(!isBlocked[from], "BicTokenPaymaster: sender is blocked");
//     }
// }