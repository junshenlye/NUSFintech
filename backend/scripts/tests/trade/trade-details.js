const hre = require("hardhat");
require('dotenv').config();

// Enhanced ABI to include project-related functions
const ITMO_ABI = [
    "function getAgreementDetails(uint256 agreementId) view returns (uint256, address, address, uint256, uint256, string, uint8, uint8, uint256, uint256, uint256, string)"
];

const MCU_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)",
    "function getProject(uint256 projectId) view returns (string, string, string, address, uint8, tuple(string, string, bool), tuple(uint256, uint256, uint256, string, bool), uint256, uint8, uint256, uint256, string[])",
    "function countryProjects(address) view returns (uint256[])"
];

async function main() {
    console.log("\n🌍 ITMO Trade Details Showcase\n");

    // Setup accounts
    const provider = new hre.ethers.JsonRpcProvider("https://rpc-evm-sidechain.xrpl.org");
    
    const unfccc = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const countryA = new hre.ethers.Wallet(process.env.Country_A_Private_Key, provider);
    const countryB = new hre.ethers.Wallet(process.env.Country_B_Private_Key, provider);

    console.log("👥 Participating Entities:");
    console.log(`UNFCCC: ${unfccc.address}`);
    console.log(`Country A (Seller): ${countryA.address}`);
    console.log(`Country B (Buyer): ${countryB.address}`);

    try {
        const itmoRegistryAddress = "0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const mcuRegistryAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";

        const itmoRegistry = new hre.ethers.Contract(itmoRegistryAddress, ITMO_ABI, provider);
        const mcuRegistry = new hre.ethers.Contract(mcuRegistryAddress, MCU_ABI, provider);

        // Get XRP balances
        console.log("\n💎 Current XRP Balances:");
        const balances = {
            unfccc: await provider.getBalance(unfccc.address),
            countryA: await provider.getBalance(countryA.address),
            countryB: await provider.getBalance(countryB.address)
        };

        console.log(`UNFCCC: ${hre.ethers.formatEther(balances.unfccc)} XRP`);
        console.log(`Country A: ${hre.ethers.formatEther(balances.countryA)} XRP`);
        console.log(`Country B: ${hre.ethers.formatEther(balances.countryB)} XRP`);

        // Fetch and analyze token holdings across all projects
        console.log("\n📊 MCU Token Analysis:");
        
        // Function to get project details and balances
        async function getProjectAnalysis(address, role) {
            let totalTokens = 0;
            const projectDetails = [];

            try {
                // Loop through project IDs from 1 to 10 (adjust range as needed)
                for (let projectId = 1; projectId <= 10; projectId++) {
                    try {
                        const balance = await mcuRegistry.balanceOf(address, projectId);
                        if (balance > 0) {
                            const project = await mcuRegistry.getProject(projectId);
                            projectDetails.push({
                                id: projectId,
                                name: project[1],
                                balance: balance,
                                status: getProjectStatus(project[8])
                            });
                            totalTokens += Number(balance);
                        }
                    } catch (err) {
                        // Skip if project doesn't exist
                        continue;
                    }
                }

                console.log(`\n${role} Token Holdings:`);
                console.log(`Total MCU Tokens: ${totalTokens}`);
                console.log("Project Breakdown:");
                projectDetails.forEach(proj => {
                    console.log(`  - Project ${proj.id} (${proj.name})`);
                    console.log(`    Balance: ${proj.balance} MCUs`);
                    console.log(`    Status: ${proj.status}`);
                });

                return { totalTokens, projectDetails };
            } catch (error) {
                console.error(`Error analyzing ${role}'s holdings:`, error.message);
                return { totalTokens: 0, projectDetails: [] };
            }
        }

        // Analyze holdings for both countries
        const countryAAnalysis = await getProjectAnalysis(countryA.address, "Country A (Seller)");
        const countryBAnalysis = await getProjectAnalysis(countryB.address, "Country B (Buyer)");

        // Get agreement details
        const agreementId = 1736300239675;
        console.log("\n📄 Agreement Details:");
        const agreement = await itmoRegistry.getAgreementDetails(agreementId);
        
        console.log("\n📑 Agreement Information:");
        console.log(`Agreement ID: ${agreement[0]}`);
        console.log(`Seller: ${agreement[1]}`);
        console.log(`Buyer: ${agreement[2]}`);
        console.log(`MCU Amount: ${agreement[3].toString()} MCUs`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(agreement[4])} XRP`);
        console.log(`Payment Currency: ${agreement[5]}`);
        console.log(`Payment Method: ${getPaymentMethodString(agreement[6])}`);
        console.log(`Status: ${getStatusString(agreement[7])}`);
        console.log(`Created: ${new Date(Number(agreement[8]) * 1000).toLocaleString()}`);
        console.log(`Valid Until: ${new Date(Number(agreement[9]) * 1000).toLocaleString()}`);
        
        // Calculate and display trade feasibility
        const totalCost = agreement[3] * agreement[4];
        console.log(`\n💫 Trade Analysis:`);
        console.log(`Required MCUs: ${agreement[3].toString()}`);
        console.log(`Available MCUs (Seller): ${countryAAnalysis.totalTokens}`);
        console.log(`Total Cost: ${hre.ethers.formatEther(totalCost)} XRP`);
        console.log(`Buyer XRP Balance: ${hre.ethers.formatEther(balances.countryB)} XRP`);
        
        // Check if trade is possible
        console.log("\n🔍 Trade Feasibility Check:");
        console.log(`Sufficient MCUs: ${countryAAnalysis.totalTokens >= agreement[3] ? "✅ Yes" : "❌ No"}`);
        console.log(`Sufficient XRP: ${balances.countryB >= totalCost ? "✅ Yes" : "❌ No"}`);

        // Get current gas price
        const feeData = await provider.getFeeData();
        console.log("\n⛽ Current Gas Price:", hre.ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");

    } catch (error) {
        console.error("\n❌ Error:", error);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        process.exit(1);
    }
}

// Helper functions
function getPaymentMethodString(method) {
    const methods = ['Fiat', 'Crypto', 'Mixed'];
    return methods[method] || 'Unknown';
}

function getStatusString(status) {
    const statuses = [
        'NonExistent',
        'Initialized',
        'SignaturePending',
        'AllSignaturesCollected',
        'Active',
        'Completed',
        'Terminated'
    ];
    return statuses[status] || 'Unknown';
}

function getProjectStatus(status) {
    const statuses = ['Pending', 'Validated', 'Active', 'Suspended'];
    return statuses[status] || 'Unknown';
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });