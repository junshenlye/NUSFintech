// scripts/token-status.js
const hre = require("hardhat");
const { question } = require("./utils/test-utils");
require('dotenv').config();

async function main() {
    console.log("\n🔍 Analyzing Token Status and Ownership\n");

    try {
        // Get MCU Registry contract
        const mcuRegistryAddress = await question("Enter the MCU Registry Address: ");
        const mcuRegistry = await hre.ethers.getContractAt("MCURegistry", mcuRegistryAddress);

        console.log("📊 Token Analysis\n");

        // Track all projects and tokens
        const projects = [];
        let projectId = 0;
        
        // Keep trying sequential project IDs until we hit one that doesn't exist
        while (true) {
            try {
                const project = await mcuRegistry.getProject(projectId);
                projects.push({
                    id: projectId,
                    details: project
                });
                projectId++;
            } catch (error) {
                // If project doesn't exist, break the loop
                break;
            }
        }

        console.log(`Found ${projects.length} total projects\n`);

        // Analyze each project
        for (const project of projects) {
            console.log(`\n🌟 Project ${project.id}: ${project.details[1]}`);
            console.log(`Owner: ${project.details[3]}`);
            console.log(`Total Tokens Minted: ${project.details[7]}`);

            // Get token history
            const history = await mcuRegistry.getTokenHistory(project.id);
            console.log("\nToken Transfer History:");
            for (const transfer of history) {
                console.log(`- From: ${transfer.from}`);
                console.log(`  To: ${transfer.to}`);
                console.log(`  Amount: ${transfer.amount}`);
                console.log(`  Time: ${new Date(Number(transfer.timestamp) * 1000).toLocaleString()}`);
            }

            // Get retirement records for this project
            try {
                const retirementRecords = await mcuRegistry.getRetirementRecords(
                    project.details[3], // project owner
                    project.id
                );

                if (retirementRecords && retirementRecords.length > 0) {
                    console.log("\nRetirement Records:");
                    for (const record of retirementRecords) {
                        if (record.isRetired) {
                            console.log(`- Amount Retired: ${record.amount}`);
                            console.log(`  Reason: ${record.reason}`);
                            console.log(`  Time: ${new Date(Number(record.timestamp) * 1000).toLocaleString()}`);
                        }
                    }
                }
            } catch (error) {
                console.log("No retirement records found");
            }

            // Get current token holders
            const knownAddresses = [
                project.details[3], // Project owner
                ...history.map(h => h.to), // All recipients
                ...history.map(h => h.from) // All senders
            ];

            // Remove duplicates
            const uniqueAddresses = [...new Set(knownAddresses)];

            console.log("\nCurrent Token Holdings:");
            for (const address of uniqueAddresses) {
                if (address === "0x0000000000000000000000000000000000000001") {
                    continue; // Skip retirement address
                }
                const balance = await mcuRegistry.balanceOf(address, project.id);
                if (balance > 0) {
                    console.log(`- Address: ${address}`);
                    console.log(`  Balance: ${balance} tokens`);
                }
            }

            // Calculate retirement statistics
            const retiredToAddress = await mcuRegistry.balanceOf(
                "0x0000000000000000000000000000000000000001", // Retirement address
                project.id
            );
            console.log(`\nTotal Retired: ${retiredToAddress} tokens`);
            console.log(`Active Circulation: ${project.details[7] - retiredToAddress} tokens`);
        }

        // Print summary
        console.log("\n📈 Overall Summary:");
        const summaryData = {
            totalProjects: projects.length,
            totalTokensMinted: projects.reduce((acc, p) => acc + Number(p.details[7]), 0),
            activeProjects: projects.filter(p => p.details[8] === 2).length, // Status 2 is Active
            suspendedProjects: projects.filter(p => p.details[8] === 3).length // Status 3 is Suspended
        };

        console.log(`Total Projects: ${summaryData.totalProjects}`);
        console.log(`Total Tokens Minted: ${summaryData.totalTokensMinted}`);
        console.log(`Active Projects: ${summaryData.activeProjects}`);
        console.log(`Suspended Projects: ${summaryData.suspendedProjects}`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });