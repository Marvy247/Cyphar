#!/usr/bin/env ts-node

/**
 * generate-docs - Generates GitBook-formatted documentation from contracts and tests
 *
 * Usage: ts-node scripts/generate-docs.ts <example-name> [options]
 *
 * Example: ts-node scripts/generate-docs.ts fhe-counter --output docs/
 */

import * as fs from 'fs';
import * as path from 'path';

// Color codes for terminal output
enum Color {
  Reset = '\x1b[0m',
  Green = '\x1b[32m',
  Blue = '\x1b[34m',
  Yellow = '\x1b[33m',
  Red = '\x1b[31m',
  Cyan = '\x1b[36m',
}

function log(message: string, color: Color = Color.Reset): void {
  console.log(`${color}${message}${Color.Reset}`);
}

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

// Documentation configuration interface
interface DocsConfig {
  title: string;
  description: string;
  contract: string;
  test: string;
  output: string;
  category: string;
}

// Generate documentation options
interface GenerateDocsOptions {
  noSummary?: boolean;
}

// Example configurations
const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  'fhe-counter': {
    title: 'FHE Counter',
    description: 'This example demonstrates how to build a confidential counter using FHEVM, in comparison to a simple counter.',
    contract: 'contracts/basic/FHECounter.sol',
    test: 'test/basic/FHECounter.ts',
    output: 'docs/fhe-counter.md',
    category: 'Basic',
  },
  'encrypt-single-value': {
    title: 'Encrypt Single Value',
    description: 'This example demonstrates the FHE encryption mechanism and highlights a common pitfall developers may encounter.',
    contract: 'contracts/basic/encrypt/EncryptSingleValue.sol',
    test: 'test/basic/encrypt/EncryptSingleValue.ts',
    output: 'docs/fhe-encrypt-single-value.md',
    category: 'Basic - Encryption',
  },
  'encrypt-multiple-values': {
    title: 'Encrypt Multiple Values',
    description: 'This example shows how to encrypt and handle multiple values in a single transaction.',
    contract: 'contracts/basic/encrypt/EncryptMultipleValues.sol',
    test: 'test/basic/encrypt/EncryptMultipleValues.ts',
    output: 'docs/fhe-encrypt-multiple-values.md',
    category: 'Basic - Encryption',
  },
  'user-decrypt-single-value': {
    title: 'User Decrypt Single Value',
    description: 'This example demonstrates the FHE user decryption mechanism and highlights common pitfalls developers may encounter.',
    contract: 'contracts/basic/decrypt/UserDecryptSingleValue.sol',
    test: 'test/basic/decrypt/UserDecryptSingleValue.ts',
    output: 'docs/fhe-user-decrypt-single-value.md',
    category: 'Basic - Decryption',
  },
  'user-decrypt-multiple-values': {
    title: 'User Decrypt Multiple Values',
    description: 'This example shows how to decrypt multiple encrypted values for a user.',
    contract: 'contracts/basic/decrypt/UserDecryptMultipleValues.sol',
    test: 'test/basic/decrypt/UserDecryptMultipleValues.ts',
    output: 'docs/fhe-user-decrypt-multiple-values.md',
    category: 'Basic - Decryption',
  },
  'fhe-add': {
    title: 'FHE Add Operation',
    description: 'This example demonstrates how to perform addition operations on encrypted values.',
    contract: 'contracts/basic/fhe-operations/FHEAdd.sol',
    test: 'test/basic/fhe-operations/FHEAdd.ts',
    output: 'docs/fheadd.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-if-then-else': {
    title: 'FHE If-Then-Else',
    description: 'This example shows conditional operations on encrypted values using FHE.',
    contract: 'contracts/basic/fhe-operations/FHEIfThenElse.sol',
    test: 'test/basic/fhe-operations/FHEIfThenElse.ts',
    output: 'docs/fheifthenelse.md',
    category: 'Basic - FHE Operations',
  },
  // Additional Required Examples
  'access-control': {
    title: 'Access Control in FHEVM',
    description: 'This example demonstrates FHE access control mechanisms including FHE.allow(), FHE.allowTransient(), and permission management patterns.',
    contract: 'contracts/basic/AccessControlExample.sol',
    test: 'test/basic/AccessControlExample.ts',
    output: 'docs/access-control.md',
    category: 'Advanced - Access Control',
  },
  'input-proof': {
    title: 'Understanding Input Proofs',
    description: 'This example provides a comprehensive guide to input proofs - what they are, why they are needed, and how to use them correctly.',
    contract: 'contracts/basic/InputProofExample.sol',
    test: 'test/basic/InputProofExample.ts',
    output: 'docs/input-proof.md',
    category: 'Advanced - Security',
  },
  'handles': {
    title: 'Understanding Encrypted Handles',
    description: 'This example explains encrypted value handles in depth - how they are generated, their lifecycle, symbolic execution, and different handle types.',
    contract: 'contracts/basic/HandlesExample.sol',
    test: 'test/basic/HandlesExample.ts',
    output: 'docs/handles.md',
    category: 'Advanced - Core Concepts',
  },
  // OpenZeppelin Confidential Contracts Examples
  'erc7984-example': {
    title: 'ERC7984 Confidential Token',
    description: 'This example demonstrates the ERC7984 standard for confidential tokens with encrypted balances, transfers, and operator patterns.',
    contract: 'contracts/openzeppelin/ERC7984Example.sol',
    test: 'test/openzeppelin/ERC7984Example.ts',
    output: 'docs/erc7984-example.md',
    category: 'OpenZeppelin - Tokens',
  },
  'erc7984-wrapper': {
    title: 'ERC7984 Wrapper (ERC20 ↔ Confidential)',
    description: 'This example shows how to wrap standard ERC20 tokens into confidential ERC7984 tokens and unwrap them using a gateway.',
    contract: 'contracts/openzeppelin/ERC7984WrapperExample.sol',
    test: 'test/openzeppelin/ERC7984WrapperExample.ts',
    output: 'docs/erc7984-wrapper.md',
    category: 'OpenZeppelin - Tokens',
  },
  'vesting-wallet-confidential': {
    title: 'Confidential Vesting Wallet',
    description: 'This example demonstrates time-locked confidential token vesting with cliff periods and linear release schedules.',
    contract: 'contracts/openzeppelin/VestingWalletConfidentialExample.sol',
    test: 'test/openzeppelin/VestingWalletConfidentialExample.ts',
    output: 'docs/vesting-wallet-confidential.md',
    category: 'OpenZeppelin - Finance',
  },
  'confidential-swap': {
    title: 'Confidential Token Swap (AMM)',
    description: 'This example shows a privacy-preserving automated market maker for swapping confidential tokens without revealing trade sizes.',
    contract: 'contracts/openzeppelin/ConfidentialSwapExample.sol',
    test: 'test/openzeppelin/ConfidentialSwapExample.ts',
    output: 'docs/confidential-swap.md',
    category: 'OpenZeppelin - DeFi',
  }
};

