// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "../../openzeppelin-confidential-contracts/contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC7984WrapperExample
 * @notice A wrapper that converts standard ERC20 tokens into confidential ERC7984 tokens
 * @dev This example demonstrates:
 * - Wrapping public ERC20 tokens into confidential ERC7984 tokens
 * - Unwrapping confidential tokens back to public ERC20 tokens
 * - Gateway-based decryption for unwrap operations
 * - Handling decimal differences between ERC20 and ERC7984
 * 
 * Key Concepts:
 * - **Wrap**: Convert public ERC20 → confidential ERC7984 (privacy on-ramp)
 * - **Unwrap**: Convert confidential ERC7984 → public ERC20 (privacy off-ramp)
 * - **Rate**: Conversion rate to handle decimal differences
 * - **Gateway**: Decryption service for unwrap requests
 * 
 * Use Cases:
 * - Privacy layer for existing ERC20 tokens
 * - Confidential trading with public settlement
 * - Anonymous payroll with public withdrawals
 * - Private treasuries with transparent distributions
 */
contract ERC7984WrapperExample is ERC7984ERC20Wrapper {
    // Gateway contract for decryption
    address public immutable GATEWAY;

    /**
     * @notice Constructor to initialize the wrapper
     * @param underlyingToken_ The ERC20 token to wrap
     * @param name_ Name of the confidential token
     * @param symbol_ Symbol of the confidential token
     * @param contractURI_ Metadata URI
     * @param gateway_ Gateway address for decryption
     */
    constructor(
        IERC20 underlyingToken_,
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        address gateway_
    ) ERC7984(name_, symbol_, contractURI_) ERC7984ERC20Wrapper(underlyingToken_) {
        GATEWAY = gateway_;
    }

    /**
     * @notice Wrap ERC20 tokens into confidential ERC7984 tokens
     * @dev ✅ DO: Approve this contract to spend your ERC20 tokens first
     * @param to Recipient of the confidential tokens
     * @param amount Amount of ERC20 tokens to wrap
     * 
     * Example Flow:
     * ```typescript
     * // Step 1: Approve wrapper to spend ERC20 tokens
     * await erc20Token.approve(wrapperAddress, amount);
     * 
     * // Step 2: Wrap tokens
     * await wrapper.wrap(recipientAddress, amount);
     * 
     * // Step 3: Recipient now has confidential tokens
     * const confidentialBalance = await wrapper.confidentialBalanceOf(recipientAddress);
     * ```
     * 
     * Note: If ERC20 has 18 decimals and ERC7984 has 6 decimals (default),
     * the rate is 10^12, meaning 1 ERC7984 = 10^12 ERC20 units
     */
    function wrap(address to, uint256 amount) public override {
        super.wrap(to, amount);
    }

    /**
     * @notice Request to unwrap confidential tokens back to ERC20
     * @dev This is a two-step process:
     * 1. Request unwrap (this function) - initiates decryption
     * 2. Finalize unwrap - after gateway decrypts the amount
     * 
     * @param from Address to unwrap from (must be msg.sender or authorized operator)
     * @param to Recipient of the ERC20 tokens
     * @param encryptedAmount Encrypted amount to unwrap
     * @param inputProof Input proof for the encrypted amount
     * 
     * ✅ Correct Usage:
     * ```typescript
     * // Step 1: Create encrypted input for the amount to unwrap
     * const input = await fhevm.createEncryptedInput(wrapperAddress, userAddress)
     *   .add64(100)
     *   .encrypt();
     * 
     * // Step 2: Request unwrap
     * const tx = await wrapper.connect(user).unwrap(
     *   userAddress,
     *   recipientAddress,
     *   input.handles[0],
     *   input.inputProof
     * );
     * 
     * // Step 3: Wait for gateway to decrypt and finalize
     * // Gateway will call finalizeUnwrap automatically
     * ```
     */
    function unwrap(address from, address to, externalEuint64 calldata encryptedAmount, bytes calldata inputProof)
        public
    {
        super.unwrap(from, to, encryptedAmount, inputProof);
    }

    /**
     * @notice Finalize an unwrap request after decryption
     * @dev This is called by the gateway after decrypting the amount
     * @param requestId The gateway request ID
     * @param cleartextAmount The decrypted amount
     * 
     * Security:
     * - Only the gateway can call this function
     * - Must match a pending unwrap request
     * - Burns confidential tokens and transfers ERC20 tokens
     */
    function finalizeUnwrap(uint256 requestId, uint64 cleartextAmount) public {
        require(msg.sender == GATEWAY, "Only gateway can finalize");
        super.finalizeUnwrap(requestId, cleartextAmount);
    }

    /**
     * @notice Get the conversion rate between ERC20 and ERC7984
     * @return The rate (e.g., 10^12 if ERC20 has 18 decimals and ERC7984 has 6)
     * 
     * Example:
     * If rate = 1000, then:
     * - Wrapping 1000 ERC20 units = 1 ERC7984 unit
     * - Unwrapping 1 ERC7984 unit = 1000 ERC20 units
     */
    function rate() public view override returns (uint256) {
        return super.rate();
    }

    /**
     * @notice Get the underlying ERC20 token
     * @return The ERC20 token being wrapped
     */
    function underlying() public view override returns (IERC20) {
        return super.underlying();
    }

    /**
     * @dev Override to set maximum decimals for confidential token
     * Default is 6 decimals to match ERC7984 standard
     */
    function _maxDecimals() internal pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Transfer confidential tokens with callback to recipient
     * @dev Supports IERC7984Receiver interface for smart contract recipients
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     * @param inputProof Input proof
     * @param data Additional data to pass to recipient
     * 
     * Use Case: Confidential payment with automatic processing
     * ```typescript
     * // Transfer and call recipient's onTransferReceived function
     * await wrapper.transferAndCall(
     *   recipientContractAddress,
     *   input.handles[0],
     *   input.inputProof,
     *   additionalData
     * );
     * ```
     */
    function transferAndCall(
        address to,
        externalEuint64 calldata encryptedAmount,
        bytes calldata inputProof,
        bytes calldata data
    ) public returns (bool) {
        return super.transferAndCall(to, encryptedAmount, inputProof, data);
    }

    /**
     * @notice ERC1363 callback for wrapping tokens automatically
     * @dev When someone sends ERC1363 tokens to this contract, they're automatically wrapped
     * @param from The sender of the tokens
     * @param amount The amount of tokens sent
     * @param data Optional data (can specify recipient address)
     * 
     * Advanced Usage (with ERC1363 tokens):
     * ```typescript
     * // Transfer ERC1363 tokens to wrapper - automatically wraps
     * await erc1363Token.transferAndCall(
     *   wrapperAddress,
     *   amount,
     *   recipientAddressBytes // optional, defaults to msg.sender
     * );
     * ```
     */
    function onTransferReceived(address operator, address from, uint256 amount, bytes calldata data)
        public
        override
        returns (bytes4)
    {
        return super.onTransferReceived(operator, from, amount, data);
    }
}

/**
 * @title MockERC20
 * @notice A simple ERC20 token for testing the wrapper
 * @dev Only for testing purposes - not part of the example
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18; // Standard ERC20 decimals
    }
}
