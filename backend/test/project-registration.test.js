// test/project-registration.test.js

const hre = require("hardhat");
const {
    question,
    formatDate,
    getProjectStatus,
    getProjectType,
    displayBalances,
    isValidAddress,
    rl
} = require('./utils/test-utils');

async function main() {
    console.log("\n🌍 MCU Project Registration Interactive Test\n");

    try {
        // Get MCU Registry contract
        const registryAddress = await question("MCU Registry Address:"); //"0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";
        const MCUProjectRegistry = await hre.ethers.getContractFactory("MCURegistry");

        const registry = MCUProjectRegistry.attach(registryAddress);
        const COUNTRY_ROLE = await registry.COUNTRY_ROLE();
        console.log(COUNTRY_ROLE)

        // Get the signer's address
    //    const [signer] = await hre.ethers.getSigners();
    //const signerAddress = await signer.getAddress();
    //   #console.log(signerAddress, signer)
        // Verify the address matches
        const countryAddress = await question("What is your address (Country Address): ");
        const countryPrivateKey = await question("Enter your private key: ");

        // Create wallet instance from the provided private key
        const country = new hre.ethers.Wallet(countryPrivateKey, hre.ethers.provider);

        if (country.address.toLowerCase() !== countryAddress.toLowerCase()) {
            throw new Error("Address and private key do not match");
        }
        const countryRegistry = registry.connect(country);

        // Check if signer has COUNTRY_ROLE
        const hasRole = await registry.hasRole(COUNTRY_ROLE, countryAddress);
        console.log(hasRole)
        if (!hasRole) {
            console.log(countryAddress)
            console.log("\n⚠️ Account does not have COUNTRY_ROLE. Attempting to get role from UNFCCC...");
            
            // Connect as UNFCCC admin
            const unfccc = new hre.ethers.Wallet(
                process.env.PRIVATE_KEY,  // UNFCCC private key from .env
                hre.ethers.provider
            );
            
            // Grant COUNTRY_ROLE to the signer
            const grantRoleTx = await registry.connect(unfccc).grantRole(COUNTRY_ROLE, countryAddress);
            await grantRoleTx.wait();
            console.log("✅ COUNTRY_ROLE granted successfully");
        }
        // Get user input for project details
        console.log("📝 Please enter project details:");
        
        const projectId = await question("Project ID (e.g., PROJECT001): ");
        const projectName = await question("Project Name: ");
        const description = await question("Project Description: ");
        
        console.log("\nProject Types:");
        console.log("0: RenewableEnergy");
        console.log("1: EnergyEfficiency");
        console.log("2: Forestry");
        console.log("3: Transportation");
        console.log("4: WasteManagement");
        console.log("5: Other");
        const projectType = parseInt(await question("Select Project Type (0-5): "));

        const registrySystem = await question("Registry System (e.g., XRP): ");
        const hostCountryRegistry = await question("Host Country Registry: ");

        console.log("\nEmission Data:");
        const totalEmissionReduction = parseInt(await question("Total Emission Reduction (tCO2e): "));
        const baselineEmissions = parseInt(await question("Baseline Emissions (tCO2e): "));
        const verifiedReductions = parseInt(await question("Verified Reductions (tCO2e): "));
        const emissionUnit = await question("Emission Unit (default: tCO2e): ") || "tCO2e";

        // Construct emission data object
        const emissionData = {
            totalEmissionReduction,
            baselineEmissions,
            verifiedReductions,
            emissionUnit,
            isVerified: false
        };

        // Display summary before registration
        console.log("\n📋 Project Summary:");
        console.log(`Project ID: ${projectId}`);
        console.log(`Name: ${projectName}`);
        console.log(`Type: ${getProjectType(projectType)}`);
        console.log(`Registry: ${registrySystem}`);
        console.log(`Host Country: ${hostCountryRegistry}`);
        console.log("\nEmission Data:");
        console.log(`Total Reduction: ${totalEmissionReduction} ${emissionUnit}`);
        console.log(`Baseline: ${baselineEmissions} ${emissionUnit}`);
        console.log(`Verified: ${verifiedReductions} ${emissionUnit}`);

        const confirm = await question("\nConfirm registration? (yes/no): ");
        if (confirm.toLowerCase() !== 'yes') {
            console.log("Registration cancelled.");
            process.exit(0);
        }

        // Register project
        console.log("\n📝 Registering project...");
        const registerTx = await countryRegistry.registerProject(
            projectId,
            projectName,
            description,
            projectType,
            registrySystem,
            hostCountryRegistry,
            emissionData
        );
        
        console.log("Waiting for transaction confirmation...");
        const receipt = await registerTx.wait();

        // Get project ID from event
        const projectRegisteredEvent = receipt.logs
            .filter((log) => log.eventName === "ProjectRegistered")
            .pop();

        if (!projectRegisteredEvent) {
            throw new Error("ProjectRegistered event not found");
        }

        const newProjectId = projectRegisteredEvent.args.projectId;
        console.log(`\n✅ Project registered successfully with ID: ${newProjectId}`);

        // Get and display project details
        const projectDetails = await registry.getProject(newProjectId);
        console.log("\n📊 Registered Project Details:");
        console.log(`Name: ${projectDetails.projectName}`);
        console.log(`Description: ${projectDetails.description}`);
        console.log(`Owner: ${projectDetails.countryOwner}`);
        console.log(`Status: ${getProjectStatus(projectDetails.status)}`);
        console.log(`Created: ${formatDate(projectDetails.createdAt)}`);

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