function readFile(filePath: string): string {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

function getContractName(content: string): string {
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : 'Contract';
}

function extractDescription(content: string): string {
  // Extract description from first multi-line comment or @notice
  const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
  const noticeMatch = content.match(/@notice\s+(.+)/);

  return commentMatch ? commentMatch[1] : (noticeMatch ? noticeMatch[1] : '');
}

function generateGitBookMarkdown(config: DocsConfig, contractContent: string, testContent: string): string {
  const contractName = getContractName(contractContent);
  const description = config.description || extractDescription(contractContent);

  let markdown = `${description}\n\n`;

  // Add hint block
  markdown += `{% hint style="info" %}\n`;
  markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
  markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
  markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
  markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
  markdown += `{% endhint %}\n\n`;

  // Add tabs for contract and test
  markdown += `{% tabs %}\n\n`;

  // Contract tab
  markdown += `{% tab title="${contractName}.sol" %}\n\n`;
  markdown += `\`\`\`solidity\n`;
  markdown += contractContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  // Test tab
  const testFileName = path.basename(config.test);
  markdown += `{% tab title="${testFileName}" %}\n\n`;
  markdown += `\`\`\`typescript\n`;
  markdown += testContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  markdown += `{% endtabs %}\n`;

  return markdown;
}

function updateSummary(exampleName: string, config: DocsConfig): void {
  const summaryPath = path.join(process.cwd(), 'docs', 'SUMMARY.md');

  if (!fs.existsSync(summaryPath)) {
    log('Creating new SUMMARY.md', Color.Yellow);
    const summary = `## Basic\n\n`;
    fs.writeFileSync(summaryPath, summary);
  }

  const summary = fs.readFileSync(summaryPath, 'utf-8');
  const outputFileName = path.basename(config.output);
  const linkText = config.title;
  const link = `- [${linkText}](${outputFileName})`;

  // Check if already in summary
  if (summary.includes(outputFileName)) {
    info('Example already in SUMMARY.md');
    return;
  }

  // Add to appropriate category
  const categoryHeader = `## ${config.category}`;
  let updatedSummary: string;

  if (summary.includes(categoryHeader)) {
    // Add under existing category
    const lines = summary.split('\n');
    const categoryIndex = lines.findIndex(line => line.trim() === categoryHeader);

    // Find next category or end
    let insertIndex = categoryIndex + 1;
    while (insertIndex < lines.length && !lines[insertIndex].startsWith('##')) {
      if (lines[insertIndex].trim() === '') {
        break;
      }
      insertIndex++;
    }

    lines.splice(insertIndex, 0, link);
    updatedSummary = lines.join('\n');
  } else {
    // Add new category
    updatedSummary = summary.trim() + `\n\n${categoryHeader}\n\n${link}\n`;
  }

  fs.writeFileSync(summaryPath, updatedSummary);
  success('Updated SUMMARY.md');
}

function generateDocs(exampleName: string, options: GenerateDocsOptions = {}): void {
  const config = EXAMPLES_CONFIG[exampleName];

  if (!config) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(EXAMPLES_CONFIG).map(k => `  - ${k}`).join('\n')}`);
  }

  info(`Generating documentation for: ${config.title}`);

  // Read contract and test files
  const contractContent = readFile(config.contract);
  const testContent = readFile(config.test);

  // Generate GitBook markdown
  const markdown = generateGitBookMarkdown(config, contractContent, testContent);

  // Write output file
  const outputPath = path.join(process.cwd(), config.output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown);
  success(`Documentation generated: ${config.output}`);

  // Update SUMMARY.md
  if (!options.noSummary) {
    updateSummary(exampleName, config);
  }

  log('\n' + '='.repeat(60), Color.Green);
  success(`Documentation for "${config.title}" generated successfully!`);
  log('='.repeat(60), Color.Green);
}

function generateAllDocs(): void {
  info('Generating documentation for all examples...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    try {
      generateDocs(exampleName, { noSummary: true });
      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`Failed to generate docs for ${exampleName}: ${errorMessage}`, Color.Red);
      errorCount++;
    }
  }

  // Update summary once at the end
  info('\nUpdating SUMMARY.md...');
  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    const config = EXAMPLES_CONFIG[exampleName];
    updateSummary(exampleName, config);
  }

  log('\n' + '='.repeat(60), Color.Green);
  success(`Generated ${successCount} documentation files`);
  if (errorCount > 0) {
    log(`Failed: ${errorCount}`, Color.Red);
  }
  log('='.repeat(60), Color.Green);
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('FHEVM Documentation Generator', Color.Cyan);
    log('\nUsage: ts-node scripts/generate-docs.ts <example-name> | --all\n');
    log('Available examples:', Color.Yellow);
    Object.entries(EXAMPLES_CONFIG).forEach(([name, config]) => {
      log(`  ${name}`, Color.Green);
      log(`    ${config.title} - ${config.category}`, Color.Reset);
    });
    log('\nOptions:', Color.Yellow);
    log('  --all    Generate documentation for all examples');
    log('\nExamples:', Color.Yellow);
    log('  ts-node scripts/generate-docs.ts fhe-counter');
    log('  ts-node scripts/generate-docs.ts --all\n');
    process.exit(0);
  }

  if (args[0] === '--all') {
    generateAllDocs();
  } else {
    generateDocs(args[0]);
  }
}

main();
