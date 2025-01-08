const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🌍 MCU Project Registry Demo - UNFCCC Supervision System\n");

    // Check for required environment variables
    if (!process.env.PRIVATE_KEY || !process.env.Country_A_Private_Key || !process.env.Country_B_Private_Key) {
        throw new Error("Missing required environment variables. Check your .env file");
    }

    // Setup accounts using environment variables
    const unfccc = new hre.ethers.Wallet(
        process.env.PRIVATE_KEY,
        hre.ethers.provider
    );
    const countryA = new hre.ethers.Wallet(
        process.env.Country_A_Private_Key,
        hre.ethers.provider
    );
    const countryB = new hre.ethers.Wallet(
        process.env.Country_B_Private_Key,
        hre.ethers.provider
    );

    console.log("Participating Entities:");
    console.log(`UNFCCC: ${unfccc.address}`);
    console.log(`Country A: ${countryA.address}`);
    console.log(`Country B: ${countryB.address}`);

    // Get initial balances
    const initialBalances = {
        unfccc: hre.ethers.formatEther(await hre.ethers.provider.getBalance(unfccc.address)),
        countryA: hre.ethers.formatEther(await hre.ethers.provider.getBalance(countryA.address)),
        countryB: hre.ethers.formatEther(await hre.ethers.provider.getBalance(countryB.address))
    };

    console.log("\n💰 Initial XRP Balances:");
    console.log(`UNFCCC: ${initialBalances.unfccc} XRP`);
    console.log(`Country A: ${initialBalances.countryA} ETH`);
    console.log(`Country B: ${initialBalances.countryB} ETH`);

    try {
        const registryAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";
        const MCUProjectRegistry = await hre.ethers.getContractFactory("MCURegistry");
        const registry = MCUProjectRegistry.attach(registryAddress);
        console.log(`Attached to existing MCUProjectRegistry at: ${registryAddress}`);

        // Grant COUNTRY_ROLE to Country A and Country B
        console.log("\n🏛️ Granting COUNTRY_ROLE to Country A and Country B...");
        const COUNTRY_ROLE = await registry.COUNTRY_ROLE();
        const grantRoleTx1 = await registry.connect(unfccc).grantRole(COUNTRY_ROLE, countryA.address);
        await grantRoleTx1.wait();
        const grantRoleTx2 = await registry.connect(unfccc).grantRole(COUNTRY_ROLE, countryB.address);
        await grantRoleTx2.wait();

        // Verify that Country A has the COUNTRY_ROLE
        const hasRole = await registry.hasRole(COUNTRY_ROLE, countryA.address);
        if (!hasRole) {
            throw new Error("Country A does not have the COUNTRY_ROLE");
        }
        console.log(`Country A (${countryA.address}) and Country B (${countryB.address}) granted COUNTRY_ROLE`);

        // Register a Project by Country A
        console.log("\n📄 Registering a Project by Country A...");
        const projectId = "PROJECT15";
        const projectName = "Solar Pannel Global Project 15";
        const description = "A project to build a solar farm.";
        const projectType = 0; // RenewableEnergy
        const registrySystem = "XRP";
        const hostCountryRegistry = "A";
        const emissionData = {
            totalEmissionReduction: 50,
            baselineEmissions: 500000,
            verifiedReductions: 50000,
            emissionUnit: "tCO2e",
            isVerified: false,
        };

        const registerTx = await registry.connect(countryA).registerProject(
            projectId,
            projectName,
            description,
            projectType,
            registrySystem,
            hostCountryRegistry,
            emissionData
        );
        const receipt = await registerTx.wait();

        // Parse logs manually
        const iface = new hre.ethers.Interface([
            "event ProjectRegistered(uint256 indexed projectId, address indexed countryOwner, string projectIdentifier, string projectName, uint8 projectType)"
        ]);

        const projectRegisteredEvent = receipt.logs
            .map((log) => {
                try {
                    return iface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .find((e) => e?.name === "ProjectRegistered");

        if (!projectRegisteredEvent) {
            throw new Error("ProjectRegistered event not found");
        }

        const newProjectId = projectRegisteredEvent.args.projectId;
        console.log(`Project "${projectName}" registered by Country A with ID: ${newProjectId}`);

        // Validate Carbon Reduction and Mint Tokens
        console.log("\n🔄 Validating Carbon Reduction and Minting Tokens...");
        const carbonReduction = 50000; // equal to the verified reductions
        const validateTx = await registry.connect(unfccc).validateAndMintTokens(newProjectId, carbonReduction);
        await validateTx.wait();
        console.log(`Carbon reduction of ${carbonReduction} tCO2e validated and tokens minted`);

        // Check Token Balance for Country A
        const tokensMinted = carbonReduction / 1000; // 1 MCU = 1000 tCO2e
        const balance = await registry.balanceOf(countryA.address, newProjectId);
        console.log(`Country A's MCU Token Balance: ${balance.toString()} tokens`);

        // Update Project Status
        console.log("\n🔄 Updating Project Status to Active...");
        const updateStatusTx = await registry.connect(unfccc).updateProjectStatus(newProjectId, 2); // Active
        await updateStatusTx.wait();
        console.log("Project status updated to Active");

        // Get Final Project Details
        console.log("\n📊 Final Project Details:");
        const projectDetails = await registry.getProject(newProjectId);
        console.log(`Project Name: ${projectDetails.projectName}`);
        console.log(`Description: ${projectDetails.description}`);
        console.log(`Country Owner: ${projectDetails.countryOwner}`);
        console.log(`Status: ${getStatusString(projectDetails.status)}`);
        console.log(`Tokens Minted: ${projectDetails.tokensMinted}`);

        // Get final balances
        const finalBalances = {
            unfccc: hre.ethers.formatEther(await hre.ethers.provider.getBalance(unfccc.address)),
            countryA: hre.ethers.formatEther(await hre.ethers.provider.getBalance(countryA.address)),
            countryB: hre.ethers.formatEther(await hre.ethers.provider.getBalance(countryB.address))
        };

        console.log("\n💰 Final ETH Balances:");
        console.log(`UNFCCC: ${finalBalances.unfccc} ETH`);
        console.log(`Country A: ${finalBalances.countryA} ETH`);
        console.log(`Country B: ${finalBalances.countryB} ETH`);

        // Calculate and display gas costs
        console.log("\n⛽ Gas Usage Summary:");
        Object.entries({
            unfccc: parseFloat(initialBalances.unfccc) - parseFloat(finalBalances.unfccc),
            countryA: parseFloat(initialBalances.countryA) - parseFloat(finalBalances.countryA),
            countryB: parseFloat(initialBalances.countryB) - parseFloat(finalBalances.countryB)
        }).forEach(([party, cost]) => {
            console.log(`${party}: ${cost.toFixed(6)} ETH`);
        });

        console.log("\n🔍 View the contract on Etherscan:");
        console.log(`https://${hre.network.name}.etherscan.io/address/${registryAddress}`);

    } catch (error) {
        console.error("\n❌ Error in demo:", error);
        process.exit(1);
    }
}

// Helper function to convert status numbers to readable strings
function getStatusString(status) {
    const statusMap = {
        0: "Pending",
        1: "Validated",
        2: "Active",
        3: "Suspended"
    };
    return statusMap[status] || `Unknown (${status})`;
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });