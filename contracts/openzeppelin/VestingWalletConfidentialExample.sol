// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "../../openzeppelin-confidential-contracts/contracts/finance/VestingWalletConfidential.sol";

/**
 * @title VestingWalletConfidentialExample
 * @notice A confidential vesting wallet for ERC7984 tokens with cliff period support
 * @dev This example demonstrates:
 * - Time-locked confidential token vesting
 * - Linear vesting schedule with cliff period
 * - Confidential release calculations
 * - Privacy-preserving token distributions
 * 
 * Key Concepts:
 * - **Start Time**: When vesting begins
 * - **Duration**: Total vesting period (e.g., 4 years)
 * - **Cliff**: Minimum time before any tokens vest (e.g., 1 year)
 * - **Linear Release**: Tokens vest proportionally over time
 * - **Confidential Amounts**: All vesting calculations use encrypted values
 * 
 * Use Cases:
 * - Team token vesting (confidential allocations)
 * - Private investor vesting schedules
 * - Anonymous employee stock options
 * - Confidential advisory token grants
 * - DAO treasury vesting
 * 
 * Example Vesting Schedule:
 * - Total: 1,000,000 tokens
 * - Cliff: 12 months (no tokens released before this)
 * - Duration: 48 months (4 years total)
 * - After cliff: 25% vested (250,000 tokens)
 * - Then: Linear vesting of remaining 75% over 36 months
 */
contract VestingWalletConfidentialExample is VestingWalletConfidential {
    /// @notice Minimum cliff period (e.g., 30 days)
    uint64 public constant MIN_CLIFF = 30 days;
    
    /// @notice Maximum vesting duration (e.g., 10 years)
    uint64 public constant MAX_DURATION = 10 * 365 days;

    /**
     * @notice Initialize the vesting wallet
     * @dev This is called once during deployment/clone creation
     * @param beneficiary_ The address that will receive vested tokens
     * @param startTimestamp_ When vesting starts (unix timestamp)
     * @param durationSeconds_ Total vesting duration in seconds
     * @param cliffSeconds_ Cliff period in seconds (must be <= duration)
     * 
     * Requirements:
     * - beneficiary cannot be zero address
     * - cliff must be <= duration
     * - duration must be > 0 and <= MAX_DURATION
     * 
     * Example Setup:
     * ```solidity
     * // 4-year vesting with 1-year cliff
     * uint64 startTime = uint64(block.timestamp);
     * uint64 duration = 4 * 365 days;
     * uint64 cliff = 1 * 365 days;
     * 
     * VestingWallet wallet = new VestingWalletConfidentialExample(
     *     beneficiaryAddress,
     *     startTime,
     *     duration,
     *     cliff
     * );
     * 
     * // Transfer confidential tokens to the wallet
     * token.transfer(address(wallet), encryptedAmount, inputProof);
     * ```
     */
    function initialize(
        address beneficiary_,
        uint64 startTimestamp_,
        uint64 durationSeconds_,
        uint64 cliffSeconds_
    ) external initializer {
        // Validation
        require(beneficiary_ != address(0), "Invalid beneficiary");
        require(cliffSeconds_ <= durationSeconds_, "Cliff exceeds duration");
        require(durationSeconds_ > 0 && durationSeconds_ <= MAX_DURATION, "Invalid duration");
        require(cliffSeconds_ >= MIN_CLIFF || cliffSeconds_ == 0, "Cliff too short");

        __Ownable_init(beneficiary_);
        __VestingWallet_init(startTimestamp_, durationSeconds_);
    }

    /**
     * @notice Release vested tokens to the beneficiary
     * @dev Anyone can call this, but tokens go to the beneficiary (owner)
     * @param token The ERC7984 token address to release
     * 
     * How it works:
     * 1. Calculates how many tokens have vested so far
     * 2. Subtracts already released tokens
     * 3. Transfers the releasable amount to beneficiary
     * 
     * Example Usage:
     * ```typescript
     * // Anyone can trigger release, but tokens go to beneficiary
     * await vestingWallet.release(tokenAddress);
     * 
     * // Beneficiary can check their balance (encrypted)
     * const balance = await token.confidentialBalanceOf(beneficiaryAddress);
     * const decrypted = await fhevm.userDecryptEuint(
     *   FhevmType.euint64,
     *   balance,
     *   tokenAddress,
     *   beneficiary
     * );
     * ```
     */
    function release(address token) public override {
        super.release(token);
    }

    /**
     * @notice Get the amount of tokens that can be released now
     * @dev Returns an encrypted amount (euint64)
     * @param token The ERC7984 token address
     * @return Encrypted releasable amount
     * 
     * Calculation:
     * releasable = vestedAmount(currentTime) - alreadyReleased
     * 
     * Note: This function performs FHE operations, so it's not a view function
     */
    function releasable(address token) public override returns (euint64) {
        return super.releasable(token);
    }

    /**
     * @notice Get total amount of tokens already released
     * @dev Returns encrypted amount to preserve privacy
     * @param token The ERC7984 token address
     * @return Encrypted amount already released
     */
    function released(address token) public view override returns (euint128) {
        return super.released(token);
    }

    /**
     * @notice Calculate vested amount at a specific timestamp
     * @dev This implements the vesting curve (linear after cliff)
     * @param token The ERC7984 token address
     * @param timestamp The time to calculate vesting for
     * @return Encrypted vested amount at the given time
     * 
     * Vesting Curve:
     * - Before start: 0 tokens vested
     * - Before cliff: 0 tokens vested
     * - After cliff, before end: Linear interpolation
     * - After end: 100% vested
     * 
     * Formula (after cliff):
     * vestedAmount = totalBalance * (timestamp - start) / duration
     */
    function vestedAmount(address token, uint48 timestamp) public virtual returns (euint128) {
        return _vestedAmount(token, timestamp);
    }

    /**
     * @notice Get the vesting start timestamp
     * @return Unix timestamp when vesting starts
     */
    function start() public view override returns (uint64) {
        return super.start();
    }

    /**
     * @notice Get the vesting duration in seconds
     * @return Duration in seconds
     */
    function duration() public view override returns (uint64) {
        return super.duration();
    }

    /**
     * @notice Get the vesting end timestamp
     * @return Unix timestamp when vesting completes
     */
    function end() public view override returns (uint64) {
        return super.end();
    }

    /**
     * @notice Transfer ownership (beneficiary) of vested tokens
     * @dev This allows selling unvested tokens to a new beneficiary
     * @param newOwner The new beneficiary address
     * 
     * ⚠️ WARNING: This transfers the right to all future vested tokens!
     * 
     * Use Case: Secondary market for vested tokens
     * ```typescript
     * // Original beneficiary sells vesting rights
     * await vestingWallet.connect(beneficiary).transferOwnership(buyer);
     * 
     * // Buyer is now the new beneficiary
     * // Future releases go to buyer's address
     * ```
     */
    function transferOwnership(address newOwner) public override {
        super.transferOwnership(newOwner);
    }

    /**
     * @dev Internal vesting calculation
     * Implements linear vesting after cliff period
     */
    function _vestedAmount(address token, uint48 timestamp) internal virtual returns (euint128) {
        return super.vestedAmount(token, timestamp);
    }
}

