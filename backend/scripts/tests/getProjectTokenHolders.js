const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🌍 Fetching MCU Project Token Holders\n");

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
        },
        // ABI for balanceOf function
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "id",
                    "type": "uint256"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        // ABI for TransferSingle event
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "operator",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "from",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "id",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "TransferSingle",
            "type": "event"
        }
    ];

    // Connect to the XRPL EVM Sidechain
    const provider = new hre.ethers.JsonRpcProvider("https://rpc-evm-sidechain.xrpl.org");

    // Create a contract instance
    const contract = new hre.ethers.Contract(contractAddress, abi, provider);

    // Specify the project ID you want to query
    const projectId = 5; // Replace with the actual project ID (e.g., 5 for the project registered in demo-mcu-registry.js)

    // Fetch project details
    console.log(`Fetching details for Project ID: ${projectId}...`);
    const projectDetails = await contract.getProject(projectId);

    // Log the project details
    console.log("\n📊 Project Details:");
    console.log(`Project Name: ${projectDetails.projectName}`);
    console.log(`Description: ${projectDetails.description}`);
    console.log(`Country Owner: ${projectDetails.countryOwner}`);
    console.log(`Tokens Minted: ${projectDetails.tokensMinted}`);
    console.log(`Status: ${projectDetails.status}`);
    console.log(`Created At: ${new Date(Number(projectDetails.createdAt) * 1000).toLocaleString()}`);
    console.log(`Validated At: ${new Date(Number(projectDetails.validatedAt) * 1000).toLocaleString()}`);

    // Fetch token holders
    console.log("\n🔍 Fetching Token Holders...");

    // Get the balance of tokens for the country owner
    const countryOwnerBalance = await contract.balanceOf(projectDetails.countryOwner, projectId);
    console.log(`\nToken Holder: ${projectDetails.countryOwner}`);
    console.log(`Tokens Owned: ${countryOwnerBalance.toString()}`);

    // Fetch all TransferSingle events
    console.log("\n🔍 Fetching Transfer Events...");
    const filter = contract.filters.TransferSingle();
    const events = await contract.queryFilter(filter);

    const tokenHolders = new Set();

    // Add the country owner to the token holders set
    tokenHolders.add(projectDetails.countryOwner);

    // Parse TransferSingle events to find other token holders for the specific project ID
    for (const event of events) {
        const { id, from, to } = event.args;

        // Check if the event is for the specified project ID
        if (id.toString() === projectId.toString()) {
            if (from !== hre.ethers.ZeroAddress) {
                tokenHolders.add(from);
            }
            if (to !== hre.ethers.ZeroAddress) {
                tokenHolders.add(to);
            }
        }
    }

    // Log all token holders and their balances
    console.log("\n📊 Token Holders:");
    for (const holder of tokenHolders) {
        const balance = await contract.balanceOf(holder, projectId);
        console.log(`Holder: ${holder}`);
        console.log(`Tokens Owned: ${balance.toString()}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("\n❌ Error fetching project token holders:", error);
        process.exit(1);
    });