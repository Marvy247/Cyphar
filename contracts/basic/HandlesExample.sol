// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title HandlesExample
 * @notice Comprehensive guide to understanding encrypted value handles in FHEVM
 * @dev This example explains:
 * - What are handles?
 * - How handles are generated
 * - Handle lifecycle (creation → storage → usage → destruction)
 * - Symbolic execution with handles
 * - Handle types and their uses
 * - Common handle patterns and pitfalls
 * 
 * 🔑 Key Concepts:
 * 
 * **What is a Handle?**
 * A handle is a unique identifier (uint256) that points to an encrypted value stored in the FHE coprocessor.
 * Think of it like a "pointer" or "reference" to encrypted data.
 * 
 * **Why Use Handles?**
 * - Encrypted values are stored off-chain in the FHE coprocessor
 * - Handles allow Solidity contracts to reference encrypted values
 * - Handles are much smaller than encrypted ciphertexts
 * - Handles enable efficient encrypted computations
 * 
 * **Handle Properties:**
 * - Each handle is unique (like an address or ID)
 * - Handles are created when encrypting values
 * - Handles persist across transactions
 * - Handles can be stored in contract storage
 * - Handles can be passed between functions
 * 
 * **Symbolic Execution:**
 * FHE operations on handles create NEW handles that represent computed results.
 * For example: handle_c = FHE.add(handle_a, handle_b)
 * The FHE coprocessor tracks these operations symbolically.
 * 
 * Use Cases:
 * - All FHE operations (adding, comparing, selecting encrypted values)
 * - Storing encrypted state (balances, votes, bids)
 * - Passing encrypted values between contracts
 * - Building complex encrypted logic
 */
