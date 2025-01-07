const hre = require("hardhat");
require('dotenv').config();

async function main() {
    console.log("\n🌍 Fetching ITMO Agreement Details\n");

    // Contract address on XRPL EVM Sidechain
    const contractAddress = "0xcA0FedEC27B23290fFbF926f2585c4d5D5304fc6";

    // ABI of the ITMORegistry contract
    const abi = [
        // ABI for getITMOAgreementDetails function
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "agreementId",
                    "type": "uint256"
                }
            ],
            "name": "getITMOAgreementDetails",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "itmoId",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "projectName",
                    "type": "string"
                },
                {
                    "internalType": "enum ITMORegistry.ProjectType",
                    "name": "projectType",
                    "type": "uint8"
                },
                {
                    "internalType": "address",
                    "name": "originatingCountry",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "totalEmissionReduction",
                    "type": "uint256"
                },
                {
                    "internalType": "address[]",
                    "name": "requiredSigners",
                    "type": "address[]"
                },
                {
                    "internalType": "uint256",
                    "name": "signatureCount",
                    "type": "uint256"
                },
                {
                    "internalType": "enum ITMORegistry.AgreementStatus",
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
                    "name": "activatedAt",
                    "type": "uint256"
                },
                {
                    "internalType": "bytes32",
                    "name": "metadataHash",
                    "type": "bytes32"
                },
                {
                    "internalType": "string",
                    "name": "agreementTerms",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "monitoringRequirements",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "validityPeriod",
                    "type": "string"
                },
                {
                    "internalType": "address[]",
                    "name": "involvedParties",
                    "type": "address[]"
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

    // Specify the agreement ID you want to query
    const agreementId = 0; // Replace with the actual agreement ID

    // Fetch agreement details
    console.log(`Fetching details for Agreement ID: ${agreementId}...`);
    const agreementDetails = await contract.getITMOAgreementDetails(agreementId);

    // Log the agreement details
    console.log("\n📊 Agreement Details:");
    console.log(`ITMO ID: ${agreementDetails.itmoId}`);
    console.log(`Project Name: ${agreementDetails.projectName}`);
    console.log(`Project Type: ${agreementDetails.projectType}`);
    console.log(`Originating Country: ${agreementDetails.originatingCountry}`);
    console.log(`Total Emission Reduction: ${agreementDetails.totalEmissionReduction}`);
    console.log(`Required Signers: ${agreementDetails.requiredSigners.join(", ")}`);
    console.log(`Signature Count: ${agreementDetails.signatureCount}`);
    console.log(`Status: ${agreementDetails.status}`);
    console.log(`Created At: ${new Date(Number(agreementDetails.createdAt) * 1000).toLocaleString()}`);
    console.log(`Activated At: ${new Date(Number(agreementDetails.activatedAt) * 1000).toLocaleString()}`);
    console.log(`Metadata Hash: ${agreementDetails.metadataHash}`);
    console.log(`Agreement Terms: ${agreementDetails.agreementTerms}`);
    console.log(`Monitoring Requirements: ${agreementDetails.monitoringRequirements}`);
    console.log(`Validity Period: ${agreementDetails.validityPeriod}`);
    console.log(`Involved Parties: ${agreementDetails.involvedParties.join(", ")}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("\n❌ Error fetching agreement details:", error);
        process.exit(1);
    });