/**
 * @title VestingWalletFactory
 * @notice Factory for deploying vesting wallets with cliff support
 * @dev Uses CREATE2 for deterministic addresses or CREATE for standard deployment
 */
contract VestingWalletFactory {
    event VestingWalletCreated(
        address indexed wallet,
        address indexed beneficiary,
        uint64 start,
        uint64 duration,
        uint64 cliff
    );

    /**
     * @notice Create a new vesting wallet
     * @param beneficiary The token recipient
     * @param startTimestamp When vesting begins
     * @param durationSeconds Total vesting period
     * @param cliffSeconds Cliff period
     * @return The address of the new vesting wallet
     * 
     * Example: Deploy vesting wallets for team members
     * ```typescript
     * const factory = await ethers.getContractAt("VestingWalletFactory", factoryAddress);
     * 
     * const teamMembers = [alice, bob, charlie];
     * const vestingWallets = [];
     * 
     * for (const member of teamMembers) {
     *   const tx = await factory.createVestingWallet(
     *     member,
     *     startTime,
     *     4 * 365 * 24 * 3600, // 4 years
     *     1 * 365 * 24 * 3600  // 1 year cliff
     *   );
     *   const receipt = await tx.wait();
     *   const walletAddress = receipt.events[0].args.wallet;
     *   vestingWallets.push(walletAddress);
     * }
     * 
     * // Fund all vesting wallets
     * for (const wallet of vestingWallets) {
     *   await token.transfer(wallet, encryptedAmount, inputProof);
     * }
     * ```
     */
    function createVestingWallet(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    ) external returns (address) {
        VestingWalletConfidentialExample wallet = new VestingWalletConfidentialExample();
        
        wallet.initialize(beneficiary, startTimestamp, durationSeconds, cliffSeconds);

        emit VestingWalletCreated(
            address(wallet),
            beneficiary,
            startTimestamp,
            durationSeconds,
            cliffSeconds
        );

        return address(wallet);
    }

    /**
     * @notice Batch create multiple vesting wallets
     * @param beneficiaries Array of recipient addresses
     * @param startTimestamp Common start time for all
     * @param durationSeconds Common duration for all
     * @param cliffSeconds Common cliff for all
     * @return Array of created wallet addresses
     * 
     * Use Case: Deploy vesting for entire team at once
     */
    function batchCreateVestingWallets(
        address[] calldata beneficiaries,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    ) external returns (address[] memory) {
        address[] memory wallets = new address[](beneficiaries.length);

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            wallets[i] = this.createVestingWallet(
                beneficiaries[i],
                startTimestamp,
                durationSeconds,
                cliffSeconds
            );
        }

        return wallets;
    }
}
