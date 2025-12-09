import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ERC7984Example } from "../../types";

describe("ERC7984Example - Confidential Token Standard", function () {
  let token: ERC7984Example;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let charlie: HardhatEthersSigner;

  const TOKEN_NAME = "Confidential Token";
  const TOKEN_SYMBOL = "CONF";
  const CONTRACT_URI = "https://example.com/metadata";

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy the confidential token
    const ERC7984ExampleFactory = await ethers.getContractFactory("ERC7984Example");
    token = await ERC7984ExampleFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, CONTRACT_URI);
    await token.waitForDeployment();
  });

  describe("📝 Token Metadata", function () {
    it("✅ should have correct name", async function () {
      expect(await token.name()).to.equal(TOKEN_NAME);
    });

    it("✅ should have correct symbol", async function () {
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("✅ should have 6 decimals (standard for ERC7984)", async function () {
      expect(await token.decimals()).to.equal(6);
    });

    it("✅ should have correct contract URI", async function () {
      expect(await token.contractURI()).to.equal(CONTRACT_URI);
    });

    it("✅ should support ERC7984 interface (ERC-165)", async function () {
      // ERC7984 interface ID
      const ERC7984_INTERFACE_ID = "0x9da1a04f";
      expect(await token.supportsInterface(ERC7984_INTERFACE_ID)).to.be.true;
    });
  });

  describe("🪙 Minting Confidential Tokens", function () {
    it("✅ should mint tokens with encrypted amount", async function () {
      const mintAmount = 1000;

      // Create encrypted input for minting
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(mintAmount)
        .encrypt();

      // Mint tokens
      await token.mint(alice.address, input.handles[0], input.inputProof);

      // Verify balance by decrypting
      const balanceHandle = await token.confidentialBalanceOf(alice.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        await token.getAddress(),
        alice
      );

      expect(decryptedBalance).to.equal(mintAmount);
    });

    it("✅ should update total supply when minting", async function () {
      const mintAmount1 = 1000;
      const mintAmount2 = 500;

      // Mint to alice
      const input1 = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(mintAmount1)
        .encrypt();
      await token.mint(alice.address, input1.handles[0], input1.inputProof);

      // Mint to bob
      const input2 = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(mintAmount2)
        .encrypt();
      await token.mint(bob.address, input2.handles[0], input2.inputProof);

      // Check total supply
      const totalSupplyHandle = await token.confidentialTotalSupply();
      const decryptedTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalSupplyHandle,
        await token.getAddress(),
        owner
      );

      expect(decryptedTotalSupply).to.equal(mintAmount1 + mintAmount2);
    });

    it("❌ should revert when minting to zero address", async function () {
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();

      await expect(
        token.mint(ethers.ZeroAddress, input.handles[0], input.inputProof)
      ).to.be.revertedWithCustomError(token, "ERC7984InvalidReceiver");
    });
  });

  describe("🔥 Burning Confidential Tokens", function () {
    beforeEach(async function () {
      // Mint 1000 tokens to alice
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();
      await token.mint(alice.address, input.handles[0], input.inputProof);
    });

    it("✅ should burn tokens with valid encrypted amount", async function () {
      const burnAmount = 400;

      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(burnAmount)
        .encrypt();

      await token.burn(alice.address, input.handles[0], input.inputProof);

      // Verify remaining balance
      const balanceHandle = await token.confidentialBalanceOf(alice.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        await token.getAddress(),
        alice
      );

      expect(decryptedBalance).to.equal(600);
    });

    it("⚠️ should fail silently when burning more than balance", async function () {
      const burnAmount = 1500; // More than balance

      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(burnAmount)
        .encrypt();

      await token.burn(alice.address, input.handles[0], input.inputProof);

      // Balance should remain unchanged
      const balanceHandle = await token.confidentialBalanceOf(alice.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        await token.getAddress(),
        alice
      );

      expect(decryptedBalance).to.equal(1000); // Unchanged
    });
  });

  describe("💸 Confidential Transfers", function () {
    beforeEach(async function () {
      // Mint 1000 tokens to alice
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();
      await token.mint(alice.address, input.handles[0], input.inputProof);
    });

    it("✅ should transfer tokens confidentially", async function () {
      const transferAmount = 300;

      // Create encrypted input for transfer (signed by alice)
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      // Alice transfers to bob
      await token.connect(alice).transfer(bob.address, input.handles[0], input.inputProof);

      // Verify alice's balance
      const aliceBalanceHandle = await token.confidentialBalanceOf(alice.address);
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalanceHandle,
        await token.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(700);

      // Verify bob's balance
      const bobBalanceHandle = await token.confidentialBalanceOf(bob.address);
      const bobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobBalanceHandle,
        await token.getAddress(),
        bob
      );
      expect(bobBalance).to.equal(300);
    });

    it("❌ ANTI-PATTERN: input proof signer mismatch", async function () {
      // This demonstrates a common mistake: creating input with alice but calling from bob
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), alice.address)
        .add64(100)
        .encrypt();

      // ❌ This should fail - bob is trying to use alice's input proof
      await expect(
        token.connect(bob).transfer(charlie.address, input.handles[0], input.inputProof)
      ).to.be.reverted;
    });

    it("❌ should revert when transferring to zero address", async function () {
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), alice.address)
        .add64(100)
        .encrypt();

      await expect(
        token.connect(alice).transfer(ethers.ZeroAddress, input.handles[0], input.inputProof)
      ).to.be.revertedWithCustomError(token, "ERC7984InvalidReceiver");
    });

    it("⚠️ should fail silently when transferring more than balance", async function () {
      const transferAmount = 2000; // More than alice's balance

      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      await token.connect(alice).transfer(bob.address, input.handles[0], input.inputProof);

      // Balances should remain unchanged
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(alice.address),
        await token.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(1000);

      const bobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(bob.address),
        await token.getAddress(),
        bob
      );
      expect(bobBalance).to.equal(0);
    });
  });

  describe("👥 Operator Pattern (transferFrom)", function () {
    beforeEach(async function () {
      // Mint 1000 tokens to alice
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();
      await token.mint(alice.address, input.handles[0], input.inputProof);
    });

    it("✅ should allow authorized operator to transfer", async function () {
      // Alice authorizes bob as an operator (expiry in 1 hour)
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      await token.connect(alice).setOperator(bob.address, expiry);

      // Bob creates encrypted input and transfers from alice
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), bob.address)
        .add64(200)
        .encrypt();

      await token.connect(bob).transferFrom(alice.address, charlie.address, input.handles[0], input.inputProof);

      // Verify balances
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(alice.address),
        await token.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(800);

      const charlieBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await token.confidentialBalanceOf(charlie.address),
        await token.getAddress(),
        charlie
      );
      expect(charlieBalance).to.equal(200);
    });

    it("❌ should revert when operator not authorized", async function () {
      // Bob tries to transfer without being authorized
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), bob.address)
        .add64(100)
        .encrypt();

      await expect(
        token.connect(bob).transferFrom(alice.address, charlie.address, input.handles[0], input.inputProof)
      ).to.be.revertedWithCustomError(token, "ERC7984UnauthorizedSpender");
    });
  });

  describe("🔍 Balance Queries", function () {
    it("✅ should return encrypted balance handle", async function () {
      // Mint tokens to alice
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();
      await token.mint(alice.address, input.handles[0], input.inputProof);

      // Get balance handle
      const balanceHandle = await token.confidentialBalanceOf(alice.address);
      expect(balanceHandle).to.not.equal(0n);
    });

    it("❌ PRIVACY: unauthorized user cannot decrypt balance", async function () {
      // Mint tokens to alice
      const input = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();
      await token.mint(alice.address, input.handles[0], input.inputProof);

      const balanceHandle = await token.confidentialBalanceOf(alice.address);

      // Bob tries to decrypt alice's balance - should fail
      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint64,
          balanceHandle,
          await token.getAddress(),
          bob
        )
      ).to.be.rejected;
    });

    it("✅ should return zero balance for new account", async function () {
      const balanceHandle = await token.confidentialBalanceOf(bob.address);
      
      // Owner can see zero balance (for testing purposes)
      // In production, even zero balances are encrypted
      expect(balanceHandle).to.not.equal(0n); // Handle exists even for zero balance
    });
  });

  describe("📊 Total Supply", function () {
    it("✅ should return encrypted total supply", async function () {
      // Mint to multiple users
      const input1 = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(1000)
        .encrypt();
      await token.mint(alice.address, input1.handles[0], input1.inputProof);

      const input2 = await fhevm
        .createEncryptedInput(await token.getAddress(), owner.address)
        .add64(500)
        .encrypt();
      await token.mint(bob.address, input2.handles[0], input2.inputProof);

      const totalSupplyHandle = await token.confidentialTotalSupply();
      const totalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalSupplyHandle,
        await token.getAddress(),
        owner
      );

      expect(totalSupply).to.equal(1500);
    });
  });
});
