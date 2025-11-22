
## 🎯 **Bounty Goal**

Build a set of standalone, Hardhat-based FHEVM example repositories, each demonstrating one clear concept (e.g., access control, public decryption, user decryption), with clean tests, automated scaffolding, and self-contained documentation.

---

## 🧠 **Bounty Breakdown and Developer Approach**

### 1. **Project Structure & Simplicity**

- **Use only Hardhat** for all examples.
- **One repo per example**, no monorepo.
- Keep each repo minimal: `contracts/`, `test/`, `hardhat.config.ts`, etc.
- Use a shared `base-template` that can be cloned/scaffolded.
- Should also generate documentation like seen in https://github.com/zama-ai/fhevm/tree/main/docs/examples relates to page https://docs.zama.org/protocol/examples/

---

### 2. **Scaffolding / Automation**

- Create a CLI or script (`create-fhevm-example`) to:
    - Clone and customize the base Hardhat template - https://github.com/zama-ai/fhevm-hardhat-template.
    - Insert a specific Solidity contract into `contracts/`.
    - Generate matching tests.
    - Auto-generate  from annotations in code.

---

### 3. **Types of Examples to Include**

**(Each of these becomes a repo)**:

Examples that we already have:
- Basic:
	- simple fhe counter
    - Arithmetic (FHE.add, FHE.sub)
    - Equality comparison (FHE.eq)
 - Encryption
	 - encrypt single value
	 - encrypt multiple values
 - User decryption
	 - user decrypt single value
	 - user decrypt multiple values
- Public decryption
	- single value public decrypt
	- multi value public decrypt
	- public decryption async mechanism
 - OpenZeppelin confidential contracts
	 - ERC7984 example
	 - ERC7984 to ERC20 Wrapper
	 - Swap ERC7984 to ERC20
	 - Swap ERC7984 to ERC7984
	 - Vesting Wallet

Additional example items (include more if you feel necessary):
- 🔒 Access control:
    - What is access control
    - FHE.allow, FHE.allowTransient
- Input proof explanation
- ❌ Anti-patterns (example of what you should not do)
    - View functions with encrypted values (not allowed)
- 🧠 Understanding handles:
    - How handles are generated
    - symbolic execution
 - Advanced examples
	 - Blind Auction


---

### 5. **Maintenance Plan**

- Each time a new version of `@fhevm/solidity` is released:
    - Update base template.
    - Script updates all examples.
    - Optionally: Hardhat plugin for checking outdated `@fhevm/solidity` versions.

---

### 6. **Documentation Strategy**

- Use JSDoc/TSDoc-style comments in TS tests.
- Auto-generate markdown README per repo.
- Possibly tag key examples into docs: "chapter: access-control", "chapter: relayer", etc.


### 7. Repos to help yourself

Use the following repositories if you are searching for examples:
 - Examples and text that is already defined in: https://docs.zama.org/protocol/examples
 - https://github.com/zama-ai/fhevm-hardhat-template
 - https://github.com/zama-ai/dapps

---

## ✅ Deliverables for the Bounty

1. `base-template/` for Hardhat with `@fhevm/solidity`.
2. Script: `create-fhevm-example <example-name>`.
3. 5+ fully working example repos.
4. Documentation auto-generated per example.
5. Guide for adding new examples and updating deps.
