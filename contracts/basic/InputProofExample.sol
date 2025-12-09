// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title InputProofExample
 * @notice Comprehensive guide to input proofs in FHEVM - what they are, why needed, and how to use
 * @dev This example explains:
 * - What are input proofs?
 * - Why input proofs are necessary
 * - How to create and use input proofs correctly
 * - Common mistakes and how to avoid them
 * - Different input proof patterns
 * 
 * 🔑 Key Concepts:
 * 
 * **What is an Input Proof?**
 * An input proof is a cryptographic zero-knowledge proof that demonstrates:
 * 1. The encrypted value was created by the claimed user
 * 2. The encrypted value is bound to the specific contract address
 * 3. The encryption was done correctly
 * 
 * **Why are Input Proofs Needed?**
 * Without input proofs, malicious users could:
 * - Submit encrypted values from other users (replay attacks)
 * - Submit invalid encrypted data
 * - Manipulate the encryption binding
 * 
 * **How Input Proofs Work:**
 * When you encrypt a value off-chain:
 * ```typescript
 * const input = await fhevm.createEncryptedInput(contractAddress, userAddress)
 *   .add64(1000)
 *   .encrypt();
 * // Returns: { handles: [...], inputProof: '0x...' }
 * ```
 * 
 * The input proof binds:
 * - User address (who encrypted)
 * - Contract address (where it will be used)
 * - Encrypted value (what was encrypted)
 * 
 * Use Cases:
 * - Confidential token transfers
 * - Private voting
 * - Sealed-bid auctions
 * - Any operation with user-provided encrypted data
 */