contract HandlesExample {
    // Stored handles for different encrypted types
    euint8 private storedUint8;
    euint16 private storedUint16;
    euint32 private storedUint32;
    euint64 private storedUint64;
    euint128 private storedUint128;
    euint256 private storedUint256;
    ebool private storedBool;
    eaddress private storedAddress;

    // Mapping to demonstrate handle storage patterns
    mapping(address => euint64) private userBalances;
    mapping(address => ebool) private userFlags;

    // Track handle generation for demonstration
    uint256 public handlesCreated;

    event HandleCreated(string handleType, uint256 indexed handleId);
    event HandleStored(string location, uint256 indexed handleId);
    event HandleComputed(string operation, uint256 resultHandleId);
    event HandleLifecycleDemo(string stage, uint256 handleId);

    /**
     * @notice Demonstrate handle creation from user input
     * @dev Shows how handles are generated when encrypting user data
     * @param encryptedValue External encrypted value (created off-chain)
     * @param inputProof Proof that binds the encrypted value
     * 
     * Handle Lifecycle Stage 1: CREATION
     * 
     * Off-chain (TypeScript):
     * ```typescript
     * const input = await fhevm.createEncryptedInput(contractAddr, userAddr)
     *   .add64(1000)  // Encrypt the value 1000
     *   .encrypt();
     * 
     * // input.handles[0] is the handle (a uint256)
     * console.log("Handle:", input.handles[0]);  // e.g., 0x1234...
     * ```
     * 
     * On-chain (Solidity):
     * ```solidity
     * euint64 value = FHE.asEuint64(encryptedValue, inputProof);
     * // 'value' is now a handle pointing to the encrypted data
     * ```
     * 
     * What Happens:
     * 1. User encrypts value off-chain → generates handle
     * 2. Handle + proof sent to contract
     * 3. FHE.asEuint64() verifies proof and returns internal handle
     * 4. Handle can now be used in FHE operations
     */
    function createHandleFromUserInput(
        externalEuint64 calldata encryptedValue,
        bytes calldata inputProof
    ) external returns (euint64) {
        // Converting external handle to internal handle
        euint64 handle = FHE.asEuint64(encryptedValue, inputProof);
        
        handlesCreated++;
        
        emit HandleCreated("euint64", euint64.unwrap(handle));
        
        return handle;
    }

    /**
     * @notice Demonstrate handle creation from plaintext
     * @dev Shows how to create handles for contract-generated values
     * @param plaintextValue A public value to encrypt
     * @return The handle to the encrypted value
     * 
     * Handle Creation Pattern 2: FROM PLAINTEXT
     * 
     * ```solidity
     * // Create encrypted value from plaintext
     * euint64 encryptedZero = FHE.asEuint64(0);
     * euint64 encrypted100 = FHE.asEuint64(100);
     * euint64 encrypted1000 = FHE.asEuint64(1000);
     * ```
     * 
     * Use Cases:
     * - Initial values (e.g., balance = 0)
     * - Constants in computations
     * - Default values
     * - Threshold values for comparisons
     */
    function createHandleFromPlaintext(uint64 plaintextValue) external returns (euint64) {
        euint64 handle = FHE.asEuint64(plaintextValue);
        
        handlesCreated++;
        
        emit HandleCreated("euint64 from plaintext", euint64.unwrap(handle));
        
        return handle;
    }

    /**
     * @notice Store a handle in contract storage
     * @dev Demonstrates Handle Lifecycle Stage 2: STORAGE
     * @param encryptedValue The encrypted value to store
     * @param inputProof Proof for the value
     * 
     * Handle Storage Patterns:
     * 
     * 1. Direct storage:
     * ```solidity
     * euint64 balance;
     * balance = encryptedAmount;  // Handle stored
     * ```
     * 
     * 2. Mapping storage:
     * ```solidity
     * mapping(address => euint64) balances;
     * balances[user] = encryptedAmount;  // Handle stored per user
     * ```
     * 
     * 3. Array storage:
     * ```solidity
     * euint64[] encryptedValues;
     * encryptedValues.push(newValue);  // Handle stored in array
     * ```
     * 
     * Important:
     * - Handles are just uint256 internally
     * - Storing handles is cheap (32 bytes)
     * - The actual encrypted data stays in FHE coprocessor
     * - Handles persist across transactions
     */
    function storeHandle(
        externalEuint64 calldata encryptedValue,
        bytes calldata inputProof
    ) external {
        euint64 handle = FHE.asEuint64(encryptedValue, inputProof);
        
        // Grant access so contract can use this handle
        FHE.allowThis(handle);
        FHE.allow(handle, msg.sender);
        
        // Store in mapping
        userBalances[msg.sender] = handle;
        
        emit HandleStored("userBalances mapping", euint64.unwrap(handle));
    }

    /**
     * @notice Demonstrate symbolic execution with handles
     * @dev Shows how FHE operations create new handles
     * 
     * Handle Lifecycle Stage 3: COMPUTATION (Symbolic Execution)
     * 
     * When you perform FHE operations, the result is a NEW handle:
     * 
     * ```solidity
     * euint64 a = FHE.asEuint64(10);    // Handle A
     * euint64 b = FHE.asEuint64(20);    // Handle B
     * euint64 c = FHE.add(a, b);        // Handle C (NEW handle for result)
     * 
     * // Behind the scenes:
     * // FHE coprocessor: "Handle C = Handle A + Handle B"
     * // The computation is recorded symbolically
     * // Actual decryption happens only when needed
     * ```
     * 
     * Symbolic Execution Workflow:
     * 1. FHE.add(a, b) creates a symbolic expression
     * 2. Returns new handle pointing to the expression
     * 3. Coprocessor evaluates when decryption requested
     * 4. All intermediate handles tracked for correctness
     */
    function demonstrateSymbolicExecution(
        externalEuint64 calldata value1,
        bytes calldata proof1,
        externalEuint64 calldata value2,
        bytes calldata proof2
    ) external returns (euint64) {
        // Create two handles
        euint64 handleA = FHE.asEuint64(value1, proof1);
        euint64 handleB = FHE.asEuint64(value2, proof2);
        
        emit HandleCreated("handleA", euint64.unwrap(handleA));
        emit HandleCreated("handleB", euint64.unwrap(handleB));
        
        // Symbolic addition: creates NEW handle
        euint64 handleC = FHE.add(handleA, handleB);
        emit HandleComputed("add", euint64.unwrap(handleC));
        
        // Symbolic multiplication: creates ANOTHER new handle
        euint64 handleD = FHE.mul(handleC, FHE.asEuint64(2));
        emit HandleComputed("mul", euint64.unwrap(handleD));
        
        // Symbolic comparison: creates ebool handle
        ebool handleE = FHE.gt(handleD, FHE.asEuint64(100));
        emit HandleComputed("gt", ebool.unwrap(handleE));
        
        // Select: creates final result handle
        euint64 result = FHE.select(handleE, handleD, FHE.asEuint64(0));
        emit HandleComputed("select", euint64.unwrap(result));
        
        return result;
    }

    /**
     * @notice Demonstrate handle types and their sizes
     * @dev Shows different encrypted types and their handle usage
     * 
     * Available Handle Types:
     * - ebool: Encrypted boolean
     * - euint8: Encrypted 8-bit unsigned integer
     * - euint16: Encrypted 16-bit unsigned integer
     * - euint32: Encrypted 32-bit unsigned integer
     * - euint64: Encrypted 64-bit unsigned integer
     * - euint128: Encrypted 128-bit unsigned integer
     * - euint256: Encrypted 256-bit unsigned integer
     * - eaddress: Encrypted Ethereum address
     * 
     * All types are stored as handles (uint256), but represent different encrypted sizes
     */
    function demonstrateHandleTypes() external {
        // Create handles for different types
        storedUint8 = FHE.asEuint8(255);
        storedUint16 = FHE.asEuint16(65535);
        storedUint32 = FHE.asEuint32(4294967295);
        storedUint64 = FHE.asEuint64(1000000);
        storedBool = FHE.asEbool(true);
        
        emit HandleCreated("euint8", euint8.unwrap(storedUint8));
        emit HandleCreated("euint16", euint16.unwrap(storedUint16));
        emit HandleCreated("euint32", euint32.unwrap(storedUint32));
        emit HandleCreated("euint64", euint64.unwrap(storedUint64));
        emit HandleCreated("ebool", ebool.unwrap(storedBool));
    }

    /**
     * @notice Complete handle lifecycle demonstration
     * @dev Shows: Creation → Storage → Computation → Retrieval
     * 
     * COMPLETE HANDLE LIFECYCLE:
     * 
     * Stage 1: CREATION
     * - User encrypts value off-chain
     * - Handle generated and sent to contract
     * 
     * Stage 2: VERIFICATION
     * - FHE.asEuint verifies input proof
     * - Returns verified handle
     * 
     * Stage 3: ACCESS CONTROL
     * - FHE.allowThis grants contract access
     * - FHE.allow grants user access
     * 
     * Stage 4: STORAGE
     * - Handle stored in contract state
     * - Persists across transactions
     * 
     * Stage 5: COMPUTATION
     * - FHE operations create new handles
     * - Symbolic execution tracks operations
     * 
     * Stage 6: RETRIEVAL
     * - Handle returned to authorized parties
     * - Can be decrypted off-chain
     */
    function completeLifecycleDemo(
        externalEuint64 calldata initialValue,
        bytes calldata inputProof
    ) external returns (euint64) {
        // Stage 1 & 2: Create and verify
        euint64 handle = FHE.asEuint64(initialValue, inputProof);
        emit HandleLifecycleDemo("created", euint64.unwrap(handle));
        
        // Stage 3: Access control
        FHE.allowThis(handle);
        FHE.allow(handle, msg.sender);
        emit HandleLifecycleDemo("access_granted", euint64.unwrap(handle));
        
        // Stage 4: Storage
        userBalances[msg.sender] = handle;
        emit HandleLifecycleDemo("stored", euint64.unwrap(handle));
        
        // Stage 5: Computation (create new handle)
        euint64 doubled = FHE.mul(handle, FHE.asEuint64(2));
        emit HandleLifecycleDemo("computed", euint64.unwrap(doubled));
        
        // Grant access to computed result
        FHE.allowThis(doubled);
        FHE.allow(doubled, msg.sender);
        
        // Stage 6: Return for retrieval
        emit HandleLifecycleDemo("returned", euint64.unwrap(doubled));
        return doubled;
    }

    /**
     * @notice Demonstrate handle chaining in complex operations
     * @dev Shows how multiple operations create a chain of handles
     * 
     * Handle Chaining Example:
     * ```solidity
     * h1 = FHE.asEuint64(a);      // Handle 1
     * h2 = FHE.asEuint64(b);      // Handle 2
     * h3 = FHE.add(h1, h2);       // Handle 3 = h1 + h2
     * h4 = FHE.mul(h3, h1);       // Handle 4 = h3 * h1
     * h5 = FHE.sub(h4, h2);       // Handle 5 = h4 - h2
     * ```
     * 
     * Each operation generates a new handle.
     * The FHE coprocessor maintains the entire computation graph.
     */
    function demonstrateHandleChaining(uint64 initialValue) external returns (euint64) {
        euint64 h1 = FHE.asEuint64(initialValue);
        emit HandleComputed("h1 = initial", euint64.unwrap(h1));
        
        euint64 h2 = FHE.add(h1, FHE.asEuint64(10));
        emit HandleComputed("h2 = h1 + 10", euint64.unwrap(h2));
        
        euint64 h3 = FHE.mul(h2, FHE.asEuint64(2));
        emit HandleComputed("h3 = h2 * 2", euint64.unwrap(h3));
        
        euint64 h4 = FHE.sub(h3, h1);
        emit HandleComputed("h4 = h3 - h1", euint64.unwrap(h4));
        
        return h4;
    }

    /**
     * @notice Get a user's balance handle
     * @param user Address to query
     * @return The encrypted balance handle
     */
    function getBalance(address user) external view returns (euint64) {
        return userBalances[user];
    }

    /**
     * @notice Get count of handles created
     * @return Number of handles created through this contract
     */
    function getHandlesCreated() external view returns (uint256) {
        return handlesCreated;
    }

    /**
     * @notice Demonstrate handle comparison operations
     * @dev Shows how comparison operations generate ebool handles
     */
    function demonstrateHandleComparisons(
        externalEuint64 calldata value1,
        bytes calldata proof1,
        externalEuint64 calldata value2,
        bytes calldata proof2
    ) external returns (ebool, ebool, ebool) {
        euint64 a = FHE.asEuint64(value1, proof1);
        euint64 b = FHE.asEuint64(value2, proof2);
        
        // Each comparison creates a new ebool handle
        ebool isEqual = FHE.eq(a, b);
        ebool isGreater = FHE.gt(a, b);
        ebool isLess = FHE.lt(a, b);
        
        emit HandleComputed("eq", ebool.unwrap(isEqual));
        emit HandleComputed("gt", ebool.unwrap(isGreater));
        emit HandleComputed("lt", ebool.unwrap(isLess));
        
        return (isEqual, isGreater, isLess);
    }
}

