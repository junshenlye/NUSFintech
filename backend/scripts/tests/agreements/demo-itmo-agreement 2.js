const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🌍 ITMO Agreement Demo - UNFCCC Supervision System\n");

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
    console.log(`Country A: ${initialBalances.countryA} XRP`);
    console.log(`Country B: ${initialBalances.countryB} XRP`);

    try {
        // Deploy Registry Contract
        console.log("\n📝 Deploying ITMORegistry Contract...");
        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry", unfccc);
        const registry = await ITMORegistry.deploy();
        await registry.waitForDeployment();
        
        const registryAddress = await registry.getAddress();
        console.log(`Registry deployed to: ${registryAddress}`);

        // Save the contract address to a file for future reference
        await saveDeployment({
            network: hre.network.name,
            registryAddress: registryAddress,
            deploymentTime: new Date().toISOString(),
            unfcccAddress: unfccc.address
        });

        // Register Countries
        console.log("\n🏛️ Registering Countries...");
        const registerA = await registry.registerCountry(countryA.address);
        await registerA.wait();
        console.log(`Country A (${countryA.address}) registered`);

        const registerB = await registry.registerCountry(countryB.address);
        await registerB.wait();
        console.log(`Country B (${countryB.address}) registered`);

        // Create Agreement Hash (simulating off-chain agreement)
        const agreementContent = {
            title: "Bilateral ITMO Transfer Agreement",
            description: "Agreement for the transfer of ITMOs between Country A and Country B",
            terms: {
                transferAmount: "1000 tCO2e",
                price: "25 USD/tCO2e",
                validityPeriod: "2024-2025",
                monitoringRequirements: "Annual verification by accredited third party"
            },
            parties: [countryA.address, countryB.address],
            timestamp: new Date().toISOString()
        };

        const agreementHash = hre.ethers.keccak256(
            hre.ethers.toUtf8Bytes(JSON.stringify(agreementContent))
        );

        console.log("\n📄 Agreement Details:");
        console.log(JSON.stringify(agreementContent, null, 2));
        console.log(`Agreement Hash: ${agreementHash}`);

        // Initialize Agreement
        console.log("\n🚀 Initializing Agreement...");
        const initTx = await registry.initializeITMOAgreement(
            "ITMO12345", // itmoId
            "Green Energy Project", // projectName
            0, // projectType (RenewableEnergy)
            countryA.address, // originatingCountry
            [countryA.address, countryB.address], // requiredSigners
            {
                totalEmissionReduction: 50000, // emissionData
                baselineEmissions: 70000,
                mitigationActivityDescription: "Wind turbine installation"
            },
            agreementHash, // metadataHash
            "1000 tCO2e at 25 USD/tCO2e", // agreementTerms
            "Annual verification by accredited third party", // monitoringRequirements
            "2024-2025", // validityPeriod
            [] // involvedParties (empty array since verifier is removed)
        );
        const initReceipt = await initTx.wait();
        
        // Get agreement ID from event
        const event = initReceipt.logs.find(
            log => log.fragment?.name === 'ITMOAgreementInitialized'
        );
        const agreementId = event.args[0];
        console.log(`Agreement ID: ${agreementId}`);

        // Countries Sign Agreement
        console.log("\n✍️ Collecting Signatures...");
        
        // Country A signs
        console.log("\nCountry A Signing Process:");
        const agreementDetailsA = await registry.getITMOAgreementDetails(agreementId);
        console.log("Current Status:", getStatusString(agreementDetailsA.status));
        const signA = await registry.connect(countryA).signAgreement(agreementId);
        await signA.wait();
        console.log("Country A signature confirmed");

        // Country B signs
        console.log("\nCountry B Signing Process:");
        const agreementDetailsB = await registry.getITMOAgreementDetails(agreementId);
        console.log("Current Status:", getStatusString(agreementDetailsB.status));
        const signB = await registry.connect(countryB).signAgreement(agreementId);
        await signB.wait();
        console.log("Country B signature confirmed");

        // UNFCCC Activates Agreement
        console.log("\n🔓 UNFCCC Activating Agreement...");
        const activate = await registry.activateAgreement(agreementId);
        await activate.wait();

        // Final Status Check
        const finalDetails = await registry.getITMOAgreementDetails(agreementId);
        console.log("\n📊 Final Agreement Status:");
        console.log("Status:", getStatusString(finalDetails.status));
        console.log("Creation Time:", new Date(Number(finalDetails.createdAt) * 1000).toLocaleString());
        console.log("Activation Time:", new Date(Number(finalDetails.activatedAt) * 1000).toLocaleString());

        // Get final balances
        const finalBalances = {
            unfccc: hre.ethers.formatEther(await hre.ethers.provider.getBalance(unfccc.address)),
            countryA: hre.ethers.formatEther(await hre.ethers.provider.getBalance(countryA.address)),
            countryB: hre.ethers.formatEther(await hre.ethers.provider.getBalance(countryB.address))
        };

        console.log("\n💰 Final XRP Balances:");
        console.log(`UNFCCC: ${finalBalances.unfccc} XRP`);
        console.log(`Country A: ${finalBalances.countryA} XRP`);
        console.log(`Country B: ${finalBalances.countryB} XRP`);

        // Calculate and display gas costs
        console.log("\n⛽ Gas Usage Summary:");
        Object.entries({
            unfccc: parseFloat(initialBalances.unfccc) - parseFloat(finalBalances.unfccc),
            countryA: parseFloat(initialBalances.countryA) - parseFloat(finalBalances.countryA),
            countryB: parseFloat(initialBalances.countryB) - parseFloat(finalBalances.countryB)
        }).forEach(([party, cost]) => {
            console.log(`${party}: ${cost.toFixed(6)} XRP`);
        });

        console.log("\n🔍 View the contract on XRPL EVM Sidechain Explorer:");
        console.log(`https://evm-sidechain.xrpl.org/address/${registryAddress}`);

    } catch (error) {
        console.error("\n❌ Error in demo:", error);
        process.exit(1);
    }
}

// Helper function to save deployment information
async function saveDeployment(deploymentInfo) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const deploymentsDir = path.join(__dirname, '../deployments');
    
    try {
        await fs.mkdir(deploymentsDir, { recursive: true });
        await fs.writeFile(
            path.join(deploymentsDir, `${deploymentInfo.network}.json`),
            JSON.stringify(deploymentInfo, null, 2)
        );
    } catch (error) {
        console.error("Failed to save deployment info:", error);
    }
}

// Helper function to convert status numbers to readable strings
function getStatusString(status) {
    const statusMap = {
        0: "NonExistent",
        1: "Initialized",
        2: "SignaturePending",
        3: "AllSignaturesCollected",
        4: "Active",
        5: "Terminated"
    };
    return statusMap[status] || `Unknown (${status})`;
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });