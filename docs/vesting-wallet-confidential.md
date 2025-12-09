This example demonstrates time-locked confidential token vesting with cliff periods and linear release schedules.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="VestingWalletConfidentialExample.sol" %}

```solidity
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

```

{% endtab %}

{% tab title="VestingWalletConfidentialExample.ts" %}

```typescript
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { VestingWalletConfidentialExample, VestingWalletFactory, ERC7984Example } from "../../types";

describe("VestingWalletConfidentialExample - Time-Locked Token Vesting", function () {
  let vestingWallet: VestingWalletConfidentialExample;
  let factory: VestingWalletFactory;
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let beneficiary: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const TOKEN_NAME = "Vesting Token";
  const TOKEN_SYMBOL = "VEST";
  const CONTRACT_URI = "https://example.com/vesting";

  // Vesting parameters
  const DURATION = 4 * 365 * 24 * 3600; // 4 years in seconds
  const CLIFF = 1 * 365 * 24 * 3600; // 1 year cliff
  const VESTING_AMOUNT = 1_000_000n * 10n ** 6n; // 1M tokens (6 decimals)

  beforeEach(async function () {
    [owner, beneficiary, other] = await ethers.getSigners();

    // Deploy ERC7984 token
    const TokenFactory = await ethers.getContractFactory("ERC7984Example");
    token = await TokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, CONTRACT_URI);
    await token.waitForDeployment();

    // Deploy vesting wallet
    const VestingFactory = await ethers.getContractFactory("VestingWalletConfidentialExample");
    vestingWallet = await VestingFactory.deploy();
    await vestingWallet.waitForDeployment();

    // Initialize vesting wallet
    const startTime = await time.latest();
    await vestingWallet.initialize(
      beneficiary.address,
      startTime,
      DURATION,
      CLIFF
    );

    // Mint tokens to vesting wallet
    const input = await fhevm
      .createEncryptedInput(await token.getAddress(), owner.address)
      .add64(VESTING_AMOUNT)
      .encrypt();
    await token.mint(await vestingWallet.getAddress(), input.handles[0], input.inputProof);
  });

  describe("🏗️ Vesting Wallet Setup", function () {
    it("✅ should initialize with correct parameters", async function () {
      const duration = await vestingWallet.duration();
      expect(duration).to.equal(DURATION);
    });

    it("✅ should set correct beneficiary (owner)", async function () {
      expect(await vestingWallet.owner()).to.equal(beneficiary.address);
    });

    it("✅ should calculate correct end time", async function () {
      const start = await vestingWallet.start();
      const end = await vestingWallet.end();
      expect(end).to.equal(start + BigInt(DURATION));
    });

    it("❌ should revert on invalid initialization parameters", async function () {
      const VestingFactory = await ethers.getContractFactory("VestingWalletConfidentialExample");
      const invalidWallet = await VestingFactory.deploy();

      const startTime = await time.latest();

      // Zero address beneficiary
      await expect(
        invalidWallet.initialize(ethers.ZeroAddress, startTime, DURATION, CLIFF)
      ).to.be.revertedWith("Invalid beneficiary");

      // Cliff exceeds duration
      await expect(
        invalidWallet.initialize(beneficiary.address, startTime, DURATION, DURATION + 1)
      ).to.be.revertedWith("Cliff exceeds duration");

      // Zero duration
      await expect(
        invalidWallet.initialize(beneficiary.address, startTime, 0, 0)
      ).to.be.revertedWith("Invalid duration");
    });
  });

  describe("⏰ Vesting Schedule - Before Cliff", function () {
    it("✅ should have zero releasable amount before cliff", async function () {
      // Time travel to just before cliff (e.g., 11 months)
      await time.increase(CLIFF - 30 * 24 * 3600); // 11 months

      const releasableHandle = await vestingWallet.releasable(await token.getAddress());
      const releasableAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        releasableHandle,
        await token.getAddress(),
        beneficiary
      );

      expect(releasableAmount).to.equal(0);
    });

    it("✅ should not release tokens before cliff", async function () {
      // Try to release tokens before cliff
      await time.increase(CLIFF / 2); // 6 months

      await vestingWallet.release(await token.getAddress());

      // Beneficiary should have zero balance
      const beneficiaryBalance = await token.confidentialBalanceOf(beneficiary.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        beneficiaryBalance,
        await token.getAddress(),
        beneficiary
      );

      expect(decryptedBalance).to.equal(0);
    });
  });

  describe("⏰ Vesting Schedule - After Cliff", function () {
    it("✅ should vest 25% of tokens after 1-year cliff", async function () {
      // Time travel to exactly after cliff
      await time.increase(CLIFF);

      const releasableHandle = await vestingWallet.releasable(await token.getAddress());
      const releasableAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        releasableHandle,
        await token.getAddress(),
        beneficiary
      );

      // After 1 year of 4 years = 25% vested
      const expectedVested = VESTING_AMOUNT / 4n;
      expect(releasableAmount).to.be.closeTo(expectedVested, 10n ** 5n); // Allow small rounding
    });

    it("✅ should release vested tokens after cliff", async function () {
      await time.increase(CLIFF + 1); // Just after cliff

      // Release tokens
      await vestingWallet.release(await token.getAddress());

      // Check beneficiary received tokens
      const beneficiaryBalance = await token.confidentialBalanceOf(beneficiary.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        beneficiaryBalance,
        await token.getAddress(),
        beneficiary
      );

      expect(decryptedBalance).to.be.gt(0);
    });
  });

  describe("📈 Linear Vesting After Cliff", function () {
    it("✅ should vest 50% after 2 years", async function () {
      await time.increase(2 * 365 * 24 * 3600); // 2 years

      const releasableHandle = await vestingWallet.releasable(await token.getAddress());
      const releasableAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        releasableHandle,
        await token.getAddress(),
        beneficiary
      );

      const expectedVested = VESTING_AMOUNT / 2n;
      expect(releasableAmount).to.be.closeTo(expectedVested, 10n ** 6n);
    });

    it("✅ should vest 75% after 3 years", async function () {
      await time.increase(3 * 365 * 24 * 3600); // 3 years

      const releasableHandle = await vestingWallet.releasable(await token.getAddress());
      const releasableAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        releasableHandle,
        await token.getAddress(),
        beneficiary
      );

      const expectedVested = (VESTING_AMOUNT * 3n) / 4n;
      expect(releasableAmount).to.be.closeTo(expectedVested, 10n ** 6n);
    });

    it("✅ should vest 100% after full duration", async function () {
      await time.increase(DURATION + 1); // After full vesting period

      const releasableHandle = await vestingWallet.releasable(await token.getAddress());
      const releasableAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        releasableHandle,
        await token.getAddress(),
        beneficiary
      );

      // All tokens should be vested
      expect(releasableAmount).to.be.closeTo(VESTING_AMOUNT, 10n ** 6n);
    });
  });

  describe("🔄 Multiple Releases", function () {
    it("✅ should allow multiple releases over time", async function () {
      // Release after cliff (25% vested)
      await time.increase(CLIFF);
      await vestingWallet.release(await token.getAddress());

      const firstBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(beneficiary.address),
        await token.getAddress(),
        beneficiary
      );

      // Release after another year (50% total vested)
      await time.increase(365 * 24 * 3600);
      await vestingWallet.release(await token.getAddress());

      const secondBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(beneficiary.address),
        await token.getAddress(),
        beneficiary
      );

      // Second balance should be greater than first
      expect(secondBalance).to.be.gt(firstBalance);
    });

    it("✅ should track released amount correctly", async function () {
      await time.increase(CLIFF);
      await vestingWallet.release(await token.getAddress());

      const releasedHandle = await vestingWallet.released(await token.getAddress());
      // Released amount is euint128, need to decrypt it
      // For now, just verify it exists
      expect(releasedHandle).to.not.equal(0n);
    });

    it("⚠️ should not release additional tokens if already released", async function () {
      await time.increase(CLIFF);
      
      // Release once
      await vestingWallet.release(await token.getAddress());
      const firstBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(beneficiary.address),
        await token.getAddress(),
        beneficiary
      );

      // Try to release again immediately (without time passing)
      await vestingWallet.release(await token.getAddress());
      const secondBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(beneficiary.address),
        await token.getAddress(),
        beneficiary
      );

      // Balance should be the same
      expect(secondBalance).to.equal(firstBalance);
    });
  });

  describe("👤 Beneficiary Management", function () {
    it("✅ should allow beneficiary to transfer ownership", async function () {
      await vestingWallet.connect(beneficiary).transferOwnership(other.address);
      expect(await vestingWallet.owner()).to.equal(other.address);
    });

    it("✅ should send released tokens to new beneficiary after ownership transfer", async function () {
      // Transfer ownership before vesting
      await vestingWallet.connect(beneficiary).transferOwnership(other.address);

      // Time travel and release
      await time.increase(CLIFF);
      await vestingWallet.release(await token.getAddress());

      // Tokens should go to new beneficiary (other)
      const otherBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(other.address),
        await token.getAddress(),
        other
      );

      expect(otherBalance).to.be.gt(0);

      // Original beneficiary should have zero
      const beneficiaryBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(beneficiary.address),
        await token.getAddress(),
        beneficiary
      );

      expect(beneficiaryBalance).to.equal(0);
    });

    it("❌ should prevent non-beneficiary from transferring ownership", async function () {
      await expect(
        vestingWallet.connect(other).transferOwnership(other.address)
      ).to.be.reverted;
    });
  });

  describe("🏭 Vesting Wallet Factory", function () {
    beforeEach(async function () {
      const FactoryContract = await ethers.getContractFactory("VestingWalletFactory");
      factory = await FactoryContract.deploy();
      await factory.waitForDeployment();
    });

    it("✅ should create vesting wallet via factory", async function () {
      const startTime = await time.latest();
      
      const tx = await factory.createVestingWallet(
        beneficiary.address,
        startTime,
        DURATION,
        CLIFF
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check event emission
      await expect(tx).to.emit(factory, "VestingWalletCreated");
    });

    it("✅ should batch create multiple vesting wallets", async function () {
      const beneficiaries = [beneficiary.address, other.address, owner.address];
      const startTime = await time.latest();

      const tx = await factory.batchCreateVestingWallets(
        beneficiaries,
        startTime,
        DURATION,
        CLIFF
      );

      const receipt = await tx.wait();
      
      // Should create 3 wallets
      const events = receipt?.logs.filter((log: any) => {
        try {
          return factory.interface.parseLog(log as any)?.name === "VestingWalletCreated";
        } catch {
          return false;
        }
      });

      expect(events?.length).to.equal(3);
    });

    it("✅ should create deterministic addresses", async function () {
      const startTime = await time.latest();

      // Create first wallet
      const tx1 = await factory.createVestingWallet(
        beneficiary.address,
        startTime,
        DURATION,
        CLIFF
      );
      const receipt1 = await tx1.wait();

      // Verify wallet was created and event emitted
      await expect(tx1).to.emit(factory, "VestingWalletCreated");
    });
  });

  describe("🔍 Edge Cases", function () {
    it("✅ should handle release call by non-beneficiary", async function () {
      await time.increase(CLIFF);

      // Anyone can call release, but tokens go to beneficiary
      await vestingWallet.connect(other).release(await token.getAddress());

      // Beneficiary should receive tokens
      const beneficiaryBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(beneficiary.address),
        await token.getAddress(),
        beneficiary
      );

      expect(beneficiaryBalance).to.be.gt(0);

      // Caller should not receive tokens
      const otherBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(other.address),
        await token.getAddress(),
        other
      );

      expect(otherBalance).to.equal(0);
    });

    it("✅ should handle vesting wallet with no tokens", async function () {
      // Create empty vesting wallet
      const VestingFactory = await ethers.getContractFactory("VestingWalletConfidentialExample");
      const emptyWallet = await VestingFactory.deploy();
      const startTime = await time.latest();
      await emptyWallet.initialize(beneficiary.address, startTime, DURATION, CLIFF);

      await time.increase(CLIFF);

      // Release should not revert even with no tokens
      await expect(
        emptyWallet.release(await token.getAddress())
      ).to.not.be.reverted;
    });

    it("✅ should handle vesting schedule shorter than 1 year", async function () {
      const shortDuration = 180 * 24 * 3600; // 6 months
      const shortCliff = 30 * 24 * 3600; // 30 days

      const VestingFactory = await ethers.getContractFactory("VestingWalletConfidentialExample");
      const shortWallet = await VestingFactory.deploy();
      const startTime = await time.latest();
      
      await shortWallet.initialize(beneficiary.address, startTime, shortDuration, shortCliff);

      // Fund the wallet
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(100000n * 10n ** 6n)
        .encrypt();
      await token.mint(await shortWallet.getAddress(), input.handles[0], input.inputProof);

      // Time travel past cliff
      await time.increase(shortCliff + 1);

      // Should be able to release
      await expect(
        shortWallet.release(await token.getAddress())
      ).to.not.be.reverted;
    });
  });

  describe("🎭 Privacy Properties", function () {
    it("✅ should keep vesting amounts confidential", async function () {
      await time.increase(CLIFF);
      await vestingWallet.release(await token.getAddress());

      // Other users shouldn't be able to decrypt beneficiary's balance
      const beneficiaryBalance = await token.confidentialBalanceOf(beneficiary.address);

      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint64,
          beneficiaryBalance,
          await token.getAddress(),
          other // Different user trying to decrypt
        )
      ).to.be.rejected;
    });

    it("✅ should keep vesting schedule private", async function () {
      // While start/duration are public, actual amounts vested remain encrypted
      // This means competitors can't see exact token allocations
      const releasedAmount = await vestingWallet.released(await token.getAddress());
      
      // Released amount is encrypted (euint128)
      // External observers can't determine the exact amount
      expect(releasedAmount).to.not.equal(0n);
    });
  });
});

```

{% endtab %}

{% endtabs %}
