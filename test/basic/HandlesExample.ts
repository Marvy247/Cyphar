import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { HandlesExample } from "../../types";

describe("HandlesExample - Understanding Encrypted Handles", function () {
  let contract: HandlesExample;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("HandlesExample");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("🎯 Handle Creation", function () {
    it("✅ should create handle from user input", async function () {
      const value = 1000n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      const tx = await contract
        .connect(alice)
        .createHandleFromUserInput(input.handles[0], input.inputProof);

      await expect(tx).to.emit(contract, "HandleCreated").withArgs("euint64", input.handles[0]);
    });

    it("✅ should create handle from plaintext", async function () {
      const plaintextValue = 500;

      const tx = await contract.createHandleFromPlaintext(plaintextValue);

      await expect(tx).to.emit(contract, "HandleCreated");
    });

    it("✅ should track handles created", async function () {
      const initialCount = await contract.getHandlesCreated();

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(100)
        .encrypt();

      await contract.connect(alice).createHandleFromUserInput(input.handles[0], input.inputProof);

      expect(await contract.getHandlesCreated()).to.equal(initialCount + 1n);
    });
  });

  describe("💾 Handle Storage", function () {
    it("✅ should store handle in mapping", async function () {
      const value = 5000n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      const tx = await contract.connect(alice).storeHandle(input.handles[0], input.inputProof);

      await expect(tx).to.emit(contract, "HandleStored").withArgs("userBalances mapping", input.handles[0]);

      // Verify handle was stored
      const storedHandle = await contract.getBalance(alice.address);
      expect(storedHandle).to.not.equal(0n);
    });

    it("✅ should allow retrieving stored handle", async function () {
      const value = 2000n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      await contract.connect(alice).storeHandle(input.handles[0], input.inputProof);

      // Retrieve and decrypt
      const balance = await contract.getBalance(alice.address);
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        await contract.getAddress(),
        alice
      );

      expect(decrypted).to.equal(value);
    });

    it("✅ should store different handles for different users", async function () {
      // Alice stores value
      const aliceValue = 1000n;
      const aliceInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(aliceValue)
        .encrypt();
      await contract.connect(alice).storeHandle(aliceInput.handles[0], aliceInput.inputProof);

      // Bob stores value
      const bobValue = 2000n;
      const bobInput = await fhevm
        .createEncryptedInput(await contract.getAddress(), bob.address)
        .add64(bobValue)
        .encrypt();
      await contract.connect(bob).storeHandle(bobInput.handles[0], bobInput.inputProof);

      // Both should have different handles
      const aliceHandle = await contract.getBalance(alice.address);
      const bobHandle = await contract.getBalance(bob.address);

      expect(aliceHandle).to.not.equal(bobHandle);
      expect(aliceHandle).to.not.equal(0n);
      expect(bobHandle).to.not.equal(0n);
    });
  });

  describe("🧮 Symbolic Execution", function () {
    it("✅ should create new handles through operations", async function () {
      const value1 = 10n;
      const value2 = 20n;

      const input1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value1)
        .encrypt();

      const input2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value2)
        .encrypt();

      const tx = await contract
        .connect(alice)
        .demonstrateSymbolicExecution(
          input1.handles[0],
          input1.inputProof,
          input2.handles[0],
          input2.inputProof
        );

      // Should emit events for multiple handle operations
      await expect(tx).to.emit(contract, "HandleComputed").withArgs("add", await tx);
    });

    it("✅ should chain multiple operations creating multiple handles", async function () {
      const initialValue = 100;

      const tx = await contract.demonstrateHandleChaining(initialValue);

      // Multiple HandleComputed events should be emitted
      await expect(tx).to.emit(contract, "HandleComputed");
    });
  });

  describe("📊 Handle Types", function () {
    it("✅ should create handles for different types", async function () {
      const tx = await contract.demonstrateHandleTypes();

      // Should create handles for various types
      await expect(tx).to.emit(contract, "HandleCreated").withArgs("euint8", await tx);
      await expect(tx).to.emit(contract, "HandleCreated").withArgs("euint16", await tx);
      await expect(tx).to.emit(contract, "HandleCreated").withArgs("euint32", await tx);
      await expect(tx).to.emit(contract, "HandleCreated").withArgs("euint64", await tx);
      await expect(tx).to.emit(contract, "HandleCreated").withArgs("ebool", await tx);
    });
  });

  describe("🔄 Complete Lifecycle", function () {
    it("✅ should demonstrate full handle lifecycle", async function () {
      const value = 1000n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      const tx = await contract
        .connect(alice)
        .completeLifecycleDemo(input.handles[0], input.inputProof);

      // Should emit lifecycle events
      await expect(tx).to.emit(contract, "HandleLifecycleDemo").withArgs("created", await tx);
      await expect(tx).to.emit(contract, "HandleLifecycleDemo").withArgs("access_granted", await tx);
      await expect(tx).to.emit(contract, "HandleLifecycleDemo").withArgs("stored", await tx);
      await expect(tx).to.emit(contract, "HandleLifecycleDemo").withArgs("computed", await tx);
      await expect(tx).to.emit(contract, "HandleLifecycleDemo").withArgs("returned", await tx);
    });

    it("✅ should return computed handle that can be decrypted", async function () {
      const value = 500n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      const resultHandle = await contract
        .connect(alice)
        .completeLifecycleDemo.staticCall(input.handles[0], input.inputProof);

      // Execute the actual transaction to set state
      await contract.connect(alice).completeLifecycleDemo(input.handles[0], input.inputProof);

      // Result should be 2x the input (doubled)
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        resultHandle,
        await contract.getAddress(),
        alice
      );

      expect(decrypted).to.equal(value * 2n);
    });
  });

  describe("🔗 Handle Chaining", function () {
    it("✅ should chain operations creating intermediate handles", async function () {
      const initialValue = 10;

      const resultHandle = await contract.demonstrateHandleChaining.staticCall(initialValue);

      // Execute to emit events
      const tx = await contract.demonstrateHandleChaining(initialValue);

      // Should emit multiple HandleComputed events
      const receipt = await tx.wait();
      const computedEvents = receipt?.logs.filter((log: any) => {
        try {
          return contract.interface.parseLog(log as any)?.name === "HandleComputed";
        } catch {
          return false;
        }
      });

      expect(computedEvents?.length).to.be.greaterThan(1);
    });
  });

  describe("⚖️ Handle Comparisons", function () {
    it("✅ should create ebool handles from comparisons", async function () {
      const value1 = 100n;
      const value2 = 50n;

      const input1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value1)
        .encrypt();

      const input2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value2)
        .encrypt();

      const tx = await contract
        .connect(alice)
        .demonstrateHandleComparisons(
          input1.handles[0],
          input1.inputProof,
          input2.handles[0],
          input2.inputProof
        );

      // Should emit HandleComputed for each comparison
      await expect(tx).to.emit(contract, "HandleComputed").withArgs("eq", await tx);
      await expect(tx).to.emit(contract, "HandleComputed").withArgs("gt", await tx);
      await expect(tx).to.emit(contract, "HandleComputed").withArgs("lt", await tx);
    });

    it("✅ should return three different ebool handles", async function () {
      const value1 = 100n;
      const value2 = 100n; // Equal values

      const input1 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value1)
        .encrypt();

      const input2 = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value2)
        .encrypt();

      const [isEqual, isGreater, isLess] = await contract
        .connect(alice)
        .demonstrateHandleComparisons.staticCall(
          input1.handles[0],
          input1.inputProof,
          input2.handles[0],
          input2.inputProof
        );

      // All should be valid handles (non-zero)
      expect(isEqual).to.not.equal(0n);
      expect(isGreater).to.not.equal(0n);
      expect(isLess).to.not.equal(0n);

      // They should all be different handles
      expect(isEqual).to.not.equal(isGreater);
      expect(isEqual).to.not.equal(isLess);
      expect(isGreater).to.not.equal(isLess);
    });
  });

  describe("📖 Educational Test Cases", function () {
    it("demonstrates that handles are just references", async function () {
      const value = 1000n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      await contract.connect(alice).storeHandle(input.handles[0], input.inputProof);

      // Get the handle
      const handle = await contract.getBalance(alice.address);

      // The handle is just a uint256 reference
      expect(handle).to.be.a("bigint");
      expect(handle).to.not.equal(0n);

      // The handle is NOT the plaintext value
      expect(handle).to.not.equal(value);

      // Decryption reveals the actual value
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        handle,
        await contract.getAddress(),
        alice
      );
      expect(decrypted).to.equal(value);
    });

    it("demonstrates handle persistence across calls", async function () {
      const value = 750n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      await contract.connect(alice).storeHandle(input.handles[0], input.inputProof);

      // Get handle in first call
      const handle1 = await contract.getBalance(alice.address);

      // Get handle in second call (same handle should be returned)
      const handle2 = await contract.getBalance(alice.address);

      // Same handle persists
      expect(handle1).to.equal(handle2);
    });

    it("demonstrates that operations create new handles", async function () {
      const value = 100n;

      const input = await fhevm
        .createEncryptedInput(await contract.getAddress(), alice.address)
        .add64(value)
        .encrypt();

      // Get original handle
      const originalHandle = await contract
        .connect(alice)
        .createHandleFromUserInput.staticCall(input.handles[0], input.inputProof);

      // Perform lifecycle which includes computation (doubling)
      const computedHandle = await contract
        .connect(alice)
        .completeLifecycleDemo.staticCall(input.handles[0], input.inputProof);

      // Computed handle should be different
      expect(computedHandle).to.not.equal(originalHandle);
      expect(computedHandle).to.not.equal(0n);
    });
  });
});
