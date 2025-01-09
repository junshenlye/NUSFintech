// test/retire-tokens.test.js
const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🔥 MCU Token Retirement Test\n");

    try {
        // Setup buyer (Country B) who will retire tokens
        const buyer = new hre.ethers.Wallet(
            process.env.COUNTRY_B_PRIVATE_KEY,
            hre.ethers.provider
        );

        console.log("Participant:");
        console.log(`Country B (Token Holder): ${buyer.address}`);

        // Create MCU Registry contract instance
        const mcuRegistry = await hre.ethers.getContractAt(
            "MCURegistry",
            process.env.MCU_REGISTRY_ADDRESS,
            buyer  // Connect with buyer's signer
        );

        console.log("\nContract Address:");
        console.log(`MCU Registry: ${process.env.MCU_REGISTRY_ADDRESS}`);

        // Check initial balance
        const projectId = process.env.PROJECT_ID || "0"; // Use the project ID from the trade
        const initialBalance = await mcuRegistry.balanceOf(buyer.address, projectId);
        console.log("\n💎 Initial Token Balance:");
        console.log(`Project ${projectId}: ${initialBalance} MCUs`);

        // Get retirement amount from user or environment
        const amountToRetire = 5; // You can modify this or make it an env variable
        console.log(`\n🔥 Planning to retire ${amountToRetire} MCUs`);

        if (initialBalance < amountToRetire) {
            throw new Error(`Insufficient balance. Have: ${initialBalance}, Want to retire: ${amountToRetire}`);
        }

        // Check if buyer has COUNTRY_ROLE
        const COUNTRY_ROLE = await mcuRegistry.COUNTRY_ROLE();
        const hasCountryRole = await mcuRegistry.hasRole(COUNTRY_ROLE, buyer.address);
        
        if (!hasCountryRole) {
            console.log("\n⚠️ Granting COUNTRY_ROLE to buyer...");
            // Get UNFCCC signer to grant role
            const unfccc = new hre.ethers.Wallet(
                process.env.PRIVATE_KEY,
                hre.ethers.provider
            );
            const mcuRegistryAdmin = mcuRegistry.connect(unfccc);
            const grantRoleTx = await mcuRegistryAdmin.grantRole(COUNTRY_ROLE, buyer.address);
            await grantRoleTx.wait();
            console.log("✅ COUNTRY_ROLE granted to buyer");
        }

        // Retire tokens
        console.log("\n🔄 Executing token retirement...");
        const retirementReason = "NDC Commitment Fulfillment - 2025 Target";
        const retireTx = await mcuRegistry.retireTokens(
            projectId,
            amountToRetire,
            retirementReason
        );

        console.log("Waiting for transaction confirmation...");
        const receipt = await retireTx.wait();

        // Verify retirement
        const finalBalance = await mcuRegistry.balanceOf(buyer.address, projectId);
        console.log("\n✨ Verification:");
        console.log(`Final Token Balance: ${finalBalance} MCUs`);
        console.log(`Tokens Retired: ${amountToRetire} MCUs`);

        // Get retirement records
        const retirementRecords = await mcuRegistry.getRetirementRecords(buyer.address, projectId);
        
        console.log("\n📋 Retirement Records:");
        retirementRecords.forEach((record, index) => {
            console.log(`\nRecord #${index + 1}:`);
            console.log(`Amount: ${record.amount} MCUs`);
            console.log(`Timestamp: ${new Date(Number(record.timestamp) * 1000).toLocaleString()}`);
            console.log(`Reason: ${record.reason}`);
            console.log(`Is Retired: ${record.isRetired}`);
        });

        console.log("\n✅ Token Retirement Completed Successfully!");
        console.log(`Transaction Hash: ${receipt.hash}`);
        console.log(`Block Number: ${receipt.blockNumber}`);
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

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