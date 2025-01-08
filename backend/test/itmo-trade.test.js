// test/itmo-trade.test.js

const hre = require("hardhat");
const {
    question,
    formatDate,
    getAgreementStatus,
    displayBalances,
    isValidAddress,
    rl
} = require('./utils/test-utils');

async function main() {
    console.log("\n🌍 ITMO Trade Execution Interactive Test\n");

    try {
        // Get contract instances
        const itmoRegistryAddress = "0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const mcuRegistryAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";
        const tradeManagerAddress = "0x26B6ddf80c7aEb4A2F104272F906f45bf02f2428";

        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
        const MCURegistry = await hre.ethers.getContractFactory("MCURegistry");
        const TradeManager = await hre.ethers.getContractFactory("ITMOTradeManager");

        const itmoRegistry = ITMORegistry.attach(itmoRegistryAddress);
        const mcuRegistry = MCURegistry.attach(mcuRegistryAddress);
        const tradeManager = TradeManager.attach(tradeManagerAddress);

        // Get user input for trade execution
        console.log("📝 Please enter trade details:\n");

        const agreementId = parseInt(await question("Agreement ID to execute: "));

        // Fetch and display agreement details
        const agreement = await itmoRegistry.getAgreementDetails(agreementId);
        console.log("\n📋 Agreement Details:");
        console.log(`Seller: ${agreement[1]}`);
        console.log(`Buyer: ${agreement[2]}`);
        console.log(`MCU Amount: ${agreement[3].toString()}`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(agreement[4])} XRP`);
        console.log(`Status: ${getAgreementStatus(agreement[7])}`);

        // Validate agreement status
        if (getAgreementStatus(agreement[7]) !== 'Active') {
            throw new Error(`Agreement is not active. Current status: ${getAgreementStatus(agreement[7])}`);
        }

        // Get MCU source details
        console.log("\n📝 Enter MCU source details:");
        const projectCount = parseInt(await question("Number of source projects to use: "));
        const projectIds = [];
        const amounts = [];

        let totalAmount = 0;
        const requiredAmount = Number(agreement[3]);

        for (let i = 0; i < projectCount; i++) {
            console.log(`\nProject ${i + 1}:`);
            const projectId = parseInt(await question("Project ID: "));
            
            // Check project exists and get details
            const projectDetails = await mcuRegistry.getProject(projectId);
            console.log(`Project Name: ${projectDetails[1]}`);
            
            // Get seller's balance for this project
            const sellerBalance = await mcuRegistry.balanceOf(agreement[1], projectId);
            console.log(`Available Balance: ${sellerBalance.toString()} MCUs`);

            const amount = parseInt(await question("Amount to transfer from this project: "));
            
            // Validate amount
            if (amount > sellerBalance) {
                throw new Error(`Insufficient balance in project ${projectId}`);
            }

            projectIds.push(projectId);
            amounts.push(amount);
            totalAmount += amount;

            if (totalAmount >= requiredAmount) {
                break;
            }
        }

        // Validate total amount matches agreement
        if (totalAmount !== requiredAmount) {
            throw new Error(`Total amount ${totalAmount} does not match agreement amount ${requiredAmount}`);
        }

        // Calculate payment amount
        const paymentAmount = agreement[3] * agreement[4];
        console.log(`\n💰 Required Payment: ${hre.ethers.formatEther(paymentAmount)} XRP`);

        // Display summary before execution
        console.log("\n📋 Trade Summary:");
        console.log(`Agreement ID: ${agreementId}`);
        for (let i = 0; i < projectIds.length; i++) {
            console.log(`Project ${projectIds[i]}: ${amounts[i]} MCUs`);
        }
        console.log(`Total MCUs: ${totalAmount}`);
        console.log(`Payment: ${hre.ethers.formatEther(paymentAmount)} XRP`);

        const confirm = await question("\nConfirm trade execution? (yes/no): ");
        if (confirm.toLowerCase() !== 'yes') {
            console.log("Trade execution cancelled.");
            process.exit(0);
        }

        // Execute trade
        console.log("\n🔄 Executing trade...");
        
        // Get initial balances
        console.log("\nInitial Balances:");
        await displayBalances(hre.ethers.provider, {
            Seller: agreement[1],
            Buyer: agreement[2]
        });

        // Execute the trade
        const tradeTx = await tradeManager.executeTrade(
            agreementId,
            projectIds,
            amounts,
            { value: paymentAmount }
        );

        console.log("Waiting for transaction confirmation...");
        const receipt = await tradeTx.wait();

        // Get final balances
        console.log("\nFinal Balances:");
        await displayBalances(hre.ethers.provider, {
            Seller: agreement[1],
            Buyer: agreement[2]
        });

        // Display MCU transfers
        console.log("\n📊 MCU Transfer Results:");
        for (let i = 0; i < projectIds.length; i++) {
            const buyerBalance = await mcuRegistry.balanceOf(agreement[2], projectIds[i]);
            console.log(`Project ${projectIds[i]}: ${buyerBalance.toString()} MCUs transferred to buyer`);
        }

        console.log("\n✅ Trade executed successfully!");
        console.log(`Transaction Hash: ${receipt.hash}`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    } finally {
        rl.close();
    }
}

// Add helper function for estimating gas
async function estimateGas(tradeManager, agreementId, projectIds, amounts, paymentAmount) {
    try {
        const gasEstimate = await tradeManager.estimateGas.executeTrade(
            agreementId,
            projectIds,
            amounts,
            { value: paymentAmount }
        );
        return gasEstimate;
    } catch (error) {
        console.error("Error estimating gas:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });