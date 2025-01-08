// test/utils/test-utils.js

const { ethers } = require("hardhat");
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promise wrapper for readline
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Helper function to format dates
function formatDate(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

// Helper function to format status codes
function getProjectStatus(status) {
    const statuses = ['Pending', 'Validated', 'Active', 'Suspended'];
    return statuses[status] || 'Unknown';
}

function getAgreementStatus(status) {
    const statuses = [
        'NonExistent',
        'Initialized',
        'SignaturePending',
        'AllSignaturesCollected',
        'Active',
        'Completed',
        'Terminated'
    ];
    return statuses[status] || 'Unknown';
}

function getPaymentMethod(method) {
    const methods = ['Fiat', 'Crypto', 'Mixed'];
    return methods[method] || 'Unknown';
}

// Helper function to get project type
function getProjectType(type) {
    const types = [
        'RenewableEnergy',
        'EnergyEfficiency',
        'Forestry',
        'Transportation',
        'WasteManagement',
        'Other'
    ];
    return types[type] || 'Unknown';
}

// Helper function to display balances
async function displayBalances(provider, accounts) {
    console.log("\n💰 Current Balances:");
    for (const [name, address] of Object.entries(accounts)) {
        const balance = await provider.getBalance(address);
        console.log(`${name}: ${ethers.formatEther(balance)} XRP`);
    }
}

// Helper function to validate address
function isValidAddress(address) {
    try {
        return ethers.isAddress(address);
    } catch (error) {
        return false;
    }
}

module.exports = {
    rl,
    question,
    formatDate,
    getProjectStatus,
    getAgreementStatus,
    getPaymentMethod,
    getProjectType,
    displayBalances,
    isValidAddress
};