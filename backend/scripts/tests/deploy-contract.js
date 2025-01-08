// deploy.js
const hre = require("hardhat");
const { question } = require('../../test/utils/test-utils');
require('dotenv').config();

async function main() {
    console.log("\n🚀 Starting Contract Deployment Process\n");

    try {
        // Get deployer and other accounts
        const [deployer] = await hre.ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);
        console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

        // Ask which contracts to deploy
        console.log("\n📋 Select contracts to deploy (yes/no for each):");
        const deployMCU = await question("Deploy MCURegistry? (y/n): ") === 'y';
        const deployITMO = await question("Deploy ITMORegistry? (y/n): ") === 'y';
        const deployTradeManager = await question("Deploy ITMOTradeManager? (y/n): ") === 'y';

        // Get contract factories
        let mcuRegistry, itmoRegistry, tradeManager;
        let mcuRegistryAddress;
        let itmoRegistryAddress;
        let tradeManagerAddress;

        if (deployMCU) {
            console.log("\n1️⃣ Deploying MCURegistry...");
            const MCURegistry = await hre.ethers.getContractFactory("MCURegistry");
            mcuRegistry = await MCURegistry.deploy("https://api.example.com/mcu/");
            await mcuRegistry.waitForDeployment();
            mcuRegistryAddress = await mcuRegistry.getAddress();
            console.log("MCURegistry deployed to:", mcuRegistryAddress);
        }

        if (deployITMO) {
            console.log("\n2️⃣ Deploying ITMORegistry...");
            const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
            itmoRegistry = await ITMORegistry.deploy();
            await itmoRegistry.waitForDeployment();
            itmoRegistryAddress = await itmoRegistry.getAddress();
            console.log("ITMORegistry deployed to:", itmoRegistryAddress);
        }

        if (deployTradeManager) {
            // Verify required addresses
            if (!mcuRegistryAddress || !itmoRegistryAddress) {
                //get current addressess
                mcuRegistryAddress = await question("Current MCU Registry Address: ")
                itmoRegistryAddress = await question("Current ITMO Registry Address: ")
            }

            console.log("\n3️⃣ Deploying ITMOTradeManager...");
            const ITMOTradeManager = await hre.ethers.getContractFactory("ITMOTradeManager");
            tradeManager = await ITMOTradeManager.deploy(
                itmoRegistryAddress,
                mcuRegistryAddress
            );
            await tradeManager.waitForDeployment();
            tradeManagerAddress = await tradeManager.getAddress();
            console.log("ITMOTradeManager deployed to:", tradeManagerAddress);
        }

        // Setup roles and permissions only for newly deployed contracts
        console.log("\n🔐 Setting up roles and permissions...");

        if (deployMCU || deployITMO || deployTradeManager) {
            if (deployMCU) {
                const UNFCCC_ROLE = await mcuRegistry.UNFCCC_ROLE();
                console.log("Setting up MCURegistry roles...");
                await (await mcuRegistry.grantRole(UNFCCC_ROLE, deployer.address)).wait();
            }

            if (deployITMO) {
                const UNFCCC_ROLE = await itmoRegistry.UNFCCC_ROLE();
                console.log("Setting up ITMORegistry roles...");
                await (await itmoRegistry.grantRole(UNFCCC_ROLE, deployer.address)).wait();
            }

            if (deployTradeManager) {
                console.log("Setting up TradeManager permissions...");
                
                // Connect to existing contracts if not newly deployed
                if (!deployMCU) {
                    const MCURegistry = await hre.ethers.getContractFactory("MCURegistry");
                    mcuRegistry = MCURegistry.attach(mcuRegistryAddress);
                }
                if (!deployITMO) {
                    const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
                    itmoRegistry = ITMORegistry.attach(itmoRegistryAddress);
                }

                // No need to grant additional roles since TradeManager inherits from AccessControlBase
                console.log("TradeManager permissions setup complete (using inherited AccessControl)");
            }
        }

        // Save updated deployment info
        const updatedDeploymentInfo = {
            network: hre.network.name,
            MCURegistry: mcuRegistryAddress,
            ITMORegistry: itmoRegistryAddress,
            ITMOTradeManager: tradeManagerAddress,
            deployedAt: new Date().toISOString()
        };

        const fs = require('fs');
        fs.writeFileSync(
            `deployments-${hre.network.name}.json`,
            JSON.stringify(updatedDeploymentInfo, null, 2)
        );
        console.log("\n💾 Deployment information saved to deployments-" + hre.network.name + ".json");

        // Print verification instructions for newly deployed contracts
        console.log("\n🔍 Contract Addresses on XRPL EVM Sidechain Explorer:");
        if (deployMCU) {
            console.log(`MCURegistry: https://evm-sidechain.xrpl.org/address/${mcuRegistryAddress}`);
        }
        if (deployITMO) {
            console.log(`ITMORegistry: https://evm-sidechain.xrpl.org/address/${itmoRegistryAddress}`);
        }
        if (deployTradeManager) {
            console.log(`ITMOTradeManager: https://evm-sidechain.xrpl.org/address/${tradeManagerAddress}`);
        }

    } catch (error) {
        console.error("\n❌ Error during deployment:", error);
        console.error("Error details:", error.message);
        process.exit(1);
    }
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });