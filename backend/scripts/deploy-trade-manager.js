const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🚀 Deploying ITMOTradeManager Contract\n");

    try {
        // Get deployer account
        const [deployer] = await hre.ethers.getSigners();
        console.log("Deploying with account:", deployer.address);

        // Contract addresses for constructor
        const itmoRegistryAddress = "0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const mcuRegistryAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";

        console.log("\n📄 Contract Parameters:");
        console.log(`ITMO Registry: ${itmoRegistryAddress}`);
        console.log(`MCU Registry: ${mcuRegistryAddress}`);

        // Deploy contract
        console.log("\n⏳ Deploying contract...");
        const ITMOTradeManager = await hre.ethers.getContractFactory("ITMOTradeManager");
        const tradeManager = await ITMOTradeManager.deploy(
            itmoRegistryAddress,
            mcuRegistryAddress
        );
        await tradeManager.waitForDeployment();

        const tradeManagerAddress = await tradeManager.getAddress();
        console.log(`\n✅ ITMOTradeManager deployed to: ${tradeManagerAddress}`);
        
        // Log deployment details for verification
        console.log("\n📋 Deployment Summary:");
        console.log("Network:", hre.network.name);
        console.log("Contract Address:", tradeManagerAddress);
        console.log("Transaction Hash:", tradeManager.deploymentTransaction().hash);

        // Wait for a few block confirmations
        console.log("\n⏳ Waiting for confirmations...");
        await tradeManager.deploymentTransaction().wait(5);
        console.log("✅ Deployment confirmed");

        console.log("\n🔍 Verify contract on XRPL EVM Sidechain Explorer:");
        console.log(`https://evm-sidechain.xrpl.org/address/${tradeManagerAddress}`);

    } catch (error) {
        console.error("\n❌ Error during deployment:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });