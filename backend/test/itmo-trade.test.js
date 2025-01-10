// test/validate-trade-execution.test.js
const hre = require("hardhat");
require('dotenv').config();
const {
    getAgreementStatus,
} = require('./utils/test-utils');
const { Agent } = require("http");

async function main() {
    console.log("\n🔍 ITMO Trade Validation and Execution Test\n");

    try {
        // 1. Setup and Initial Validations - Using private keys from .env
        if (!process.env.PRIVATE_KEY || !process.env.COUNTRY_A_PRIVATE_KEY || !process.env.COUNTRY_B_PRIVATE_KEY) {
            throw new Error("Missing required environment variables for private keys");
        }

        // Setup signers using private keys
        const unfccc = new hre.ethers.Wallet(
            process.env.PRIVATE_KEY,
            hre.ethers.provider
        );
        const seller = new hre.ethers.Wallet(
            process.env.COUNTRY_A_PRIVATE_KEY,
            hre.ethers.provider
        );
        const buyer = new hre.ethers.Wallet(
            process.env.COUNTRY_B_PRIVATE_KEY,
            hre.ethers.provider
        );

        console.log("Participants:");
        console.log(`UNFCCC: ${unfccc.address}`);
        console.log(`Seller: ${seller.address}`);
        console.log(`Buyer: ${buyer.address}`);

        // 2. Contract Setup - Using addresses from .env
        if (!process.env.TRADE_MANAGER_ADDRESS || !process.env.ITMO_REGISTRY_ADDRESS || !process.env.MCU_REGISTRY_ADDRESS) {
            throw new Error("Missing required environment variables for contract addresses");
        }

        // Create contract instances
        const tradeManager = await hre.ethers.getContractAt(
            "ITMOTradeManager",
            process.env.TRADE_MANAGER_ADDRESS,
            unfccc
        );
        const itmoRegistry = await hre.ethers.getContractAt(
            "ITMORegistry",
            process.env.ITMO_REGISTRY_ADDRESS,
            unfccc
        );
        const mcuRegistry = await hre.ethers.getContractAt(
            "MCURegistry",
            process.env.MCU_REGISTRY_ADDRESS,
            unfccc
        );

        console.log("\nContract Addresses:");
        console.log(`Trade Manager: ${process.env.TRADE_MANAGER_ADDRESS}`);
        console.log(`ITMO Registry: ${process.env.ITMO_REGISTRY_ADDRESS}`);
        console.log(`MCU Registry: ${process.env.MCU_REGISTRY_ADDRESS}`);

        // 3. Role Validation
        console.log("\n🔐 Validating Roles...");
        const UNFCCC_ROLE = await tradeManager.UNFCCC_ROLE();
        const COUNTRY_ROLE = await tradeManager.COUNTRY_ROLE();
        console.log(tradeManager.address);
        console.log(UNFCCC_ROLE);
        console.log(COUNTRY_ROLE);

        const hasUnfcccRole = await tradeManager.hasRole(UNFCCC_ROLE, unfccc.address);

        console.log(`UNFCCC Role Check: ${hasUnfcccRole}`);


        const hasRole = await itmoRegistry.hasRole(UNFCCC_ROLE, process.env.TRADE_MANAGER_ADDRESS);
        if (!hasRole) {
            const tx = await itmoRegistry.grantRole(UNFCCC_ROLE, process.env.TRADE_MANAGER_ADDRESS);
            await tx.wait();
        }
        const tx = await mcuRegistry.grantRole(UNFCCC_ROLE, process.env.TRADE_MANAGER_ADDRESS);
        await tx.wait();

        if (!hasUnfcccRole) throw new Error("UNFCCC role validation failed");
        //if (!sellerHasCountryRole) throw new Error("Seller role validation failed");
        //if (!buyerHasCountryRole) throw new Error("Buyer role validation failed");

        console.log("✅ All roles validated");

        // 4. Agreement Validation
        if (!process.env.AGREEMENT_ID) {
            throw new Error("Missing AGREEMENT_ID in environment variables");
        }

        console.log("\n📄 Validating Agreement...");
        const agreementId = process.env.AGREEMENT_ID;
        const agreement = await itmoRegistry.getAgreementDetails(agreementId);
        console.log(agreement)

        console.log("Agreement Details:");
        console.log(`Status: ${agreement[7]}`); // Status index from your contract
        console.log(`Seller: ${agreement[1]}`);
        console.log(`Buyer: ${agreement[2]}`);
        console.log(`MCU Amount: ${agreement[3]}`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(agreement[4])} XRP`);
        console.log(`MetaURL_link ${agreement[12]} XRP`);



        // 5. MCU Balance Check
        console.log("\n💎 Checking MCU Balances...");
        const projectId = process.env.PROJECT_ID;
        if (!projectId) {
            throw new Error("Missing PROJECT_ID in environment variables");
        }

        const sellerBalance = await mcuRegistry.balanceOf(agreement[1], projectId);
        console.log(`Seller's MCU Balance for Project ${projectId}: ${sellerBalance}`);

        if (sellerBalance < agreement[3]) {
            throw new Error(`Insufficient MCU balance. Required: ${agreement[3]}, Available: ${sellerBalance}`);
        }

        // 6. Payment Amount Validation
        const totalPayment = agreement[3] * agreement[4];
        const buyerBalance = await hre.ethers.provider.getBalance(agreement[2]);

        console.log("\n💰 Payment Details:");
        console.log(`Required Payment: ${hre.ethers.formatEther(totalPayment)} XRP`);
        console.log(`Buyer Balance: ${hre.ethers.formatEther(buyerBalance)} XRP`);

        if (buyerBalance < totalPayment) {
            throw new Error("Insufficient buyer balance for payment");
        }

        // 7. Execute Trade
        console.log(agreementId)
        const tradeTx = await tradeManager.connect(unfccc).executeTrade(
            agreementId,
            [projectId],
            [agreement[3]],
            { value: totalPayment }
        );

        console.log("Waiting for transaction confirmation...");
        const receipt = await tradeTx.wait();

        // 8. Verification
        console.log("\n✨ Verifying Results...");
        
        // Check new balances
        const newSellerBalance = await mcuRegistry.balanceOf(agreement[1], projectId);
        const newBuyerBalance = await mcuRegistry.balanceOf(agreement[2], projectId);

        console.log("\nFinal MCU Balances:");
        console.log(`Seller: ${newSellerBalance}`);
        console.log(`Buyer: ${newBuyerBalance}`);

        // Verify agreement status
        const finalAgreement = await itmoRegistry.getAgreementDetails(agreementId);
        console.log(`Final Agreement Status: ${finalAgreement[8]}`);

        console.log("\n✅ Trade Test Completed Successfully!");
        console.log(`Transaction Hash: ${receipt.hash}`);
        
    } catch (error) {
        console.error("\n❌ Test Failed:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });