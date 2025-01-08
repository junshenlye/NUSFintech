// test/project-validation.test.js

const hre = require("hardhat");
const {
    question,
    formatDate,
    getProjectStatus,
    getProjectType,
    displayBalances,
    rl
} = require('./utils/test-utils');

async function main() {
    console.log("\n🌍 MCU Project Validation and Token Minting Test\n");

    try {
        // Connect to MCU Registry contract
        const registryAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";
        const MCUProjectRegistry = await hre.ethers.getContractFactory("MCURegistry");
        const registry = MCUProjectRegistry.attach(registryAddress);

        // Setup UNFCCC account
        const unfccc = new hre.ethers.Wallet(
            process.env.PRIVATE_KEY,  // UNFCCC private key
            hre.ethers.provider
        );
        console.log("UNFCCC Address:", unfccc.address);

        // Get initial balances
        const initialBalance = await hre.ethers.provider.getBalance(unfccc.address);
        console.log("\n💰 Initial UNFCCC Balance:", hre.ethers.formatEther(initialBalance), "XRP");

        // Get project ID from user
        const projectId = parseInt(await question("Enter Project ID to validate: "));

        // Get project details before validation
        const projectDetails = await registry.getProject(projectId);
        console.log("\n📊 Current Project Details:");
        console.log(`Name: ${projectDetails.projectName}`);
        console.log(`Description: ${projectDetails.description}`);
        console.log(`Owner: ${projectDetails.countryOwner}`);
        console.log(`Status: ${getProjectStatus(projectDetails.status)}`);
        console.log(`Current Tokens Minted: ${projectDetails.tokensMinted}`);
        console.log(`Verified Reductions: ${projectDetails.emissionData.verifiedReductions} ${projectDetails.emissionData.emissionUnit}`);

        // Get validation amount
        console.log("\nℹ️ Suggested validation amount:", projectDetails.emissionData.verifiedReductions, projectDetails.emissionData.emissionUnit);
        const carbonReduction = parseInt(await question("Enter amount to validate (tCO2e): "));

        // Confirm validation
        const confirm = await question("\nConfirm validation and token minting? (yes/no): ");
        if (confirm.toLowerCase() !== 'yes') {
            console.log("Validation cancelled.");
            process.exit(0);
        }

        // Validate and mint tokens
        console.log("\n🔄 Validating carbon reduction and minting tokens...");
        const validateTx = await registry.connect(unfccc).validateAndMintTokens(projectId, carbonReduction);
        console.log("Waiting for transaction confirmation...");
        await validateTx.wait();
        console.log(`✅ Carbon reduction of ${carbonReduction} tCO2e validated and tokens minted`);

        // Update project status to Active
        console.log("\n🔄 Updating project status to Active...");
        const updateStatusTx = await registry.connect(unfccc).updateProjectStatus(projectId, 2); // 2 = Active
        await updateStatusTx.wait();
        console.log("✅ Project status updated to Active");

        // Get updated project details
        const updatedProject = await registry.getProject(projectId);
        console.log("\n📊 Updated Project Details:");
        console.log(`Name: ${updatedProject.projectName}`);
        console.log(`Owner: ${updatedProject.countryOwner}`);
        console.log(`Status: ${getProjectStatus(updatedProject.status)}`);
        console.log(`Tokens Minted: ${updatedProject.tokensMinted}`);

        // Check token balance of project owner
        const ownerBalance = await registry.balanceOf(updatedProject.countryOwner, projectId);
        console.log(`\n💎 Project Owner's Token Balance: ${ownerBalance} MCUs`);

        // Display gas usage
        const finalBalance = await hre.ethers.provider.getBalance(unfccc.address);
        const gasCost = hre.ethers.formatEther(initialBalance - finalBalance);
        console.log("\n⛽ Gas Usage:");
        console.log(`UNFCCC spent: ${gasCost} XRP`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    } finally {
        rl.close();
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });