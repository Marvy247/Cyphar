# Cyphar

<div align="center">

**Production-Grade FHEVM Example Hub with Intelligent Automation**

[![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue.svg)](LICENSE)
[![FHEVM](https://img.shields.io/badge/FHEVM-v0.9.1-purple.svg)](https://github.com/zama-ai/fhevm)
[![Examples](https://img.shields.io/badge/examples-16-green.svg)](#available-examples)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

*A comprehensive system for creating standalone FHEVM example repositories with automated documentation generation and intelligent tooling*

[Features](#-features) • [Quick Start](#-quick-start) • [Examples](#-available-examples) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 📊 Project Overview

```mermaid
graph TB
    A[Cyphar System] --> B[16 Production Examples]
    A --> C[Intelligent Automation]
    A --> D[Auto Documentation]
    
    B --> B1[Basic FHE Operations]
    B --> B2[Core Concepts]
    B --> B3[OpenZeppelin Suite]
    B --> B4[DeFi Primitives]
    
    C --> C1[Standalone Repo Generator]
    C --> C2[Category Projects]
    C --> C3[Smart Configuration]
    
    D --> D1[GitBook Compatible]
    D --> D2[Code Annotations]
    D --> D3[Test Examples]
    
    style A fill:#7C3AED,stroke:#5B21B6,color:#fff
    style B fill:#06B6D4,stroke:#0891B2,color:#fff
    style C fill:#10B981,stroke:#059669,color:#fff
    style D fill:#F59E0B,stroke:#D97706,color:#fff
```

## 🎯 What Makes Cyphar Special

Cyphar isn't just another example repository. It's a **production-grade automation system** designed to:

- ⚡ **Generate standalone repos** in seconds with one command
- 🏗️ **Intelligent scaffolding** that understands contract structure
- 📚 **Auto-generate documentation** from code annotations
- 🔧 **Production-ready** OpenZeppelin confidential contracts
- 🎓 **Educational focus** with anti-patterns and best practices
- 🚀 **Future-proof** architecture for easy maintenance

---

## 🌟 Features

### 🤖 Intelligent Automation

```mermaid
flowchart LR
    A[Select Example] --> B[Run Command]
    B --> C{cyphar create}
    C --> D[Clone Template]
    D --> E[Copy Contract]
    E --> F[Generate Tests]
    F --> G[Create Deployment]
    G --> H[Generate README]
    H --> I[Configure Package]
    I --> J[✅ Standalone Repo]
    
    style A fill:#E0E7FF
    style J fill:#10B981,color:#fff
    style C fill:#7C3AED,color:#fff
```

### 📦 Category-Based Projects

Generate multi-contract repositories by category:

```mermaid
graph TD
    A[cyphar category openzeppelin] --> B[OpenZeppelin Suite]
    B --> C[ERC7984 Token]
    B --> D[Wrapper Contract]
    B --> E[Vesting Wallet]
    B --> F[DEX/AMM Swap]
    
    G[cyphar category basic] --> H[Basic Examples]
    H --> I[Encryption]
    H --> J[Decryption]
    H --> K[FHE Operations]
    
    style A fill:#7C3AED,color:#fff
    style G fill:#7C3AED,color:#fff
```

### 📖 Auto Documentation

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Cyphar as Cyphar System
    participant Contract as Smart Contract
    participant Docs as Documentation
    
    Dev->>Cyphar: Run generate-docs
    Cyphar->>Contract: Extract NatSpec comments
    Cyphar->>Contract: Extract code examples
    Contract-->>Cyphar: Return annotations
    Cyphar->>Docs: Generate markdown
    Cyphar->>Docs: Add code snippets
    Cyphar->>Docs: Format for GitBook
    Docs-->>Dev: Complete documentation
    
    Note over Cyphar,Docs: Automatic sync with code
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- npm >= 7.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/[username]/cyphar.git
cd cyphar

# Install dependencies
npm install
```

### Generate Your First Example

```bash
# Create a standalone ERC7984 confidential token example
npm run create-example erc7984-example ./my-confidential-token

# Navigate to the generated project
cd my-confidential-token

# Install and run
npm install
npm run compile
npm run test
```

### Generate a Category Project

```bash
# Generate all OpenZeppelin examples in one project
npm run create-category openzeppelin ./oz-examples

cd oz-examples
npm install
npm test
```

### Generate Documentation

```bash
# Generate docs for a specific example
npm run generate-docs access-control

# Generate docs for all examples
npm run generate-all-docs
```

---

## 📚 Available Examples

### 🔰 Basic Examples (7)

Foundation FHE operations and patterns:

```mermaid
mindmap
  root((Basic Examples))
    FHE Counter
      Encrypted state
      Basic operations
    Encryption
      Single value
      Multiple values
    Decryption
      User decrypt
      Public decrypt
    FHE Operations
      Addition
      Conditionals
```

| Example | Description |
|---------|-------------|
| `fhe-counter` | Simple encrypted counter with basic FHE operations |
| `encrypt-single-value` | Encryption mechanism and common pitfalls |
| `encrypt-multiple-values` | Handling multiple encrypted values |
| `user-decrypt-single-value` | User decryption with permissions |
| `user-decrypt-multiple-values` | Decrypting multiple values |
| `fhe-add` | FHE addition operations |
| `fhe-if-then-else` | Conditional operations on encrypted values |

### 🎓 Core Concepts (3)

**NEW:** Comprehensive educational examples:

```mermaid
graph LR
    A[Core Concepts] --> B[Access Control]
    A --> C[Input Proofs]
    A --> D[Handles]
    
    B --> B1[FHE.allow]
    B --> B2[FHE.allowTransient]
    B --> B3[FHE.allowThis]
    
    C --> C1[What are they?]
    C --> C2[Why needed?]
    C --> C3[How to use]
    
    D --> D1[Generation]
    D --> D2[Lifecycle]
    D --> D3[Symbolic Execution]
    
    style A fill:#7C3AED,color:#fff
    style B fill:#06B6D4,color:#fff
    style C fill:#10B981,color:#fff
    style D fill:#F59E0B,color:#fff
```

| Example | Description |
|---------|-------------|
| `access-control` | FHE access control patterns (allow, allowTransient, allowThis) |
| `input-proof` | Complete guide to input proofs and their security role |
| `handles` | Understanding encrypted handles and symbolic execution |

### 🏆 OpenZeppelin Suite (4)

Production-ready confidential contracts:

```mermaid
graph TD
    A[OpenZeppelin Suite] --> B[ERC7984 Token]
    A --> C[Token Wrapper]
    A --> D[Vesting Wallet]
    A --> E[DEX/AMM]
    
    B --> B1[Encrypted Balances]
    B --> B2[Confidential Transfers]
    B --> B3[Operator Pattern]
    
    C --> C1[ERC20 → Confidential]
    C --> C2[Gateway Unwrap]
    C --> C3[Decimal Handling]
    
    D --> D1[Time-locked Vesting]
    D --> D2[Cliff Period]
    D --> D3[Linear Release]
    
    E --> E1[Constant Product AMM]
    E --> E2[MEV Protection]
    E --> E3[Private Liquidity]
    
    style A fill:#7C3AED,color:#fff
    style B fill:#06B6D4,color:#fff
    style C fill:#10B981,color:#fff
    style D fill:#F59E0B,color:#fff
    style E fill:#EC4899,color:#fff
```

| Example | Description |
|---------|-------------|
| `erc7984-example` | ERC7984 confidential token standard implementation |
| `erc7984-wrapper` | Wrap/unwrap ERC20 ↔ ERC7984 with gateway decryption |
| `vesting-wallet-confidential` | Time-locked token vesting with cliff and factory |
| `confidential-swap` | Privacy-preserving AMM for confidential token swaps |

### 🎯 Advanced Examples (2)

| Example | Description |
|---------|-------------|
| `blind-auction` | Sealed-bid auction with confidential bids |
| `confidential-dutch-auction` | Dutch auction with encrypted price discovery |

---

## 🏗️ Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Input Layer"
        A[User Command]
        B[Example Name]
        C[Output Directory]
    end
    
    subgraph "Cyphar Core"
        D[CLI Handler]
        E[Configuration Manager]
        F[Template Engine]
        G[Contract Processor]
        H[Test Generator]
        I[Doc Generator]
    end
    
    subgraph "Base Template"
        J[Hardhat Config]
        K[Package.json]
        L[Deploy Scripts]
        M[Test Setup]
    end
    
    subgraph "Output Layer"
        N[Standalone Repository]
        O[Working Tests]
        P[Deployment Ready]
        Q[Documentation]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    F --> J
    F --> K
    F --> L
    F --> M
    E --> G
    E --> H
    E --> I
    G --> N
    H --> O
    I --> Q
    J --> P
    
    style D fill:#7C3AED,color:#fff
    style N fill:#10B981,color:#fff
```

### Automation Workflow

```mermaid
stateDiagram-v2
    [*] --> SelectExample
    SelectExample --> ValidateInput
    ValidateInput --> CloneTemplate
    CloneTemplate --> CopyContract
    CopyContract --> CopyTests
    CopyTests --> GenerateDeployment
    GenerateDeployment --> UpdatePackageJson
    UpdatePackageJson --> GenerateREADME
    GenerateREADME --> ConfigureTasks
    ConfigureTasks --> CleanupFiles
    CleanupFiles --> [*]
    
    ValidateInput --> Error: Invalid Example
    Error --> [*]
```

### Data Flow

```mermaid
flowchart TD
    subgraph "Source Code"
        A[Contracts/]
        B[Tests/]
        C[Scripts/]
    end
    
    subgraph "Configuration"
        D[EXAMPLES_MAP]
        E[Category Configs]
        F[Doc Templates]
    end
    
    subgraph "Processing Engine"
        G[File Parser]
        H[Template Renderer]
        I[Config Generator]
    end
    
    subgraph "Output"
        J[Generated Repo]
        K[Documentation]
        L[Test Suite]
    end
    
    A --> G
    B --> G
    D --> H
    E --> H
    F --> I
    G --> H
    H --> J
    H --> K
    G --> L
    
    style G fill:#7C3AED,color:#fff
    style H fill:#06B6D4,color:#fff
    style J fill:#10B981,color:#fff
```

---

## 📖 Project Structure

```
cyphar/
├── 📁 fhevm-hardhat-template/    # Base Hardhat template
│   ├── contracts/                 # Template contracts
│   ├── test/                      # Template tests
│   ├── deploy/                    # Deployment scripts
│   └── hardhat.config.ts          # Hardhat configuration
│
├── 📁 contracts/                  # All example contracts
│   ├── basic/                     # Basic FHE operations
│   │   ├── FHECounter.sol
│   │   ├── AccessControlExample.sol
│   │   ├── InputProofExample.sol
│   │   ├── HandlesExample.sol
│   │   ├── encrypt/               # Encryption examples
│   │   ├── decrypt/               # Decryption examples
│   │   └── fhe-operations/        # FHE operators
│   │
│   ├── openzeppelin/              # OpenZeppelin suite
│   │   ├── ERC7984Example.sol
│   │   ├── ERC7984WrapperExample.sol
│   │   ├── VestingWalletConfidentialExample.sol
│   │   └── ConfidentialSwapExample.sol
│   │
│   └── auctions/                  # Auction examples
│
├── 📁 test/                       # All test files (mirrors contracts/)
│   ├── basic/
│   ├── openzeppelin/
│   └── auctions/
│
├── 📁 scripts/                    # Automation tools
│   ├── create-fhevm-example.ts    # Standalone repo generator
│   ├── create-fhevm-category.ts   # Category project generator
│   └── generate-docs.ts           # Documentation generator
│
├── 📁 docs/                       # Generated documentation
│   ├── SUMMARY.md                 # GitBook index
│   └── *.md                       # Individual example docs
│
└── 📁 openzeppelin-confidential-contracts/  # OZ reference
```

---

## 🔧 Configuration

### Example Configuration

All examples are defined in `scripts/create-fhevm-example.ts`:

```typescript
const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  'erc7984-example': {
    contract: 'contracts/openzeppelin/ERC7984Example.sol',
    test: 'test/openzeppelin/ERC7984Example.ts',
    description: 'ERC7984 confidential token standard implementation',
  },
  // ... 15 more examples
};
```

### Category Configuration

Categories are defined in `scripts/create-fhevm-category.ts`:

```typescript
const CATEGORIES: Record<string, CategoryConfig> = {
  openzeppelin: {
    name: 'OpenZeppelin Confidential Contracts',
    description: 'Production-grade confidential token implementations',
    contracts: [
      { path: 'contracts/openzeppelin/ERC7984Example.sol', ... },
      { path: 'contracts/openzeppelin/ERC7984WrapperExample.sol', ... },
      // ... more contracts
    ],
  },
};
```

---

## 💻 Usage Examples

### Basic Usage

```bash
# Generate single example
npm run create-example access-control ./my-access-control-example

# Generate category project
npm run create-category basic ./basic-examples

# Generate documentation
npm run generate-docs access-control
```

### Advanced Usage

```bash
# Create multiple examples at once
for example in access-control input-proof handles; do
  npm run create-example $example ./examples/$example
done

# Generate all documentation
npm run generate-all-docs

# Test an example before generation
cd fhevm-hardhat-template
cp ../contracts/basic/AccessControlExample.sol contracts/
cp ../test/basic/AccessControlExample.ts test/
npm test
```

---

## 🧪 Testing

### Test Coverage

```mermaid
pie title Test Coverage by Category
    "Basic Examples" : 35
    "OpenZeppelin Suite" : 30
    "Core Concepts" : 25
    "Advanced Examples" : 10
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test test/basic/AccessControlExample.ts

# Run with coverage
npm run coverage
```

### Test Structure

Each test file includes:
- ✅ **Success cases** - Correct usage patterns
- ❌ **Failure cases** - Common mistakes and edge cases
- 🎭 **Privacy tests** - Verify encryption/decryption
- 📖 **Educational examples** - Learning through tests

---

## 📚 Documentation

### Auto-Generation

```mermaid
graph LR
    A[Contract Code] --> D[Doc Generator]
    B[Test Code] --> D
    C[Annotations] --> D
    D --> E[Markdown]
    E --> F[GitBook]
    
    style D fill:#7C3AED,color:#fff
    style F fill:#10B981,color:#fff
```

### Documentation Features

- 📝 **Auto-generated** from code comments
- 🏷️ **Categorized** by topic
- 💡 **Code examples** with syntax highlighting
- ⚠️ **Anti-patterns** clearly marked
- 🔗 **Cross-referenced** between examples

---

## 🛠️ Maintenance

### Updating All Examples

```mermaid
flowchart TD
    A[New FHEVM Version Released] --> B[Update Base Template]
    B --> C[Update Dependencies]
    C --> D[Test Base Template]
    D --> E{Tests Pass?}
    E -->|Yes| F[Regenerate Examples]
    E -->|No| G[Fix Issues]
    G --> D
    F --> H[Update Documentation]
    H --> I[Commit Changes]
    
    style A fill:#EF4444,color:#fff
    style F fill:#10B981,color:#fff
    style I fill:#10B981,color:#fff
```

### Adding New Examples

1. **Create Contract**: Add to `contracts/` directory
2. **Create Tests**: Add to `test/` directory
3. **Update Config**: Add entry to `EXAMPLES_MAP`
4. **Generate Docs**: Run `generate-docs.ts`
5. **Test Generation**: Run `create-fhevm-example.ts`

---

## 🎓 Learning Path

```mermaid
graph TB
    A[Start Here] --> B[Basic Examples]
    B --> C[Core Concepts]
    C --> D[OpenZeppelin Suite]
    D --> E[Advanced Examples]
    
    B --> B1[FHE Counter]
    B --> B2[Encryption]
    B --> B3[Decryption]
    
    C --> C1[Access Control]
    C --> C2[Input Proofs]
    C --> C3[Handles]
    
    D --> D1[ERC7984 Token]
    D --> D2[Token Wrapper]
    D --> D3[Vesting]
    D --> D4[DEX]
    
    E --> E1[Blind Auction]
    E --> E2[Dutch Auction]
    
    style A fill:#7C3AED,color:#fff
    style B fill:#06B6D4,color:#fff
    style C fill:#10B981,color:#fff
    style D fill:#F59E0B,color:#fff
    style E fill:#EC4899,color:#fff
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Add your example to the appropriate directory
4. Update `EXAMPLES_MAP` configuration
5. Generate documentation
6. Test standalone repo generation
7. Commit your changes (`git commit -m 'Add AmazingFeature'`)
8. Push to the branch (`git push origin feature/AmazingFeature`)
9. Open a Pull Request

---

## 📊 Statistics

```mermaid
graph LR
    A[Cyphar] --> B[16 Examples]
    A --> C[3 Automation Scripts]
    A --> D[200+ Tests]
    A --> E[8,500+ Lines of Code]
    
    B --> B1[7 Basic]
    B --> B2[3 Core Concepts]
    B --> B3[4 OpenZeppelin]
    B --> B4[2 Advanced]
    
    style A fill:#7C3AED,color:#fff
```

| Metric | Count |
|--------|-------|
| Total Examples | 16 |
| Test Cases | 200+ |
| Lines of Code | 8,500+ |
| Automation Scripts | 3 |
| Documentation Pages | 16+ |
| Categories | 4 |

---

## 🔗 Resources

- **FHEVM Documentation**: https://docs.zama.ai/fhevm
- **Protocol Examples**: https://docs.zama.org/protocol/examples
- **Base Template**: https://github.com/zama-ai/fhevm-hardhat-template
- **OpenZeppelin Confidential**: https://github.com/OpenZeppelin/openzeppelin-confidential-contracts
- **Zama Community**: https://discord.com/invite/zama

---

## 📜 License

This project is licensed under the BSD-3-Clause-Clear License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Zama Team** for FHEVM and the bounty program
- **OpenZeppelin** for confidential contracts library
- **Community Contributors** for feedback and examples

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/[username]/cyphar/issues)
- **Discussions**: [GitHub Discussions](https://github.com/[username]/cyphar/discussions)
- **Discord**: [Zama Discord](https://discord.com/invite/zama)

---

<div align="center">

**Built with ❤️ for the FHEVM Community**

⭐ Star this repo if Cyphar helps your FHEVM development!

[Get Started](#-quick-start) • [View Examples](#-available-examples) • [Read Docs](#-documentation)

</div>