/**
 * 📚 COMPREHENSIVE GUIDE TO HANDLES
 * 
 * ============================================
 * 1. WHAT IS A HANDLE?
 * ============================================
 * 
 * A handle is a unique identifier (uint256) that references encrypted data stored in the FHE coprocessor.
 * 
 * Analogy:
 * - Think of handles like "file IDs" or "database keys"
 * - The handle is small (32 bytes), but points to large encrypted data
 * - You use handles to manipulate encrypted values without decrypting them
 * 
 * Example:
 * ```solidity
 * euint64 myBalance;  // This is actually a handle (uint256 underneath)
 * ```
 * 
 * ============================================
 * 2. HOW ARE HANDLES GENERATED?
 * ============================================
 * 
 * Method 1: From User Input (with proof)
 * ```typescript
 * // Off-chain
 * const input = await fhevm.createEncryptedInput(contractAddr, userAddr)
 *   .add64(1000).encrypt();
 * const handle = input.handles[0];  // Generated handle
 * ```
 * 
 * Method 2: From Plaintext
 * ```solidity
 * // On-chain
 * euint64 zero = FHE.asEuint64(0);  // New handle for encrypted zero
 * ```
 * 
 * Method 3: From Computation
 * ```solidity
 * euint64 a = FHE.asEuint64(10);
 * euint64 b = FHE.asEuint64(20);
 * euint64 sum = FHE.add(a, b);  // NEW handle for the result
 * ```
 * 
 * ============================================
 * 3. HANDLE LIFECYCLE
 * ============================================
 * 
 * 1. CREATION: Handle generated when value encrypted
 * 2. VERIFICATION: Input proof validates handle authenticity
 * 3. ACCESS CONTROL: Permissions granted via FHE.allow()
 * 4. STORAGE: Handle stored in contract state
 * 5. COMPUTATION: Operations create new handles
 * 6. RETRIEVAL: Handle returned to authorized users
 * 7. DECRYPTION: Off-chain decryption by authorized parties
 * 
 * ============================================
 * 4. SYMBOLIC EXECUTION
 * ============================================
 * 
 * The FHE coprocessor uses symbolic execution to track operations:
 * 
 * ```solidity
 * euint64 a = FHE.asEuint64(5);    // Coprocessor: h1 = encrypt(5)
 * euint64 b = FHE.asEuint64(3);    // Coprocessor: h2 = encrypt(3)
 * euint64 c = FHE.add(a, b);       // Coprocessor: h3 = h1 + h2
 * euint64 d = FHE.mul(c, a);       // Coprocessor: h4 = h3 * h1
 * ```
 * 
 * The coprocessor builds a computation graph:
 * ```
 * h1 (5)    h2 (3)
 *   \      /
 *    h3 (add)
 *     |    \
 *     |     h1
 *      \   /
 *      h4 (mul)
 * ```
 * 
 * Decryption evaluates the entire graph.
 * 
 * ============================================
 * 5. HANDLE TYPES
 * ============================================
 * 
 * | Type       | Size     | Use Case                    |
 * |------------|----------|-----------------------------|
 * | ebool      | 1 bit    | Boolean flags               |
 * | euint8     | 8 bits   | Small counters, options     |
 * | euint16    | 16 bits  | Medium-sized values         |
 * | euint32    | 32 bits  | Standard integers           |
 * | euint64    | 64 bits  | Token balances, amounts     |
 * | euint128   | 128 bits | Large financial values      |
 * | euint256   | 256 bits | Very large numbers          |
 * | eaddress   | 160 bits | Ethereum addresses          |
 * 
 * ============================================
 * 6. COMMON PATTERNS
 * ============================================
 * 
 * Pattern 1: Encrypted Balance
 * ```solidity
 * mapping(address => euint64) private balances;
 * 
 * function setBalance(externalEuint64 calldata amt, bytes calldata proof) external {
 *     euint64 handle = FHE.asEuint64(amt, proof);
 *     FHE.allowThis(handle);
 *     balances[msg.sender] = handle;
 * }
 * ```
 * 
 * Pattern 2: Encrypted Computation
 * ```solidity
 * function transfer(address to, euint64 amount) external {
 *     balances[msg.sender] = FHE.sub(balances[msg.sender], amount);
 *     balances[to] = FHE.add(balances[to], amount);
 * }
 * ```
 * 
 * Pattern 3: Conditional Logic
 * ```solidity
 * euint64 balance = balances[user];
 * ebool hasEnough = FHE.gte(balance, amount);
 * euint64 newBalance = FHE.select(hasEnough, FHE.sub(balance, amount), balance);
 * ```
 * 
 * ============================================
 * 7. IMPORTANT NOTES
 * ============================================
 * 
 * ✅ Handles are cheap to store (32 bytes each)
 * ✅ Handles can be passed between functions
 * ✅ Handles persist across transactions
 * ✅ Handles can be returned from view functions
 * 
 * ❌ Handles cannot be decrypted in view functions
 * ❌ Handles must have proper access control
 * ❌ Don't confuse handle ID with encrypted value
 * ❌ New handles created from operations need new permissions
 */
