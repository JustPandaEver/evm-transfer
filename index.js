import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import readline from 'readline';
import chalk from 'chalk';
import { log } from './utils/logger.js';
import { printName } from './utils/name.js';

// Load network configuration
const networkConfig = JSON.parse(fs.readFileSync('./config/network.json', 'utf-8'));

// Function to select network
function selectNetwork(networkIndex) {
    const networkNames = Object.keys(networkConfig);
    const networkName = networkNames[networkIndex - 1];
    if (!networkName) {
        throw new Error(`Network with index ${networkIndex} not found in configuration`);
    }
    return networkConfig[networkName];
}

// Function to display available networks
function displayNetworks() {
    const networkNames = Object.keys(networkConfig);
    console.log(chalk.blueBright('Available Networks:'));
    networkNames.forEach((name, index) => {
        console.log(`${index + 1}: ${name}`);
    });
}

// Function to prompt user for input
function promptUser(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(chalk.blueBright(question), (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Function to add a new network
async function addNetwork() {
    const name = await promptUser('Enter Network Name, exp Zero Testnet: ');
    const rpcUrl = await promptUser('Enter RPC URL, https: ');
    const chainId = await promptUser('Enter Chain ID: ');

    if (networkConfig[name]) {
        throw new Error(`Network with name ${name} already exists`);
    }

    networkConfig[name] = {
        RPC_URL: rpcUrl,
        CHAIN_ID: chainId
    };

    fs.writeFileSync('./config/network.json', JSON.stringify(networkConfig, null, 2));
    console.log(chalk.greenBright('Network added successfully!'));
}

async function main() {
    printName();

    const action = await promptUser('Do you want to add a new network? (y/n): ');

    if (action.toLowerCase() === 'y') {
        await addNetwork();
    }

    // Display and select network
    displayNetworks();
    const networkIndex = parseInt(await promptUser('Select Network by Number: '), 10);
    const { RPC_URL, CHAIN_ID } = selectNetwork(networkIndex);

    // Prompt user for number of addresses to generate
    const addressCount = parseInt(await promptUser('How many transactions, for exp 100: '), 10);

    // Load private key from environment variables
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('PRIVATE_KEY not set in .env file');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider, CHAIN_ID);

    // Function to wait for a specified number of milliseconds
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to generate a random EVM address
    function generateRandomAddress() {
        const randomWallet = ethers.Wallet.createRandom();
        return randomWallet.address;
    }

    // Function to generate multiple random addresses
    function generateMultipleRandomAddresses(count) {
        return Array.from({ length: count }, generateRandomAddress);
    }

    // Generate random addresses
    log('INFO', 'Generating random address... ');
    log('INFO', 'Please wait...... ');

    const balance = await provider.getBalance(wallet.address);
    log('DEBUG', `Current ETH balance: ${ethers.formatEther(balance)} ETH`);

    const randomAddresses = generateMultipleRandomAddresses(addressCount);
    log('INFO', 'Starting ETH transfers...');
    await delay(1000);

    // Function to generate a random amount of Ether
    function generateRandomAmount() {
        const amounts = Math.floor(Math.random() * 11) + 10; // Generates a random number between 10 and 20
        return ethers.parseUnits("0.0000000000000000" + amounts, 'ether'); // Convert to wei
    }
    // Function to send transactions with retries
    async function sendTransactions() {
        let successCount = 0;

        for (const recipient of randomAddresses) {
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    // Create the transaction
                    const tx = {
                        to: recipient,
                        gasPrice: await provider.getFeeData(),
                        gasLimit: 22000,
                        value: generateRandomAmount(),
                        nonce: await provider.getTransactionCount(wallet.address)
                    };

                    // Send the transaction
                    const txResponse = await wallet.sendTransaction(tx);

                    successCount++;
                    log('SUCCESS', `Transaction ${successCount} with hash: ${txResponse.hash}`);
                    nonce++; // Increment nonce for the next transaction
                    break; // Exit retry loop on success
                } catch (error) {
                    retryCount++;
                    let errorMessage = error.message;
                    if (error.code === 'INSUFFICIENT_FUNDS') {
                        errorMessage = 'INSUFFICIENT_FUNDS';
                    }
                    if (error.code === 'SERVER_ERROR') {
                        errorMessage = 'Service Temporarily Unavailable';
                    }
                    log('ERROR', `Error sending transaction to ${recipient}: ${errorMessage}`);
                    await delay(500); // Wait before retrying
                }
            }

            await delay(10); // Delay between transactions
        }
    }

    await sendTransactions();
}

main().catch(console.error);
