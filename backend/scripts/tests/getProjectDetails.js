const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🌍 Fetching MCU Project Details\n");

    // Contract address on XRPL EVM Sidechain
    const contractAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";

    // ABI of the MCUProjectRegistry contract
    const abi = [
        // ABI for getProject function
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "projectId",
                    "type": "uint256"
                }
            ],
            "name": "getProject",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "projectIdStr",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "projectName",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "description",
                    "type": "string"
                },
                {
                    "internalType": "address",
                    "name": "countryOwner",
                    "type": "address"
                },
                {
                    "internalType": "enum ProjectManager.ProjectType",
                    "name": "projectType",
                    "type": "uint8"
                },
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "registrySystem",
                            "type": "string"
                        },
                        {
                            "internalType": "string",
                            "name": "hostCountryRegistry",
                            "type": "string"
                        },
                        {
                            "internalType": "bool",
                            "name": "isActive",
                            "type": "bool"
                        }
                    ],
                    "internalType": "struct ProjectManager.ProjectRegistry",
                    "name": "registry",
                    "type": "tuple"
                },
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "totalEmissionReduction",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "baselineEmissions",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "verifiedReductions",
                            "type": "uint256"
                        },
                        {
                            "internalType": "string",
                            "name": "emissionUnit",
                            "type": "string"
                        },
                        {
                            "internalType": "bool",
                            "name": "isVerified",
                            "type": "bool"
                        }
                    ],
                    "internalType": "struct ProjectManager.EmissionData",
                    "name": "emissionData",
                    "type": "tuple"
                },
                {
                    "internalType": "uint256",
                    "name": "tokensMinted",
                    "type": "uint256"
                },
                {
                    "internalType": "enum ProjectManager.ProjectStatus",
                    "name": "status",
                    "type": "uint8"
                },
                {
                    "internalType": "uint256",
                    "name": "createdAt",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "validatedAt",
                    "type": "uint256"
                },
                {
                    "internalType": "string[]",
                    "name": "documents",
                    "type": "string[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // Connect to the XRPL EVM Sidechain
    const provider = new hre.ethers.JsonRpcProvider("https://rpc-evm-sidechain.xrpl.org");

    // Create a contract instance
    const contract = new hre.ethers.Contract(contractAddress, abi, provider);

    // Specify the project ID you want to query
    const projectId = 10; // Replace with the actual project ID

    // Fetch project details
    console.log(`Fetching details for Project ID: ${projectId}...`);
    const projectDetails = await contract.getProject(projectId);

    // Log the project details
    console.log("\n📊 Project Details:");
    console.log(`Project Name: ${projectDetails.projectName}`);
    console.log(`Description: ${projectDetails.description}`);
    console.log(`Country Owner: ${projectDetails.countryOwner}`);
    console.log(`Project Type: ${projectDetails.projectType}`);
    console.log(`Registry System: ${projectDetails.registry.registrySystem}`);
    console.log(`Host Country Registry: ${projectDetails.registry.hostCountryRegistry}`);
    console.log(`Total Emission Reduction: ${projectDetails.emissionData.totalEmissionReduction}`);
    console.log(`Verified Reductions: ${projectDetails.emissionData.verifiedReductions}`);
    console.log(`Tokens Minted: ${projectDetails.tokensMinted}`);
    console.log(`Status: ${projectDetails.status}`);
    console.log(`Created At: ${new Date(Number(projectDetails.createdAt) * 1000).toLocaleString()}`);
    console.log(`Validated At: ${new Date(Number(projectDetails.validatedAt) * 1000).toLocaleString()}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("\n❌ Error fetching project details:", error);
        process.exit(1);
    });