contract InputProofExample {
    // User balances (encrypted)
    mapping(address => euint64) private balances;
    
    // Encrypted votes
    mapping(address => euint8) private votes;
    
    // Bids in an auction
    mapping(address => euint64) private bids;
    
    event BalanceSet(address indexed user);
    event VoteCast(address indexed voter);
    event BidPlaced(address indexed bidder);
    event MultiValueProcessed(address indexed user);

    /**
     * @notice Set balance using input proof - BASIC EXAMPLE
     * @dev This demonstrates the fundamental pattern of using input proofs
     * @param encryptedAmount The encrypted amount (handle from off-chain encryption)
     * @param inputProof Zero-knowledge proof that binds encrypted value to user and contract
     * 
     * ✅ CORRECT Usage Pattern:
     * ```typescript
     * // Step 1: Create encrypted input with CORRECT addresses
     * const input = await fhevm.createEncryptedInput(
     *   contractAddress,  // Contract where it will be used
     *   userAddress       // User who is encrypting
     * ).add64(1000).encrypt();
     * 
     * // Step 2: Call contract with both handle and proof
     * await contract.connect(user).setBalance(
     *   input.handles[0],  // The encrypted value handle
     *   input.inputProof   // The proof
     * );
     * ```
     * 
     * The proof verifies:
     * 1. ✅ msg.sender matches the address used in createEncryptedInput
     * 2. ✅ Contract address matches the one used in createEncryptedInput
     * 3. ✅ The encrypted value is valid
     */
    function setBalance(externalEuint64 calldata encryptedAmount, bytes calldata inputProof) external {
        // FHE.asEuint64 internally verifies the input proof
        // If proof is invalid, this will revert
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);
        
        balances[msg.sender] = amount;
        
        emit BalanceSet(msg.sender);
    }

    /**
     * @notice Cast a vote using input proof
     * @dev Demonstrates input proofs with smaller value types (euint8)
     * @param encryptedVote Encrypted vote choice (0-255)
     * @param inputProof Proof of encryption
     * 
     * Example: Private voting where vote choices remain confidential
     * ```typescript
     * // Vote for option 3 (confidentially)
     * const input = await fhevm.createEncryptedInput(contractAddr, voterAddr)
     *   .add8(3)  // Note: add8 for euint8
     *   .encrypt();
     * 
     * await contract.connect(voter).castVote(
     *   input.handles[0],
     *   input.inputProof
     * );
     * ```
     */
    function castVote(externalEuint8 calldata encryptedVote, bytes calldata inputProof) external {
        euint8 vote = FHE.asEuint8(encryptedVote, inputProof);
        
        FHE.allowThis(vote);
        FHE.allow(vote, msg.sender);
        
        votes[msg.sender] = vote;
        
        emit VoteCast(msg.sender);
    }

    /**
     * @notice Place a bid in an auction using input proof
     * @dev Shows input proofs in competitive scenarios (auctions)
     * @param encryptedBid Encrypted bid amount
     * @param inputProof Proof binding bid to bidder and contract
     * 
     * Why Input Proofs Matter in Auctions:
     * - Prevents bid replay: Can't reuse someone else's bid
     * - Ensures authenticity: Bid actually came from claimed bidder
     * - Maintains confidentiality: Bid amount stays encrypted
     */
    function placeBid(externalEuint64 calldata encryptedBid, bytes calldata inputProof) external {
        euint64 bid = FHE.asEuint64(encryptedBid, inputProof);
        
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);
        
        bids[msg.sender] = bid;
        
        emit BidPlaced(msg.sender);
    }

    /**
     * @notice Process multiple encrypted values in one transaction
     * @dev Demonstrates handling multiple input proofs
     * @param amount1 First encrypted value
     * @param proof1 Proof for first value
     * @param amount2 Second encrypted value
     * @param proof2 Proof for second value
     * 
     * ✅ CORRECT: Each encrypted value needs its own proof
     * ```typescript
     * // Create TWO separate encrypted inputs
     * const input1 = await fhevm.createEncryptedInput(contractAddr, userAddr)
     *   .add64(1000).encrypt();
     * const input2 = await fhevm.createEncryptedInput(contractAddr, userAddr)
     *   .add64(2000).encrypt();
     * 
     * await contract.processMultipleValues(
     *   input1.handles[0], input1.inputProof,
     *   input2.handles[0], input2.inputProof
     * );
     * ```
     * 
     * ❌ WRONG: Can't use same proof for different values
     * ```typescript
     * // This WON'T WORK
     * const input = await fhevm.createEncryptedInput(contractAddr, userAddr)
     *   .add64(1000).encrypt();
     * 
     * await contract.processMultipleValues(
     *   input.handles[0], input.inputProof,
     *   input.handles[0], input.inputProof  // ❌ Reusing same proof
     * );
     * ```
     */
    function processMultipleValues(
        externalEuint64 calldata amount1,
        bytes calldata proof1,
        externalEuint64 calldata amount2,
        bytes calldata proof2
    ) external {
        euint64 value1 = FHE.asEuint64(amount1, proof1);
        euint64 value2 = FHE.asEuint64(amount2, proof2);
        
        // Process both values
        euint64 sum = FHE.add(value1, value2);
        
        FHE.allowThis(sum);
        FHE.allow(sum, msg.sender);
        
        balances[msg.sender] = sum;
        
        emit MultiValueProcessed(msg.sender);
    }

    /**
     * @notice Batch encrypt multiple values efficiently
     * @dev Shows how to encrypt multiple values in ONE input for efficiency
     * @param encryptedValues Array of encrypted value handles
     * @param inputProof Single proof for all values
     * 
     * ✅ CORRECT: Use single input for multiple values
     * ```typescript
     * // Create ONE encrypted input with MULTIPLE values
     * const input = await fhevm.createEncryptedInput(contractAddr, userAddr)
     *   .add64(1000)  // First value
     *   .add64(2000)  // Second value
     *   .add64(3000)  // Third value
     *   .encrypt();
     * 
     * // Now input.handles has 3 values, but ONE proof for all
     * await contract.batchSetValues(
     *   [input.handles[0], input.handles[1], input.handles[2]],
     *   input.inputProof  // Single proof covers all
     * );
     * ```
     * 
     * This is MORE EFFICIENT than multiple separate encryptions
     */
    function batchSetValues(
        externalEuint64[] calldata encryptedValues,
        bytes calldata inputProof
    ) external {
        require(encryptedValues.length > 0, "Empty array");
        
        euint64 total = FHE.asEuint64(0);
        
        for (uint256 i = 0; i < encryptedValues.length; i++) {
            euint64 value = FHE.asEuint64(encryptedValues[i], inputProof);
            total = FHE.add(total, value);
        }
        
        FHE.allowThis(total);
        FHE.allow(total, msg.sender);
        
        balances[msg.sender] = total;
    }

    /**
     * @notice Transfer with input proof for the amount
     * @dev Shows input proofs in transfer scenarios
     * @param to Recipient address
     * @param encryptedAmount Amount to transfer (encrypted)
     * @param inputProof Proof that sender created this encrypted amount
     * 
     * Why Input Proof Matters Here:
     * - Ensures sender actually chose this amount
     * - Prevents manipulation of transfer amounts
     * - Maintains sender's privacy
     */
    function transfer(
        address to,
        externalEuint64 calldata encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        FHE.allowThis(amount);
        
        euint64 senderBalance = balances[msg.sender];
        euint64 recipientBalance = balances[to];
        
        ebool hasEnough = FHE.gte(senderBalance, amount);
        
        balances[msg.sender] = FHE.select(hasEnough, FHE.sub(senderBalance, amount), senderBalance);
        balances[to] = FHE.select(hasEnough, FHE.add(recipientBalance, amount), recipientBalance);
        
        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
        FHE.allowThis(balances[to]);
        FHE.allow(balances[to], to);
    }

    /**
     * @notice Get user's encrypted balance
     * @param user Address to query
     * @return Encrypted balance handle
     */
    function getBalance(address user) external view returns (euint64) {
        return balances[user];
    }

    /**
     * @notice Get user's encrypted vote
     * @param voter Address to query
     * @return Encrypted vote handle
     */
    function getVote(address voter) external view returns (euint8) {
        return votes[voter];
    }

    /**
     * @notice Get user's encrypted bid
     * @param bidder Address to query
     * @return Encrypted bid handle
     */
    function getBid(address bidder) external view returns (euint64) {
        return bids[bidder];
    }
}

