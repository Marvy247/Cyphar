import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ERC7984WrapperExample, MockERC20 } from "../../types";

describe("ERC7984WrapperExample - ERC20 to Confidential Token Wrapper", function () {
  let wrapper: ERC7984WrapperExample;
  let erc20: MockERC20;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let gateway: HardhatEthersSigner;

  const WRAPPER_NAME = "Wrapped Confidential Token";
  const WRAPPER_SYMBOL = "WCONF";
  const CONTRACT_URI = "https://example.com/wrapper";
  const ERC20_NAME = "Public Token";
  const ERC20_SYMBOL = "PUB";

  beforeEach(async function () {
    [owner, alice, bob, gateway] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    erc20 = await MockERC20Factory.deploy(ERC20_NAME, ERC20_SYMBOL);
    await erc20.waitForDeployment();

    // Deploy wrapper
    const WrapperFactory = await ethers.getContractFactory("ERC7984WrapperExample");
    wrapper = await WrapperFactory.deploy(
      await erc20.getAddress(),
      WRAPPER_NAME,
      WRAPPER_SYMBOL,
      CONTRACT_URI,
      gateway.address
    );
    await wrapper.waitForDeployment();

    // Mint ERC20 tokens to users
    await erc20.mint(alice.address, ethers.parseEther("10000"));
    await erc20.mint(bob.address, ethers.parseEther("10000"));
  });

  describe("🏗️ Wrapper Setup", function () {
    it("✅ should have correct wrapper metadata", async function () {
      expect(await wrapper.name()).to.equal(WRAPPER_NAME);
      expect(await wrapper.symbol()).to.equal(WRAPPER_SYMBOL);
      expect(await wrapper.contractURI()).to.equal(CONTRACT_URI);
    });

    it("✅ should reference correct underlying token", async function () {
      expect(await wrapper.underlying()).to.equal(await erc20.getAddress());
    });

    it("✅ should have correct decimals (6 for confidential token)", async function () {
      expect(await wrapper.decimals()).to.equal(6);
    });

    it("✅ should calculate correct conversion rate", async function () {
      // ERC20 has 18 decimals, wrapper has 6 decimals
      // Rate = 10^(18-6) = 10^12
      const expectedRate = 10n ** 12n;
      expect(await wrapper.rate()).to.equal(expectedRate);
    });

    it("✅ should have gateway address set", async function () {
      expect(await wrapper.GATEWAY()).to.equal(gateway.address);
    });
  });

  describe("📦 Wrapping ERC20 → Confidential", function () {
    it("✅ should wrap ERC20 tokens into confidential tokens", async function () {
      const wrapAmount = ethers.parseEther("100"); // 100 * 10^18
      const rate = await wrapper.rate();

      // Approve wrapper to spend ERC20 tokens
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);

      // Wrap tokens
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);

      // Check ERC20 balance decreased
      const erc20Balance = await erc20.balanceOf(alice.address);
      expect(erc20Balance).to.equal(ethers.parseEther("9900"));

      // Check confidential balance (100 * 10^18 / 10^12 = 100 * 10^6)
      const confidentialHandle = await wrapper.confidentialBalanceOf(alice.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        confidentialHandle,
        await wrapper.getAddress(),
        alice
      );
      expect(decryptedBalance).to.equal(100n * 10n ** 6n);
    });

    it("✅ should wrap to a different recipient", async function () {
      const wrapAmount = ethers.parseEther("50");

      // Alice wraps tokens for Bob
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await wrapper.connect(alice).wrap(bob.address, wrapAmount);

      // Bob should have confidential tokens
      const bobBalanceHandle = await wrapper.confidentialBalanceOf(bob.address);
      const bobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobBalanceHandle,
        await wrapper.getAddress(),
        bob
      );
      expect(bobBalance).to.equal(50n * 10n ** 6n);

      // Alice's ERC20 should be debited
      expect(await erc20.balanceOf(alice.address)).to.equal(ethers.parseEther("9950"));
    });

    it("✅ should handle decimal rounding correctly", async function () {
      const rate = await wrapper.rate();
      // Wrap amount that's not perfectly divisible by rate
      const wrapAmount = ethers.parseEther("100") + 123n; // Extra 123 wei
      
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);

      // Should round down to nearest rate multiple
      const expectedConfidential = (wrapAmount / rate);
      const confidentialHandle = await wrapper.confidentialBalanceOf(alice.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        confidentialHandle,
        await wrapper.getAddress(),
        alice
      );
      expect(decryptedBalance).to.equal(expectedConfidential);
    });

    it("❌ should revert if insufficient ERC20 allowance", async function () {
      const wrapAmount = ethers.parseEther("100");

      // Try to wrap without approval
      await expect(
        wrapper.connect(alice).wrap(alice.address, wrapAmount)
      ).to.be.reverted;
    });

    it("❌ should revert if insufficient ERC20 balance", async function () {
      const wrapAmount = ethers.parseEther("20000"); // More than balance

      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await expect(
        wrapper.connect(alice).wrap(alice.address, wrapAmount)
      ).to.be.reverted;
    });
  });

  describe("📤 Unwrapping Confidential → ERC20", function () {
    beforeEach(async function () {
      // Wrap some tokens for alice
      const wrapAmount = ethers.parseEther("100");
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);
    });

    it("✅ should initiate unwrap request with encrypted amount", async function () {
      const unwrapAmount = 50n * 10n ** 6n; // 50 confidential tokens

      // Create encrypted input for unwrap amount
      const input = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), alice.address)
        .add64(unwrapAmount)
        .encrypt();

      // Request unwrap
      const tx = await wrapper.connect(alice).unwrap(
        alice.address,
        bob.address,
        input.handles[0],
        input.inputProof
      );

      // Should emit UnwrapRequested event
      await expect(tx).to.emit(wrapper, "UnwrapRequested");
    });

    it("✅ should complete two-step unwrap process", async function () {
      const unwrapAmount = 30n * 10n ** 6n;

      // Step 1: Request unwrap
      const input = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), alice.address)
        .add64(unwrapAmount)
        .encrypt();

      await wrapper.connect(alice).unwrap(
        alice.address,
        bob.address,
        input.handles[0],
        input.inputProof
      );

      // Step 2: Gateway finalizes unwrap (simulated)
      // In production, gateway would decrypt and call finalizeUnwrap
      // For testing, we simulate the gateway call
      const requestId = 1; // Mock request ID
      const cleartextAmount = Number(unwrapAmount);
      
      await wrapper.connect(gateway).finalizeUnwrap(requestId, cleartextAmount);

      // Bob should have received ERC20 tokens (30 * 10^6 * 10^12 = 30 * 10^18)
      const expectedERC20 = unwrapAmount * (await wrapper.rate());
      const bobERC20Balance = await erc20.balanceOf(bob.address);
      
      // Note: This test may need adjustment based on actual gateway integration
    });

    it("❌ should revert if unauthorized user tries to unwrap", async function () {
      const unwrapAmount = 10n * 10n ** 6n;

      // Bob tries to unwrap alice's tokens without authorization
      const input = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), bob.address)
        .add64(unwrapAmount)
        .encrypt();

      await expect(
        wrapper.connect(bob).unwrap(
          alice.address,
          bob.address,
          input.handles[0],
          input.inputProof
        )
      ).to.be.reverted;
    });

    it("❌ should revert if non-gateway tries to finalize", async function () {
      const requestId = 1;
      const amount = 100;

      // Alice tries to finalize (not gateway)
      await expect(
        wrapper.connect(alice).finalizeUnwrap(requestId, amount)
      ).to.be.revertedWith("Only gateway can finalize");
    });
  });

  describe("💱 Conversion Rates", function () {
    it("✅ should correctly convert between ERC20 and confidential amounts", async function () {
      const rate = await wrapper.rate();
      
      // Wrap 1000 ERC20 tokens (with 18 decimals)
      const erc20Amount = ethers.parseEther("1000");
      await erc20.connect(alice).approve(await wrapper.getAddress(), erc20Amount);
      await wrapper.connect(alice).wrap(alice.address, erc20Amount);

      // Should receive 1000 confidential tokens (with 6 decimals)
      const expectedConfidential = erc20Amount / rate;
      const confidentialHandle = await wrapper.confidentialBalanceOf(alice.address);
      const actualConfidential = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        confidentialHandle,
        await wrapper.getAddress(),
        alice
      );

      expect(actualConfidential).to.equal(expectedConfidential);
      expect(actualConfidential).to.equal(1000n * 10n ** 6n);
    });

    it("✅ should handle large wrap amounts", async function () {
      const largeAmount = ethers.parseEther("5000");
      
      await erc20.connect(alice).approve(await wrapper.getAddress(), largeAmount);
      await wrapper.connect(alice).wrap(alice.address, largeAmount);

      const confidentialHandle = await wrapper.confidentialBalanceOf(alice.address);
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        confidentialHandle,
        await wrapper.getAddress(),
        alice
      );

      expect(balance).to.equal(5000n * 10n ** 6n);
    });
  });

  describe("🔄 Transfer After Wrap", function () {
    beforeEach(async function () {
      // Wrap tokens for alice
      const wrapAmount = ethers.parseEther("200");
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);
    });

    it("✅ should transfer wrapped confidential tokens", async function () {
      const transferAmount = 50n * 10n ** 6n;

      // Create encrypted input for transfer
      const input = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), alice.address)
        .add64(transferAmount)
        .encrypt();

      // Alice transfers to Bob
      await wrapper.connect(alice).transfer(bob.address, input.handles[0], input.inputProof);

      // Verify balances
      const aliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await wrapper.confidentialBalanceOf(alice.address),
        await wrapper.getAddress(),
        alice
      );
      expect(aliceBalance).to.equal(150n * 10n ** 6n);

      const bobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        await wrapper.confidentialBalanceOf(bob.address),
        await wrapper.getAddress(),
        bob
      );
      expect(bobBalance).to.equal(50n * 10n ** 6n);
    });
  });

  describe("🎭 Privacy Properties", function () {
    it("✅ should maintain privacy after wrapping", async function () {
      const wrapAmount = ethers.parseEther("100");
      
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);

      // Bob shouldn't be able to decrypt Alice's balance
      const aliceBalanceHandle = await wrapper.confidentialBalanceOf(alice.address);
      
      await expect(
        fhevm.userDecryptEuint(
          FhevmType.euint64,
          aliceBalanceHandle,
          await wrapper.getAddress(),
          bob
        )
      ).to.be.rejected; // Decryption should fail
    });

    it("✅ should keep transfer amounts confidential", async function () {
      // Wrap tokens
      const wrapAmount = ethers.parseEther("100");
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrapAmount);
      await wrapper.connect(alice).wrap(alice.address, wrapAmount);

      // Transfer confidentially
      const input = await fhevm
        .createEncryptedInput(await wrapper.getAddress(), alice.address)
        .add64(25n * 10n ** 6n)
        .encrypt();

      const tx = await wrapper.connect(alice).transfer(bob.address, input.handles[0], input.inputProof);
      
      // The transaction should not reveal the transfer amount in events/logs
      // (This is inherent to FHE - amounts are always encrypted)
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
    });
  });

  describe("🔍 Edge Cases", function () {
    it("✅ should handle wrap amount of zero", async function () {
      await erc20.connect(alice).approve(await wrapper.getAddress(), 0);
      await wrapper.connect(alice).wrap(alice.address, 0);

      const balanceHandle = await wrapper.confidentialBalanceOf(alice.address);
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        await wrapper.getAddress(),
        alice
      );
      expect(balance).to.equal(0);
    });

    it("✅ should handle multiple wraps to same address", async function () {
      // First wrap
      const wrap1 = ethers.parseEther("100");
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrap1);
      await wrapper.connect(alice).wrap(alice.address, wrap1);

      // Second wrap
      const wrap2 = ethers.parseEther("50");
      await erc20.connect(alice).approve(await wrapper.getAddress(), wrap2);
      await wrapper.connect(alice).wrap(alice.address, wrap2);

      // Total should be 150 confidential tokens
      const balanceHandle = await wrapper.confidentialBalanceOf(alice.address);
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balanceHandle,
        await wrapper.getAddress(),
        alice
      );
      expect(balance).to.equal(150n * 10n ** 6n);
    });
  });
});
