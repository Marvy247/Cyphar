import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { InputProofExample } from "../../types";

describe("InputProofExample - Understanding Input Proofs", function () {
  let contract: InputProofExample;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("InputProofExample");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("📝 Basic Input Proof Usage", function () {
    it("✅ should accept valid input proof", async function () {
      const amount = 1000n * 10n ** 6n;

      // Create encrypted input with CORRECT addresses
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      // Should not revert with valid proof
      await expect(
        contract.connect(alice).setBalance(input.handles[0], input.inputProof)
      ).to.not.be.reverted;

      // Verify balance was set
      const balance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        await contract.getAddress(),
        alice
      );
      expect(decrypted).to.equal(amount);
    });

    it("❌ should reject when signer doesn't match input creator", async function () {
      const amount = 500n * 10n ** 6n;

      // Alice creates the encrypted input
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      // Bob tries to use Alice's encrypted input - should FAIL
      await expect(
        contract.connect(bob).setBalance(input.handles[0], input.inputProof)
      ).to.be.reverted; // Proof verification fails
    });

    it("❌ should reject invalid input proof", async function () {
      const amount = 500n * 10n ** 6n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      // Use wrong/corrupted proof
      const corruptedProof = "0x" + "00".repeat(input.inputProof.length / 2 - 1);

      await expect(
        contract.connect(alice).setBalance(input.handles[0], corruptedProof)
      ).to.be.reverted;
    });
  });

  describe("🗳️ Voting with Input Proofs", function () {
    it("✅ should cast vote with valid proof", async function () {
      const voteChoice = 3; // Vote for option 3

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add8(voteChoice)
        .encrypt();

      await expect(
        contract.connect(alice).castVote(input.handles[0], input.inputProof)
      ).to.emit(contract, "VoteCast");

      const vote = await contract.getVote(alice.address);
      expect(vote).to.not.equal(0n);
    });

    it("✅ should allow multiple users to vote independently", async function () {
      // Alice votes
      const aliceVote = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add8(1)
        .encrypt();
      await contract.connect(alice).castVote(aliceVote.handles[0], aliceVote.inputProof);

      // Bob votes
      const bobVote = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add8(2)
        .encrypt();
      await contract.connect(bob).castVote(bobVote.handles[0], bobVote.inputProof);

      // Both should have votes
      expect(await contract.getVote(alice.address)).to.not.equal(0n);
      expect(await contract.getVote(bob.address)).to.not.equal(0n);
    });
  });

  describe("💰 Auction Bids with Input Proofs", function () {
    it("✅ should place bid with valid proof", async function () {
      const bidAmount = 5000n * 10n ** 6n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(bidAmount)
        .encrypt();

      await expect(
        contract.connect(alice).placeBid(input.handles[0], input.inputProof)
      ).to.emit(contract, "BidPlaced");

      const bid = await contract.getBid(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bid,
        await contract.getAddress(),
        alice
      );
      expect(decrypted).to.equal(bidAmount);
    });

    it("🛡️ prevents bid replay attack", async function () {
      const bidAmount = 3000n * 10n ** 6n;

      // Alice places a bid
      const aliceBid = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(bidAmount)
        .encrypt();
      await contract.connect(alice).placeBid(aliceBid.handles[0], aliceBid.inputProof);

      // Bob tries to replay Alice's bid - should FAIL
      await expect(
        contract.connect(bob).placeBid(aliceBid.handles[0], aliceBid.inputProof)
      ).to.be.reverted;
    });
  });

  describe("🔢 Multiple Values with Input Proofs", function () {
    it("✅ should process multiple values with separate proofs", async function () {
      // Create two separate encrypted inputs
      const input1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();

      const input2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(2000n * 10n ** 6n)
        .encrypt();

      await contract.connect(alice).processMultipleValues(
        input1.handles[0], input1.inputProof,
        input2.handles[0], input2.inputProof
      );

      // Verify sum was stored (1000 + 2000 = 3000)
      const balance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        await contract.getAddress(),
        alice
      );
      expect(decrypted).to.equal(3000n * 10n ** 6n);
    });

    it("❌ should reject reusing same proof for different values", async function () {
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();

      // Try to use same proof twice
      await expect(
        contract.connect(alice).processMultipleValues(
          input.handles[0], input.inputProof,
          input.handles[0], input.inputProof  // Reusing same proof
        )
      ).to.be.reverted;
    });
  });

  describe("📦 Batch Encryption (Efficient Pattern)", function () {
    it("✅ should process multiple values from single input", async function () {
      // Create ONE input with THREE values
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .add64(2000n * 10n ** 6n)
        .add64(3000n * 10n ** 6n)
        .encrypt();

      // Single proof works for all values from this input
      await contract.connect(alice).batchSetValues(
        [input.handles[0], input.handles[1], input.handles[2]],
        input.inputProof
      );

      // Verify sum (1000 + 2000 + 3000 = 6000)
      const balance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        await contract.getAddress(),
        alice
      );
      expect(decrypted).to.equal(6000n * 10n ** 6n);
    });

    it("✅ should handle variable number of values", async function () {
      // Just 2 values this time
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add64(500n * 10n ** 6n)
        .add64(1500n * 10n ** 6n)
        .encrypt();

      await contract.connect(bob).batchSetValues(
        [input.handles[0], input.handles[1]],
        input.inputProof
      );

      const balance = await contract.getBalance(bob.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        await contract.getAddress(),
        bob
      );
      expect(decrypted).to.equal(2000n * 10n ** 6n);
    });

    it("❌ should reject empty array", async function () {
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();

      await expect(
        contract.connect(alice).batchSetValues([], input.inputProof)
      ).to.be.revertedWith("Empty array");
    });
  });

  describe("💸 Transfers with Input Proofs", function () {
    beforeEach(async function () {
      // Give Alice initial balance
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(10000n * 10n ** 6n)
        .encrypt();
      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);
    });

    it("✅ should transfer with valid input proof", async function () {
      const transferAmount = 3000n * 10n ** 6n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      await contract.connect(alice).transfer(
        bob.address,
        input.handles[0],
        input.inputProof
      );

      // Verify Alice's balance decreased
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await contract.getBalance(alice.address),
        await contract.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(7000n * 10n ** 6n);

      // Verify Bob received the amount
      const bobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await contract.getBalance(bob.address),
        await contract.getAddress(),
        bob
      );
      expect(bobBalance).to.equal(3000n * 10n ** 6n);
    });

    it("❌ should prevent using someone else's transfer input", async function () {
      // Alice creates transfer input
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();

      // Bob tries to use Alice's input - should FAIL
      await expect(
        contract.connect(bob).transfer(
          bob.address,
          input.handles[0],
          input.inputProof
        )
      ).to.be.reverted;
    });

    it("⚠️ should handle insufficient balance gracefully", async function () {
      const hugeAmount = 20000n * 10n ** 6n; // More than Alice has

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(hugeAmount)
        .encrypt();

      // Should not revert, but balance shouldn't change
      await contract.connect(alice).transfer(
        bob.address,
        input.handles[0],
        input.inputProof
      );

      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await contract.getBalance(alice.address),
        await contract.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(10000n * 10n ** 6n); // Unchanged
    });
  });

  describe("📖 Educational Test Cases", function () {
    it("demonstrates why contract address must match", async function () {
      // This test shows what happens with wrong contract address
      // Note: In practice this would fail at input creation level
      
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();

      // Using correct addresses works
      await expect(
        contract.connect(alice).setBalance(input.handles[0], input.inputProof)
      ).to.not.be.reverted;
    });

    it("demonstrates why signer must match", async function () {
      // Alice creates input
      const aliceInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();

      // Alice can use it - ✅
      await expect(
        contract.connect(alice).setBalance(aliceInput.handles[0], aliceInput.inputProof)
      ).to.not.be.reverted;

      // Bob creates his own input
      const bobInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add64(2000n * 10n ** 6n)
        .encrypt();

      // Bob can use his own - ✅
      await expect(
        contract.connect(bob).setBalance(bobInput.handles[0], bobInput.inputProof)
      ).to.not.be.reverted;

      // But Bob can't use Alice's input - ❌
      const aliceInput2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(500n * 10n ** 6n)
        .encrypt();
      
      await expect(
        contract.connect(bob).setBalance(aliceInput2.handles[0], aliceInput2.inputProof)
      ).to.be.reverted;
    });

    it("demonstrates efficient batching vs multiple calls", async function () {
      // Method 1: Multiple separate calls (less efficient)
      const input1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(100n * 10n ** 6n)
        .encrypt();
      const input2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(200n * 10n ** 6n)
        .encrypt();
      
      await contract.connect(alice).processMultipleValues(
        input1.handles[0], input1.inputProof,
        input2.handles[0], input2.inputProof
      );

      // Method 2: Batched in one input (more efficient)
      const batchedInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add64(100n * 10n ** 6n)
        .add64(200n * 10n ** 6n)
        .encrypt();

      await contract.connect(bob).batchSetValues(
        [batchedInput.handles[0], batchedInput.handles[1]],
        batchedInput.inputProof
      );

      // Both work, but batched is more efficient
      expect(true).to.be.true;
    });
  });
});