/**
 * 📚 COMPREHENSIVE GUIDE TO INPUT PROOFS
 * 
 * ============================================
 * 1. WHAT IS AN INPUT PROOF?
 * ============================================
 * 
 * An input proof is a zero-knowledge proof that proves:
 * - You encrypted the data correctly
 * - The data is bound to the correct contract
 * - The data is bound to your address
 * - The encryption parameters are valid
 * 
 * ============================================
 * 2. WHY DO WE NEED INPUT PROOFS?
 * ============================================
 * 
 * WITHOUT input proofs, attackers could:
 * ❌ Steal encrypted values from other users
 * ❌ Replay encrypted values in different contracts
 * ❌ Submit malformed encrypted data
 * ❌ Manipulate the binding between data and addresses
 * 
 * WITH input proofs:
 * ✅ Each encrypted value is cryptographically bound to sender
 * ✅ Values can only be used in the intended contract
 * ✅ Replay attacks are prevented
 * ✅ Data integrity is guaranteed
 * 
 * ============================================
 * 3. HOW TO CREATE INPUT PROOFS (OFF-CHAIN)
 * ============================================
 * 
 * TypeScript Example:
 * ```typescript
 * import { fhevm } from "hardhat";
 * 
 * // Step 1: Get contract and user addresses
 * const contractAddress = await contract.getAddress();
 * const userAddress = user.address;
 * 
 * // Step 2: Create encrypted input
 * const input = await fhevm.createEncryptedInput(
 *   contractAddress,  // Where the value will be used
 *   userAddress       // Who is creating the value
 * );
 * 
 * // Step 3: Add values to encrypt
 * input.add64(1000);        // For euint64
 * input.add32(500);         // For euint32
 * input.add8(3);            // For euint8
 * input.addBool(true);      // For ebool
 * 
 * // Step 4: Generate proof
 * const encrypted = await input.encrypt();
 * 
 * // Result contains:
 * // - encrypted.handles: Array of encrypted value handles
 * // - encrypted.inputProof: The proof as bytes
 * ```
 * 
 * ============================================
 * 4. HOW TO USE INPUT PROOFS (ON-CHAIN)
 * ============================================
 * 
 * Solidity Example:
 * ```solidity
 * function setValue(
 *     externalEuint64 calldata encryptedValue,
 *     bytes calldata inputProof
 * ) external {
 *     // This verifies the proof automatically
 *     euint64 value = FHE.asEuint64(encryptedValue, inputProof);
 *     
 *     // If proof is invalid, function reverts here
 *     // If proof is valid, continue...
 * }
 * ```
 * 
 * ============================================
 * 5. COMMON MISTAKES
 * ============================================
 * 
 * ❌ MISTAKE 1: Wrong Address in createEncryptedInput
 * ```typescript
 * // WRONG: Using wrong user address
 * const input = await fhevm.createEncryptedInput(contractAddr, alice.address);
 * await contract.connect(bob).setValue(...);  // FAILS! Bob didn't create it
 * 
 * // CORRECT: Match signer with creator
 * const input = await fhevm.createEncryptedInput(contractAddr, bob.address);
 * await contract.connect(bob).setValue(...);  // Works!
 * ```
 * 
 * ❌ MISTAKE 2: Wrong Contract Address
 * ```typescript
 * // WRONG: Using different contract address
 * const input = await fhevm.createEncryptedInput(wrongContract, user);
 * await rightContract.connect(user).setValue(...);  // FAILS!
 * 
 * // CORRECT: Use the actual contract address
 * const input = await fhevm.createEncryptedInput(rightContract, user);
 * await rightContract.connect(user).setValue(...);  // Works!
 * ```
 * 
 * ❌ MISTAKE 3: Reusing Input Proofs
 * ```typescript
 * // WRONG: Trying to reuse proof
 * const input = await fhevm.createEncryptedInput(contract, user).add64(100).encrypt();
 * await contract.setValue(input.handles[0], input.inputProof);  // OK
 * await contract.setValue(input.handles[0], input.inputProof);  // FAILS! (already used)
 * 
 * // CORRECT: Create new input for each call
 * const input1 = await fhevm.createEncryptedInput(contract, user).add64(100).encrypt();
 * await contract.setValue(input1.handles[0], input1.inputProof);
 * 
 * const input2 = await fhevm.createEncryptedInput(contract, user).add64(200).encrypt();
 * await contract.setValue(input2.handles[0], input2.inputProof);
 * ```
 * 
 * ❌ MISTAKE 4: Missing Input Proof Parameter
 * ```solidity
 * // WRONG: Function without input proof
 * function badSetValue(euint64 value) external {
 *     balances[msg.sender] = value;  // Where did this value come from?
 * }
 * 
 * // CORRECT: Always require input proof for user-provided encrypted data
 * function goodSetValue(externalEuint64 calldata value, bytes calldata proof) external {
 *     euint64 verifiedValue = FHE.asEuint64(value, proof);
 *     balances[msg.sender] = verifiedValue;
 * }
 * ```
 * 
 * ============================================
 * 6. BEST PRACTICES
 * ============================================
 * 
 * ✅ DO: Always use input proofs for user-provided encrypted values
 * ✅ DO: Match signer address with encryption address
 * ✅ DO: Use correct contract address when creating inputs
 * ✅ DO: Create new inputs for each transaction
 * ✅ DO: Batch multiple values in one input for efficiency
 * 
 * ❌ DON'T: Skip input proofs (security risk!)
 * ❌ DON'T: Reuse input proofs
 * ❌ DON'T: Use mismatched addresses
 * ❌ DON'T: Trust encrypted values without proof verification
 * 
 * ============================================
 * 7. PERFORMANCE TIPS
 * ============================================
 * 
 * 💡 TIP: Batch Multiple Values
 * Instead of:
 * ```typescript
 * const input1 = await fhevm.createEncryptedInput(c, u).add64(100).encrypt();
 * const input2 = await fhevm.createEncryptedInput(c, u).add64(200).encrypt();
 * await contract.func(input1.handles[0], input1.inputProof, 
 *                     input2.handles[0], input2.inputProof);
 * ```
 * 
 * Do this (more efficient):
 * ```typescript
 * const input = await fhevm.createEncryptedInput(c, u)
 *   .add64(100)
 *   .add64(200)
 *   .encrypt();
 * await contract.func(input.handles[0], input.handles[1], input.inputProof);
 * ```
 */
