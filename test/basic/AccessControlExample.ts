import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { AccessControlExample } from "../../types";

describe("AccessControlExample - FHE Access Control Patterns", function () {
  let contract: AccessControlExample;
  let admin: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;

  beforeEach(async function () {
    [admin, alice, bob, auditor] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("AccessControlExample");
    contract = await Factory.connect(admin).deploy();
    await contract.waitForDeployment();
  });

  describe("🔐 Basic Access Control", function () {
    it("✅ should set balance with proper access control", async function () {
      const amount = 1000n * 10n ** 6n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);

      // Alice can decrypt her own balance
      const balanceHandle = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        await contract.getAddress(),
        alice
      );

      expect(decrypted).to.equal(amount);
    });

    it("❌ should prevent unauthorized access to balances", async function () {
      const amount = 500n * 10n ** 6n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);

      const aliceBalance = await contract.getBalance(alice.address);

      // Bob should NOT be able to decrypt Alice's balance
      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint64,
          aliceBalance,
          await contract.getAddress(),
          bob
        )
      ).to.be.rejected;
    });
  });

  describe("👥 Granting Access (FHE.allow)", function () {
    beforeEach(async function () {
      const amount = 1000n * 10n ** 6n;
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();
      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);
    });

    it("✅ should allow user to grant access to another address", async function () {
      // Alice grants Bob access to her balance
      await contract.connect(alice).grantAccess(alice.address, bob.address);

      // Now Bob CAN decrypt Alice's balance
      const aliceBalance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        await contract.getAddress(),
        bob
      );

      expect(decrypted).to.equal(1000n * 10n ** 6n);
    });

    it("✅ should allow admin to grant access on behalf of user", async function () {
      // Admin grants Bob access to Alice's balance
      await contract.connect(admin).grantAccess(alice.address, bob.address);

      const aliceBalance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        await contract.getAddress(),
        bob
      );

      expect(decrypted).to.equal(1000n * 10n ** 6n);
    });

    it("❌ should prevent unauthorized users from granting access", async function () {
      // Bob tries to grant himself access to Alice's balance (not admin, not alice)
      await expect(
        contract.connect(bob).grantAccess(alice.address, bob.address)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("⚡ Transient Access (allowTransient)", function () {
    beforeEach(async function () {
      // Give Alice and Bob some balance
      const aliceInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();
      await contract.connect(alice).setBalance(aliceInput.handles[0], aliceInput.inputProof);

      const bobInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add64(500n * 10n ** 6n)
        .encrypt();
      await contract.connect(bob).setBalance(bobInput.handles[0], bobInput.inputProof);
    });

    it("✅ should transfer using transient access", async function () {
      const transferAmount = 300n * 10n ** 6n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      await contract.connect(alice).transfer(bob.address, input.handles[0], input.inputProof);

      // Verify Alice's new balance
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await contract.getBalance(alice.address),
        await contract.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(700n * 10n ** 6n);

      // Verify Bob's new balance
      const bobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await contract.getBalance(bob.address),
        await contract.getAddress(),
        bob
      );
      expect(bobBalance).to.equal(800n * 10n ** 6n);
    });

    it("⚠️ should fail silently when transferring more than balance", async function () {
      const transferAmount = 2000n * 10n ** 6n; // More than Alice has

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      await contract.connect(alice).transfer(bob.address, input.handles[0], input.inputProof);

      // Balances should remain unchanged
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await contract.getBalance(alice.address),
        await contract.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(1000n * 10n ** 6n);
    });
  });

  describe("👨‍💼 Auditor Role", function () {
    beforeEach(async function () {
      const amount = 1000n * 10n ** 6n;
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();
      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);
    });

    it("✅ should set auditor", async function () {
      await contract.connect(admin).setAuditor(auditor.address);
      expect(await contract.auditor()).to.equal(auditor.address);
    });

    it("❌ should prevent non-admin from setting auditor", async function () {
      await expect(
        contract.connect(alice).setAuditor(auditor.address)
      ).to.be.revertedWith("Only admin");
    });

    it("✅ should allow auditor to view user balance after access granted", async function () {
      // Set auditor
      await contract.connect(admin).setAuditor(auditor.address);

      // Grant auditor access to Alice's balance
      await contract.connect(admin).grantAuditorAccess(alice.address);

      // Auditor can now decrypt Alice's balance
      const aliceBalance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        await contract.getAddress(),
        auditor
      );

      expect(decrypted).to.equal(1000n * 10n ** 6n);
    });

    it("✅ should allow user to grant auditor access themselves", async function () {
      await contract.connect(admin).setAuditor(auditor.address);

      // Alice grants auditor access to her own balance
      await contract.connect(alice).grantAuditorAccess(alice.address);

      const aliceBalance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        await contract.getAddress(),
        auditor
      );

      expect(decrypted).to.equal(1000n * 10n ** 6n);
    });
  });

  describe("🔄 Balance Comparisons", function () {
    beforeEach(async function () {
      const aliceInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(1000n * 10n ** 6n)
        .encrypt();
      await contract.connect(alice).setBalance(aliceInput.handles[0], aliceInput.inputProof);

      const bobInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add64(500n * 10n ** 6n)
        .encrypt();
      await contract.connect(bob).setBalance(bobInput.handles[0], bobInput.inputProof);
    });

    it("✅ should compare balances and return encrypted result", async function () {
      const resultHandle = await contract.connect(admin).compareBalances(alice.address, bob.address);

      // Result should be accessible by the caller
      const decrypted = await fhevm.userDecryptEbool(
        resultHandle,
        await contract.getAddress(),
        admin
      );

      expect(decrypted).to.be.true; // Alice (1000) >= Bob (500)
    });
  });

  describe("📚 Access Type Demonstration", function () {
    it("✅ should demonstrate permanent vs transient access", async function () {
      const amount = 1000n * 10n ** 6n;
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);
      const balance = await contract.getBalance(alice.address);

      // Demonstrate permanent access
      await contract.demonstrateAccessTypes(balance, bob.address, true);

      // Demonstrate transient access
      await contract.demonstrateAccessTypes(balance, bob.address, false);

      // Both should not revert
      expect(true).to.be.true;
    });
  });

  describe("💡 Educational Test Cases", function () {
    it("📖 demonstrates the flow: encrypt → store → grant access → decrypt", async function () {
      // Step 1: Alice encrypts her balance
      const amount = 2000n * 10n ** 6n;
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      // Step 2: Store encrypted balance (contract gets access via allowThis)
      await contract.connect(alice).setBalance(input.handles[0], input.inputProof);

      // Step 3: Alice grants Bob access
      await contract.connect(alice).grantAccess(alice.address, bob.address);

      // Step 4: Bob can now decrypt
      const balance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        await contract.getAddress(),
        bob
      );

      expect(decrypted).to.equal(amount);
    });

    it("📖 demonstrates why allowThis() is needed", async function () {
      // This test shows that operations require contract access
      const amount = 1000n * 10n ** 6n;
      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(amount)
        .encrypt();

      // setBalance internally calls FHE.allowThis() before operations
      await expect(
        contract.connect(alice).setBalance(input.handles[0], input.inputProof)
      ).to.not.be.reverted;
    });
  });
});
