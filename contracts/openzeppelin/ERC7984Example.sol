// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "../../openzeppelin-confidential-contracts/contracts/token/ERC7984/ERC7984.sol";

/**
 * @title ERC7984Example
 * @notice A basic example of ERC7984 - a confidential token standard where balances and transfers are encrypted.
 * @dev This example demonstrates:
 * - Creating a confidential token with encrypted balances
 * - Minting tokens with input proofs
 * - Transferring tokens confidentially
 * - Querying encrypted balances
 * 
 * Key Concepts:
 * - All token amounts (balances, transfers) are encrypted using FHE (Fully Homomorphic Encryption)
 * - Users need to provide input proofs to transfer encrypted amounts
 * - Only authorized parties can decrypt balance information
 * - Supports EIP-165 interface detection
 * 
 * Use Cases:
 * - Privacy-preserving payment systems
 * - Confidential asset management
 * - Private reward distributions
 * - Anonymous voting tokens
 */
contract ERC7984Example is ERC7984 {
    /**
     * @notice Constructor to initialize the confidential token
     * @param name_ The name of the token (e.g., "Confidential Token")
     * @param symbol_ The symbol of the token (e.g., "CONF")
     * @param contractURI_ The URI for contract metadata
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) {}

    /**
     * @notice Mint new confidential tokens to an address
     * @dev ✅ DO: Use input proofs when minting encrypted amounts
     * @param to The recipient address
     * @param encryptedAmount The encrypted amount handle
     * @param inputProof The proof that the encrypted amount is correctly bound
     * 
     * Example Usage:
     * ```typescript
     * const input = await fhevm.createEncryptedInput(contractAddress, minterAddress)
     *   .add64(1000)
     *   .encrypt();
     * await token.mint(recipientAddress, input.handles[0], input.inputProof);
     * ```
     */
    function mint(address to, externalEuint64 calldata encryptedAmount, bytes calldata inputProof) public {
        _mint(to, encryptedAmount, inputProof);
    }

    /**
     * @notice Burn confidential tokens from an address
     * @dev ✅ DO: Ensure the holder has authorized the burn operation
     * @param from The address to burn tokens from
     * @param encryptedAmount The encrypted amount to burn
     * @param inputProof The proof for the encrypted amount
     * 
     * Note: Burning more than the balance will fail silently (balance stays unchanged)
     */
    function burn(address from, externalEuint64 calldata encryptedAmount, bytes calldata inputProof) public {
        _burn(from, encryptedAmount, inputProof);
    }

    /**
     * @notice Transfer tokens confidentially using an encrypted amount
     * @dev ✅ DO: Always provide valid input proofs created by the sender
     * @param to The recipient address
     * @param encryptedAmount The encrypted amount to transfer
     * @param inputProof The proof for the encrypted amount
     * 
     * Common Pitfall:
     * ❌ DON'T: Create input proof with one address and call transfer with another
     * ```typescript
     * // WRONG - will fail!
     * const input = await fhevm.createEncryptedInput(contractAddr, alice.address)
     *   .add64(100).encrypt();
     * await token.connect(bob).transfer(recipient, input.handles[0], input.inputProof);
     * ```
     * 
     * ✅ Correct:
     * ```typescript
     * const input = await fhevm.createEncryptedInput(contractAddr, alice.address)
     *   .add64(100).encrypt();
     * await token.connect(alice).transfer(recipient, input.handles[0], input.inputProof);
     * ```
     */
    function transfer(address to, externalEuint64 calldata encryptedAmount, bytes calldata inputProof)
        public
        override
        returns (bool)
    {
        return super.transfer(to, encryptedAmount, inputProof);
    }

    /**
     * @notice Transfer tokens on behalf of another address (operator pattern)
     * @dev The sender must be authorized as an operator for the 'from' address
     * @param from The address to transfer from
     * @param to The recipient address
     * @param encryptedAmount The encrypted amount to transfer
     * @param inputProof The proof for the encrypted amount
     * 
     * Requirements:
     * - msg.sender must be authorized as an operator for 'from'
     * - Authorization must not be expired (based on expiry timestamp)
     */
    function transferFrom(
        address from,
        address to,
        externalEuint64 calldata encryptedAmount,
        bytes calldata inputProof
    ) public override returns (bool) {
        return super.transferFrom(from, to, encryptedAmount, inputProof);
    }

    /**
     * @notice Get the encrypted balance of an account
     * @dev The returned handle can only be decrypted by authorized parties
     * @param account The address to query
     * @return The encrypted balance handle (euint64)
     * 
     * Decryption Example:
     * ```typescript
     * const balanceHandle = await token.confidentialBalanceOf(userAddress);
     * // Only the user can decrypt their own balance
     * const decryptedBalance = await fhevm.userDecryptEuint(
     *   FhevmType.euint64,
     *   balanceHandle,
     *   contractAddress,
     *   userAddress
     * );
     * ```
     * 
     * Anti-pattern:
     * ❌ DON'T: Try to use encrypted balances in view functions
     * ```solidity
     * // This won't work - view functions can't perform FHE operations
     * function canUserAfford(address user, uint64 amount) public view returns (bool) {
     *     euint64 balance = confidentialBalanceOf(user);
     *     return FHE.decrypt(FHE.gte(balance, FHE.asEuint64(amount))); // ❌ Can't decrypt in view
     * }
     * ```
     */
    function confidentialBalanceOf(address account) public view override returns (euint64) {
        return super.confidentialBalanceOf(account);
    }

    /**
     * @notice Get the total supply as an encrypted value
     * @return The encrypted total supply handle (euint64)
     */
    function confidentialTotalSupply() public view override returns (euint64) {
        return super.confidentialTotalSupply();
    }
}
