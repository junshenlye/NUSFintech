const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🔑 Comprehensive Role Grant to Trade Manager\n");

    try {
        // Setup UNFCCC account (admin)
        const unfccc = new hre.ethers.Wallet(
            process.env.PRIVATE_KEY,
            hre.ethers.provider
        );

        // Contract addresses
        const mcuRegistryAddress = "0xc071Cb7755Ec95Ed12B512965566dE0c99cBE206";
        const itmoRegistryAddress = "0xFEAfdb359081F41865123A4B8fD4D4377870c412";
        const tradeManagerAddress = "0xd826ea1B86Bb1aF5B30c2b66dD7f93ABC404B79E";

        console.log("Contracts:");
        console.log(`MCU Registry: ${mcuRegistryAddress}`);
        console.log(`ITMO Registry: ${itmoRegistryAddress}`);
        console.log(`Trade Manager: ${tradeManagerAddress}`);

        // Connect to both registries
        const MCURegistry = await hre.ethers.getContractFactory("MCURegistry");
        const mcuRegistry = MCURegistry.attach(mcuRegistryAddress).connect(unfccc);

        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
        const itmoRegistry = ITMORegistry.attach(itmoRegistryAddress).connect(unfccc);

        console.log("\nGranting roles...");

        // Grant roles in MCU Registry
        const MCU_COUNTRY_ROLE = await mcuRegistry.COUNTRY_ROLE();
        const MCU_UNFCCC_ROLE = await mcuRegistry.UNFCCC_ROLE();
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

        console.log("\nMCU Registry Roles:");
        console.log(`COUNTRY_ROLE: ${MCU_COUNTRY_ROLE}`);
        console.log(`UNFCCC_ROLE: ${MCU_UNFCCC_ROLE}`);

        // Grant each role
        for (const role of [MCU_COUNTRY_ROLE, MCU_UNFCCC_ROLE, DEFAULT_ADMIN_ROLE]) {
            console.log(`\nGranting role ${role} to Trade Manager...`);
            try {
                const tx = await mcuRegistry.grantRole(role, tradeManagerAddress);
                await tx.wait();
                const hasRole = await mcuRegistry.hasRole(role, tradeManagerAddress);
                console.log(`Role granted successfully: ${hasRole}`);
            } catch (error) {
                console.log(`Failed to grant role: ${error.message}`);
            }
        }

        // Grant roles in ITMO Registry
        const ITMO_COUNTRY_ROLE = await itmoRegistry.COUNTRY_ROLE();
        const ITMO_UNFCCC_ROLE = await itmoRegistry.UNFCCC_ROLE();

        console.log("\nITMO Registry Roles:");
        console.log(`COUNTRY_ROLE: ${ITMO_COUNTRY_ROLE}`);
        console.log(`UNFCCC_ROLE: ${ITMO_UNFCCC_ROLE}`);

        // Grant each role
        for (const role of [ITMO_COUNTRY_ROLE, ITMO_UNFCCC_ROLE, DEFAULT_ADMIN_ROLE]) {
            console.log(`\nGranting role ${role} to Trade Manager...`);
            try {
                const tx = await itmoRegistry.grantRole(role, tradeManagerAddress);
                await tx.wait();
                const hasRole = await itmoRegistry.hasRole(role, tradeManagerAddress);
                console.log(`Role granted successfully: ${hasRole}`);
            } catch (error) {
                console.log(`Failed to grant role: ${error.message}`);
            }
        }

        // Final verification
        console.log("\n✅ Final Role Verification:");
        console.log("\nMCU Registry:");
        console.log(`COUNTRY_ROLE: ${await mcuRegistry.hasRole(MCU_COUNTRY_ROLE, tradeManagerAddress)}`);
        console.log(`UNFCCC_ROLE: ${await mcuRegistry.hasRole(MCU_UNFCCC_ROLE, tradeManagerAddress)}`);
        console.log(`DEFAULT_ADMIN_ROLE: ${await mcuRegistry.hasRole(DEFAULT_ADMIN_ROLE, tradeManagerAddress)}`);

        console.log("\nITMO Registry:");
        console.log(`COUNTRY_ROLE: ${await itmoRegistry.hasRole(ITMO_COUNTRY_ROLE, tradeManagerAddress)}`);
        console.log(`UNFCCC_ROLE: ${await itmoRegistry.hasRole(ITMO_UNFCCC_ROLE, tradeManagerAddress)}`);
        console.log(`DEFAULT_ADMIN_ROLE: ${await itmoRegistry.hasRole(DEFAULT_ADMIN_ROLE, tradeManagerAddress)}`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });