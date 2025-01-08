// test/itmo-trade.test.js

const hre = require("hardhat");
const {
    question,
    formatDate,
    getAgreementStatus,
    isValidAddress,
    rl
} = require('./utils/test-utils');
require('dotenv').config();

const UNFCCC_PRIVATE_KEY = process.env.PRIVATE_KEY; // This should be in your .env file
const unfcccSigner = new hre.ethers.Wallet(
    UNFCCC_PRIVATE_KEY,
    hre.ethers.provider
);

async function main() {
    console.log("\n🌍 Enhanced ITMO Trade Execution Test\n");

    try {
        // First, validate that we have the necessary environment variables
        if (!process.env.PRIVATE_KEY || !process.env.ACCOUNT_ADDRESS) {
            throw new Error("Missing required environment variables PRIVATE_KEY or ACCOUNT_ADDRESS");
        }

        const executingAccount = "0xFe4D111b2A5b1Dff59F7E670961BF0d000AB6724";
        console.log(`🔑 Executing from account: ${executingAccount}`);

        // Get contract instances
        const itmoRegistryAddress = await question("Enter ITMO Registry Address: ");
        const mcuRegistryAddress = await question("Enter MCU Registry Address: ");
        const tradeManagerAddress = await question("Enter Trade Manager Address: ");

        console.log("\n📄 Contract Addresses:");
        console.log(`ITMO Registry: ${itmoRegistryAddress}`);
        console.log(`MCU Registry: ${mcuRegistryAddress}`);
        console.log(`Trade Manager: ${tradeManagerAddress}`);

        // Create contract instances
        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
        const MCURegistry = await hre.ethers.getContractFactory("MCURegistry");
        const TradeManager = await hre.ethers.getContractFactory("ITMOTradeManager");

        const itmoRegistry = ITMORegistry.attach(itmoRegistryAddress);
        const mcuRegistry = MCURegistry.attach(mcuRegistryAddress);
        const tradeManager = TradeManager.attach(tradeManagerAddress);

        // Check if executing account has UNFCCC_ROLE
        const UNFCCC_ROLE = await tradeManager.UNFCCC_ROLE();
        const hasUnfcccRole = await tradeManager.hasRole(UNFCCC_ROLE, executingAccount);

        if (!hasUnfcccRole) {
            throw new Error(`Account ${executingAccount} does not have UNFCCC_ROLE. Cannot execute trades.`);
        }

        console.log("✅ Account verified as UNFCCC administrator");

        // Get agreement ID
        const agreementId = parseInt(await question("Agreement ID to execute: "));

        // Fetch and display detailed agreement info
        const agreement = await itmoRegistry.getAgreementDetails(agreementId);
        console.log("\n📋 Detailed Agreement Information:");
        console.log(`Agreement ID: ${agreementId}`);
        console.log(`Seller Address: ${agreement[1]}`);
        console.log(`Buyer Address: ${agreement[2]}`);
        console.log(`MCU Amount: ${agreement[3].toString()}`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(agreement[4])} XRP`);
        console.log(`Payment Currency: ${agreement[5]}`);
        console.log(`Payment Method: ${agreement[6]}`);
        console.log(`Status: ${getAgreementStatus(agreement[7])}`);
        console.log(`Created At: ${new Date(Number(agreement[8]) * 1000).toLocaleString()}`);
        console.log(`Valid Until: ${new Date(Number(agreement[9]) * 1000).toLocaleString()}`);
        console.log(`Transfer Deadline: ${new Date(Number(agreement[10]) * 1000).toLocaleString()}`);

        // Validate agreement status
        if (getAgreementStatus(agreement[7]) !== 'Active') {
            throw new Error(`Agreement is not active. Current status: ${getAgreementStatus(agreement[7])}`);
        }

        // Get and display initial token balances
        console.log("\n💎 Initial Token Balances:");
        await displayTokenBalances(mcuRegistry, agreement[1], agreement[2]);

        // Get MCU source details
        const projectCount = parseInt(await question("\nNumber of source projects to use: "));
        const projectIds = [];
        const amounts = [];
        const projectDetails = [];

        let totalAmount = 0;
        const requiredAmount = Number(agreement[3]);

        for (let i = 0; i < projectCount; i++) {
            console.log(`\n🏗️ Project ${i + 1} Details:`);
            const projectId = parseInt(await question("Project ID: "));
            
            // Get and display detailed project information
            const project = await mcuRegistry.getProject(projectId);
            console.log(`Project Name: ${project[1]}`);
            console.log(`Description: ${project[2]}`);
            console.log(`Country Owner: ${project[3]}`);
            console.log(`Project Type: ${project[4]}`);
            console.log(`Registry System: ${project[5].registrySystem}`);
            console.log(`Host Country: ${project[5].hostCountryRegistry}`);
            
            // Get token balances for this project
            const sellerBalance = await mcuRegistry.balanceOf(agreement[1], projectId);
            console.log(`\nAvailable Balance: ${sellerBalance.toString()} MCUs`);

            const amount = parseInt(await question("Amount to transfer from this project: "));
            
            if (amount > sellerBalance) {
                throw new Error(`Insufficient balance in project ${projectId}`);
            }

            projectIds.push(projectId);
            amounts.push(amount);
            projectDetails.push(project);
            totalAmount += amount;

            if (totalAmount >= requiredAmount) {
                break;
            }
        }

        // Validate total amount
        if (totalAmount !== requiredAmount) {
            throw new Error(`Total amount ${totalAmount} does not match agreement amount ${requiredAmount}`);
        }

        // Calculate payment
        const paymentAmount = agreement[3] * agreement[4];
        if (executingAccount === agreement[1] || executingAccount === agreement[2]) {
            throw new Error("UNFCCC administrator cannot be a party to the trade they are executing");
        }

        // Display comprehensive trade summary
        console.log("\n📊 Comprehensive Trade Summary:");
        console.log("Agreement Details:");
        console.log(`- ID: ${agreementId}`);
        console.log(`- Total MCUs: ${totalAmount}`);
        console.log(`- Payment: ${hre.ethers.formatEther(paymentAmount)} XRP`);
        
        console.log("\nProjects Involved:");
        for (let i = 0; i < projectIds.length; i++) {
            console.log(`\nProject ${projectIds[i]}:`);
            console.log(`- Name: ${projectDetails[i][1]}`);
            console.log(`- Amount: ${amounts[i]} MCUs`);
            console.log(`- Registry: ${projectDetails[i][5].registrySystem}`);
        }

        // Get confirmation with additional warning
        console.log("\n⚠️ Important: You are executing this trade as a UNFCCC administrator.");
        console.log("This action is final and will transfer both tokens and payment.");
        const confirm = await question("\nConfirm trade execution? (yes/no): ");
        if (confirm.toLowerCase() !== 'yes') {
            console.log("Trade execution cancelled.");
            process.exit(0);
        }

        // Double-check role hasn't been revoked during the process
        const stillHasRole = await tradeManager.hasRole(UNFCCC_ROLE, executingAccount);
        console.log(stillHasRole);
        if (!stillHasRole) {
            throw new Error("UNFCCC_ROLE was revoked during the process. Cannot proceed with trade.");
        }

        console.log("✅ Both UNFCCC Account and Trade Manager Contract verified");

        // Execute trade
        console.log("\n🔄 Executing trade transaction as UNFCCC administrator...");
        const tradeTx = await tradeManager.executeTrade(
            agreementId,
            projectIds,
            amounts,
            { value: paymentAmount }
        );

        console.log("\n⏳ Waiting for transaction confirmation...");
        const receipt = await tradeTx.wait();

        // Log transaction details
        console.log("\n🔍 Transaction Details:");
        console.log(`Hash: ${receipt.hash}`);
        console.log(`Block: ${receipt.blockNumber}`);

        // Display final token balances
        console.log("\n💎 Final Token Balances:");
        await displayTokenBalances(mcuRegistry, agreement[1], agreement[2]);

        console.log("\n✅ Trade execution completed successfully!");

    } catch (error) {
        console.error("\n❌ Error:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    } finally {
        rl.close();
    }
}

// Helper function to display token balances
async function displayTokenBalances(mcuRegistry, seller, buyer) {
    const projectIds = []; // Add relevant project IDs
    for (let i = 0; i <= 10; i++) { // Adjust range as needed
        try {
            await mcuRegistry.getProject(i);
            projectIds.push(i);
        } catch (e) {
            continue;
        }
    }

    console.log("\nSeller Balances:");
    for (const projectId of projectIds) {
        const balance = await mcuRegistry.balanceOf(seller, projectId);
        if (balance > 0) {
            const project = await mcuRegistry.getProject(projectId);
            console.log(`Project ${projectId} (${project[1]}): ${balance.toString()} MCUs`);
        }
    }

    console.log("\nBuyer Balances:");
    for (const projectId of projectIds) {
        const balance = await mcuRegistry.balanceOf(buyer, projectId);
        if (balance > 0) {
            const project = await mcuRegistry.getProject(projectId);
            console.log(`Project ${projectId} (${project[1]}): ${balance.toString()} MCUs`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });