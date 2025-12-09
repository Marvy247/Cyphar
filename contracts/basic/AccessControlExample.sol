// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title AccessControlExample
 * @notice Demonstrates FHE access control mechanisms - how to manage who can decrypt encrypted values
 * @dev This example explains:
 * - What is access control in FHEVM
 * - FHE.allow() - Grant permanent access to encrypted values
 * - FHE.allowTransient() - Grant temporary access within a transaction
 * - FHE.allowThis() - Grant access to the contract itself
 * - Common access control patterns and pitfalls
 * 
 * Key Concepts:
 * - **Access Control List (ACL)**: Manages who can decrypt which encrypted values
 * - **Permanent Access**: FHE.allow() - persists in storage, costs gas
 * - **Transient Access**: FHE.allowTransient() - temporary, cheaper, only within transaction
 * - **Contract Access**: FHE.allowThis() - allows contract to use encrypted values
 * 
 * Use Cases:
 * - Medical records (doctor can decrypt patient data)
 * - Private voting (tallying contract can decrypt votes)
 * - Confidential auctions (auctioneer can see bids after deadline)
 * - Financial privacy (auditor can decrypt specific transactions)
 */
contract AccessControlExample {
    // Encrypted balance per user
    mapping(address => euint64) private balances;
    
    // Admin who can view all balances
    address public admin;
    
    // Auditor who has been granted access
    address public auditor;

    event BalanceUpdated(address indexed user, euint64 encryptedBalance);
    event AccessGranted(address indexed user, address indexed grantee);
    event AuditorChanged(address indexed oldAuditor, address indexed newAuditor);

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Set a user's encrypted balance with proper access control
     * @dev ✅ DO: Always grant access to both the contract and the user
     * @param encryptedAmount The encrypted balance amount
     * @param inputProof The proof that this encrypted value is correctly bound
     * 
     * Access Control Pattern:
     * 1. FHE.allowThis() - Contract needs access to perform operations
     * 2. FHE.allow(value, user) - User needs access to decrypt their own balance
     * 
     * Example Usage:
     * ```typescript
     * // Create encrypted input bound to user's address
     * const input = await fhevm.createEncryptedInput(contractAddress, userAddress)
     *   .add64(1000)
     *   .encrypt();
     * 
     * await contract.connect(user).setBalance(input.handles[0], input.inputProof);
     * 
     * // Now user can decrypt their balance
     * const balanceHandle = await contract.getBalance(userAddress);
     * const decrypted = await fhevm.userDecryptEuint(
     *   FhevmType.euint64,
     *   balanceHandle,
     *   contractAddress,
     *   user
     * );
     * ```
     */
    function setBalance(externalEuint64 calldata encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        
        // ✅ CORRECT: Grant access to contract first
        FHE.allowThis(amount);
        
        // ✅ CORRECT: Grant access to the user
        FHE.allow(amount, msg.sender);
        
        balances[msg.sender] = amount;
        
        emit BalanceUpdated(msg.sender, amount);
    }

    /**
     * @notice Grant access to view balance to another address
     * @dev This demonstrates permanent access control
     * @param user The user whose balance to grant access to
     * @param grantee The address that will receive access
     * 
     * ✅ Correct Usage:
     * ```typescript
     * // Alice grants Bob access to her balance
     * await contract.connect(alice).grantAccess(alice.address, bob.address);
     * 
     * // Now Bob can decrypt Alice's balance
     * const aliceBalance = await contract.getBalance(alice.address);
     * const decrypted = await fhevm.userDecryptEuint(
     *   FhevmType.euint64,
     *   aliceBalance,
     *   contractAddress,
     *   bob // Bob can now decrypt
     * );
     * ```
     * 
     * Note: This uses FHE.allow() which is PERMANENT and stored in the ACL.
     * Use this when access should persist across multiple transactions.
     */
    function grantAccess(address user, address grantee) external {
        require(msg.sender == user || msg.sender == admin, "Not authorized");
        
        euint64 balance = balances[user];
        
        // ✅ FHE.allow() - Permanent access, persists in storage
        FHE.allow(balance, grantee);
        
        emit AccessGranted(user, grantee);
    }

    /**
     * @notice Transfer balance using transient access control
     * @dev Demonstrates FHE.allowTransient() - temporary access within transaction
     * @param to Recipient address
     * @param encryptedAmount Encrypted amount to transfer
     * @param inputProof Input proof for the amount
     * 
     * Why Use allowTransient():
     * - ✅ CHEAPER: No storage writes, saves gas
     * - ✅ SECURE: Access only lasts for this transaction
     * - ✅ CLEAN: No lingering permissions in ACL
     * 
     * Example:
     * ```typescript
     * const input = await fhevm.createEncryptedInput(contractAddress, senderAddress)
     *   .add64(100)
     *   .encrypt();
     * 
     * await contract.connect(sender).transfer(recipient, input.handles[0], input.inputProof);
     * ```
     */
    function transfer(address to, externalEuint64 calldata encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        
        // ✅ allowTransient - Temporary access for this transaction only
        FHE.allowTransient(amount, address(this));
        
        euint64 senderBalance = balances[msg.sender];
        euint64 recipientBalance = balances[to];
        
        // Check if sender has sufficient balance
        ebool hasSufficientBalance = FHE.gte(senderBalance, amount);
        
        // Perform conditional transfer
        balances[msg.sender] = FHE.select(hasSufficientBalance, FHE.sub(senderBalance, amount), senderBalance);
        balances[to] = FHE.select(hasSufficientBalance, FHE.add(recipientBalance, amount), recipientBalance);
        
        // Grant access to new balances
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);
        
        emit BalanceUpdated(msg.sender, balances[msg.sender]);
        emit BalanceUpdated(to, balances[to]);
    }

    /**
     * @notice Set an auditor who can view all balances
     * @dev Demonstrates granting access to a privileged role
     * @param newAuditor Address of the new auditor
     * 
     * Real-World Use Case:
     * - Regulatory compliance (auditor can verify transactions)
     * - Tax reporting (accountant can see all income)
     * - Internal audit (company auditor can review all accounts)
     */
    function setAuditor(address newAuditor) external {
        require(msg.sender == admin, "Only admin");
        
        address oldAuditor = auditor;
        auditor = newAuditor;
        
        emit AuditorChanged(oldAuditor, newAuditor);
    }

    /**
     * @notice Grant auditor access to a specific user's balance
     * @dev This allows external oversight while maintaining privacy from general public
     * @param user The user whose balance to audit
     */
    function grantAuditorAccess(address user) external {
        require(msg.sender == admin || msg.sender == user, "Not authorized");
        require(auditor != address(0), "No auditor set");
        
        euint64 balance = balances[user];
        FHE.allow(balance, auditor);
        
        emit AccessGranted(user, auditor);
    }

    /**
     * @notice Get a user's encrypted balance
     * @dev The caller must have been granted access to decrypt this value
     * @param user The address to query
     * @return The encrypted balance handle
     * 
     * ❌ ANTI-PATTERN: Trying to decrypt in a view function
     * ```solidity
     * // This WON'T WORK - can't decrypt in view functions
     * function getBalanceDecrypted(address user) public view returns (uint64) {
     *     return FHE.decrypt(balances[user]); // ❌ ERROR: decrypt not allowed in view
     * }
     * ```
     * 
     * ✅ CORRECT: Return encrypted handle, decrypt off-chain
     * ```typescript
     * const balanceHandle = await contract.getBalance(userAddress);
     * const decrypted = await fhevm.userDecryptEuint(...);
     * ```
     */
    function getBalance(address user) external view returns (euint64) {
        return balances[user];
    }

    /**
     * @notice Compare two users' balances (result is encrypted)
     * @dev Demonstrates working with multiple encrypted values
     * @param user1 First user
     * @param user2 Second user
     * @return Encrypted boolean: true if user1 >= user2
     * 
     * Access Control Note:
     * The result is a NEW encrypted value, so we need to grant access to it.
     */
    function compareBalances(address user1, address user2) external returns (ebool) {
        euint64 balance1 = balances[user1];
        euint64 balance2 = balances[user2];
        
        ebool result = FHE.gte(balance1, balance2);
        
        // ✅ Grant access to the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        return result;
    }

    /**
     * @notice Example showing the difference between allow() and allowTransient()
     * @dev Educational function to demonstrate cost and persistence differences
     * @param value Encrypted value
     * @param recipient Address to grant access to
     * @param usePermanent If true, use allow(); if false, use allowTransient()
     * 
     * Performance Comparison:
     * - FHE.allow(): ~20,000 gas (writes to storage)
     * - FHE.allowTransient(): ~5,000 gas (temporary, in-memory)
     * 
     * Choose based on needs:
     * - Use allow() when access should persist (e.g., token approvals)
     * - Use allowTransient() for temporary operations (e.g., internal calculations)
     */
    function demonstrateAccessTypes(euint64 value, address recipient, bool usePermanent) external {
        FHE.allowThis(value);
        
        if (usePermanent) {
            // ✅ Permanent access - persists in ACL storage
            FHE.allow(value, recipient);
        } else {
            // ✅ Transient access - only valid within this transaction
            FHE.allowTransient(value, recipient);
        }
    }

    /**
     * @notice Common pitfall: forgetting allowThis()
     * @dev This will FAIL because contract doesn't have access to perform operations
     * 
     * ❌ WRONG:
     * ```solidity
     * function badTransfer(address to, euint64 amount) external {
     *     // Missing: FHE.allowThis(amount);
     *     balances[msg.sender] = FHE.sub(balances[msg.sender], amount); // ❌ FAILS
     * }
     * ```
     * 
     * ✅ CORRECT:
     * ```solidity
     * function goodTransfer(address to, euint64 amount) external {
     *     FHE.allowThis(amount); // ✅ Contract can now use the value
     *     balances[msg.sender] = FHE.sub(balances[msg.sender], amount);
     * }
     * ```
     */
}
