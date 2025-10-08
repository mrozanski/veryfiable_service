#!/usr/bin/env node

/**
 * EAS Schema Registration Script
 * 
 * This script registers the Public Review schema on the Ethereum Attestation Service (EAS)
 * for the Base Sepolia testnet.
 * 
 * Schema: "string platformId,string itemId,string reviewText,uint8 rating"
 * Purpose: Universal schema for verified public reviews on any platform
 * 
 * Usage: npm run register-schema
 */

const { ethers } = require('ethers');
const { SchemaRegistry } = require('@ethereum-attestation-service/eas-sdk');
require('dotenv').config();

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Log messages with colors
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ERROR: ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Validate environment variables
 * @returns {Object} Configuration object if valid
 * @throws {Error} If any required variable is missing or invalid
 */
function validateEnvironment() {
  logInfo('Validating environment variables...');
  
  const requiredVars = [
    'RPC_URL',
    'PRIVATE_KEY',
    'SCHEMA_REGISTRY_ADDRESS'
  ];

  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please ensure your .env file includes all required variables.\n' +
      'See README.md for setup instructions.'
    );
  }

  // Validate private key format
  const privateKey = process.env.PRIVATE_KEY;
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error(
      'Invalid PRIVATE_KEY format. Must be a 64-character hexadecimal string (with or without 0x prefix).'
    );
  }

  // Validate schema registry address format
  const registryAddress = process.env.SCHEMA_REGISTRY_ADDRESS;
  if (!/^0x[0-9a-fA-F]{40}$/.test(registryAddress)) {
    throw new Error(
      'Invalid SCHEMA_REGISTRY_ADDRESS format. Must be a valid Ethereum address.'
    );
  }

  logSuccess('Environment variables validated successfully');

  return {
    rpcUrl: process.env.RPC_URL,
    privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
    schemaRegistryAddress: registryAddress,
  };
}

/**
 * Connect to Base Sepolia network
 * @param {Object} config - Configuration object
 * @returns {Object} Provider and signer
 */
async function connectToNetwork(config) {
  logInfo('Connecting to Base Sepolia network...');
  
  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Test connection by fetching network information
    const network = await provider.getNetwork();
    logSuccess(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Create wallet/signer
    const signer = new ethers.Wallet(config.privateKey, provider);
    const address = await signer.getAddress();
    logInfo(`Wallet address: ${address}`);
    
    // Check wallet balance
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    logInfo(`Wallet balance: ${balanceInEth} ETH`);
    
    if (balance === 0n) {
      logWarning(
        'Wallet has zero balance. You will need testnet ETH to register the schema.\n' +
        'Get Base Sepolia testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet'
      );
    }
    
    return { provider, signer };
  } catch (error) {
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      throw new Error(
        `Network connection failed: ${error.message}\n` +
        'Please check your RPC_URL and internet connection.'
      );
    }
    throw error;
  }
}

/**
 * Register the Public Review schema
 * @param {Object} signer - Ethers signer
 * @param {string} schemaRegistryAddress - Schema registry contract address
 * @returns {string} Schema UID
 */
async function registerSchema(signer, schemaRegistryAddress) {
  logInfo('Initializing Schema Registry...');
  
  // Initialize SchemaRegistry
  const schemaRegistry = new SchemaRegistry(schemaRegistryAddress);
  schemaRegistry.connect(signer);
  
  // Define the schema
  const schema = 'string platformId,string itemId,string reviewText,uint8 rating';
  const resolverAddress = '0x0000000000000000000000000000000000000000'; // No resolver
  const revocable = true;
  
  logInfo('Schema Details:');
  log(`  Schema: ${schema}`, colors.blue);
  log(`  Resolver: ${resolverAddress}`, colors.blue);
  log(`  Revocable: ${revocable}`, colors.blue);
  log('');
  
  logInfo('Registering schema on Base Sepolia...');
  logWarning('This will require a transaction and gas fees.');
  
  try {
    // Register the schema
    const transaction = await schemaRegistry.register({
      schema,
      resolverAddress,
      revocable,
    });
    
    // Check if transaction is a string (schema UID directly)
    if (typeof transaction === 'string') {
      const schemaUID = transaction;
      logSuccess('Schema registered successfully!');
      log('');
      log('═══════════════════════════════════════════════════════════', colors.green);
      log(`Schema UID: ${schemaUID}`, colors.green);
      log('═══════════════════════════════════════════════════════════', colors.green);
      log('');
      logInfo('Next Steps:');
      log('  1. Copy the Schema UID above');
      log('  2. Add it to your .env file as PUBLIC_REVIEW_SCHEMA_UID');
      log('  3. Use this UID when creating attestations');
      log('');
      return schemaUID;
    }
    
    // Otherwise, it's a transaction that needs to be waited on
    logInfo(`Transaction hash: ${transaction.hash}`);
    logInfo('Waiting for transaction confirmation...');
    
    const receipt = await transaction.wait();
    
    // Extract schema UID from the Registered event logs
    // The schema UID is in the first log entry's second topic
    let schemaUID;
    if (receipt.logs && receipt.logs.length > 0 && receipt.logs[0].topics && receipt.logs[0].topics.length > 1) {
      schemaUID = receipt.logs[0].topics[1];
    } else {
      // Fallback: use transaction hash if we can't find the UID in logs
      schemaUID = receipt.transactionHash || receipt.hash;
      logWarning('Could not extract schema UID from event logs, using transaction hash');
    }
    
    logSuccess('Schema registered successfully!');
    log('');
    log('═══════════════════════════════════════════════════════════', colors.green);
    log(`Schema UID: ${schemaUID}`, colors.green);
    log('═══════════════════════════════════════════════════════════', colors.green);
    log('');
    logInfo('Next Steps:');
    log('  1. Copy the Schema UID above');
    log('  2. Add it to your .env file as PUBLIC_REVIEW_SCHEMA_UID');
    log('  3. Use this UID when creating attestations');
    log('');
    
    return schemaUID;
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error(
        'Insufficient funds to pay for gas.\n' +
        'Get Base Sepolia testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet'
      );
    }
    
    if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
      throw new Error(
        'Transaction nonce issue. Please try again in a few moments.'
      );
    }
    
    if (error.message && error.message.includes('already exists')) {
      throw new Error(
        'Schema already exists. This schema may have been registered previously.\n' +
        'Check your transaction history or use the existing schema UID.'
      );
    }
    
    // Generic error
    throw new Error(`Schema registration failed: ${error.message}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  log('');
  log('═══════════════════════════════════════════════════════════', colors.cyan);
  log('  EAS Schema Registration Script', colors.cyan);
  log('  Base Sepolia Testnet', colors.cyan);
  log('═══════════════════════════════════════════════════════════', colors.cyan);
  log('');

  try {
    // Step 1: Validate environment variables
    const config = validateEnvironment();
    log('');
    
    // Step 2: Connect to network
    const { signer } = await connectToNetwork(config);
    log('');
    
    // Step 3: Register schema
    const schemaUID = await registerSchema(signer, config.schemaRegistryAddress);
    
    // Success!
    process.exit(0);
  } catch (error) {
    log('');
    logError(error.message);
    log('');
    
    if (error.stack && process.env.DEBUG === 'true') {
      log('Stack trace:', colors.yellow);
      console.log(error.stack);
    }
    
    process.exit(1);
  }
}

// Execute main function if this script is run directly
if (require.main === module) {
  main();
}

module.exports = { validateEnvironment, connectToNetwork, registerSchema };
