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
    console.log(`Country A (Seller): ${countryA.address}`);
    console.log(`Country B (Buyer): ${countryB.address}`);

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
        // Use registered address
        const registryAddress = "0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
        const registry = ITMORegistry.attach(registryAddress);
        console.log(`Attached to existing ITMORegistry at: ${registryAddress}`);

        // Register Countries (if not already registered)
        console.log("\n🏛️ Registering Countries...");

        const isCountryARegistered = await registry.hasRole(await registry.COUNTRY_ROLE(), countryA.address);
        if (!isCountryARegistered) {
            const registerA = await registry.registerCountry(countryA.address);
            await registerA.wait();
            console.log(`Country A (${countryA.address}) registered`);
        } else {
            console.log(`Country A (${countryA.address}) is already registered`);
        }

        const isCountryBRegistered = await registry.hasRole(await registry.COUNTRY_ROLE(), countryB.address);
        if (!isCountryBRegistered) {
            const registerB = await registry.registerCountry(countryB.address);
            await registerB.wait();
            console.log(`Country B (${countryB.address}) registered`);
        } else {
            console.log(`Country B (${countryB.address}) is already registered`);
        }

        // Get current timestamp and calculate deadlines
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const transferDeadline = currentTimestamp + (30 * 24 * 60 * 60); // 30 days from now
        const validityPeriod = 365 * 24 * 60 * 60; // 1 year

        // Initialize Agreement
        console.log("\n🚀 Initializing Agreement...");
        const agreementId = Date.now(); // Use a unique ID for each run
        const mcuAmount = hre.ethers.parseUnits("20", 0); // 1000 MCUs
        const pricePerMCU = hre.ethers.parseEther("0.1"); // 0.1 XRP per MCU

        const initTx = await registry.initializeAgreement(
            agreementId,
            countryA.address, // seller
            countryB.address, // buyer
            mcuAmount,
            pricePerMCU,
            "XRP", // paymentCurrency
            1, // paymentMethod (Crypto)
            validityPeriod,
            transferDeadline,
            "CA-2024-001" // correspondingAdjustmentRef
        );
        await initTx.wait();
        console.log("Agreement initialized successfully");

        // Display initial agreement details
        console.log("\n📄 Agreement Initial Details:");
        let details = await registry.getAgreementDetails(agreementId);
        displayAgreementDetails(details);

        // Countries Sign Agreement
        console.log("\n✍️ Collecting Signatures...");
        
        // Country A signs
        console.log("\nCountry A (Seller) Signing Process:");
        const hasSignedA = await registry.hasSignedAgreement(agreementId, countryA.address);
        if (!hasSignedA) {
            const signA = await registry.connect(countryA).signAgreement(agreementId);
            await signA.wait();
            console.log("Country A signature confirmed");
        } else {
            console.log("Country A has already signed the agreement");
        }

        // Country B signs
        console.log("\nCountry B (Buyer) Signing Process:");
        const hasSignedB = await registry.hasSignedAgreement(agreementId, countryB.address);
        if (!hasSignedB) {
            const signB = await registry.connect(countryB).signAgreement(agreementId);
            await signB.wait();
            console.log("Country B signature confirmed");
        } else {
            console.log("Country B has already signed the agreement");
        }

        // UNFCCC Activates Agreement
        console.log("\n🔓 UNFCCC Activating Agreement...");
        const activate = await registry.activateAgreement(agreementId);
        await activate.wait();
        console.log("Agreement activated successfully");

        // Final Status Check
        console.log("\n📊 Final Agreement Details:");
        details = await registry.getAgreementDetails(agreementId);
        displayAgreementDetails(details);

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
        5: "Completed",
        6: "Terminated"
    };
    return statusMap[status] || `Unknown (${status})`;
}

// Helper function to convert payment method to string
function getPaymentMethodString(method) {
    const methodMap = {
        0: "Fiat",
        1: "Crypto",
        2: "Mixed"
    };
    return methodMap[method] || `Unknown (${method})`;
}

// Helper function to display agreement details
function displayAgreementDetails(details) {
    console.log({
        agreementId: details.agreementRef.toString(),
        seller: details.seller,
        buyer: details.buyer,
        mcuAmount: details.mcuAmount.toString(),
        pricePerMCU: hre.ethers.formatEther(details.pricePerMCU) + " " + details.paymentCurrency,
        paymentMethod: getPaymentMethodString(details.paymentMethod),
        status: getStatusString(details.status),
        createdAt: new Date(Number(details.createdAt) * 1000).toLocaleString(),
        validUntil: new Date(Number(details.validUntil) * 1000).toLocaleString(),
        transferDeadline: new Date(Number(details.transferDeadline) * 1000).toLocaleString(),
        correspondingAdjustmentRef: details.correspondingAdjustmentRef
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });