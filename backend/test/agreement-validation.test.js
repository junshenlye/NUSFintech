// test/agreement-validation.test.js

const hre = require("hardhat");
const {
    question,
    formatDate,
    getAgreementStatus,
    getPaymentMethod,
    displayBalances,
    isValidAddress,
    rl
} = require('./utils/test-utils');

async function main() {
    console.log("\n🌍 ITMO Agreement Validation Test\n");

    try {
        // Get contract instance
        const itmoRegistryAddress = await question("Enter itmoRegistryAddress: ");//"0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
        const registry = ITMORegistry.attach(itmoRegistryAddress);

        // Get the agreement ID to validate
        const agreementId = parseInt(await question("Enter the Agreement ID to validate: "));

        // Get the agreement details
        const initialDetails = await registry.getAgreementDetails(agreementId);
        console.log("\n📋 Current Agreement Details:");
        console.log(`Status: ${getAgreementStatus(initialDetails[7])}`);
        console.log(`Seller: ${initialDetails[1]}`);
        console.log(`Buyer: ${initialDetails[2]}`);
        console.log(`MCU Amount: ${initialDetails[3].toString()}`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(initialDetails[4])} ${initialDetails[5]}`);

        // Check if agreement exists and is in correct state
        if (getAgreementStatus(initialDetails[7]) === "NonExistent") {
            throw new Error("Agreement does not exist");
        }

        if (getAgreementStatus(initialDetails[7]) === "Active") {
            throw new Error("Agreement is Activated, no more signatures are needed!");
        }

        console.log(registry.hasSignedAgreement(agreementId, initialDetails[1]));
        console.log(registry.hasSignedAgreement(agreementId, initialDetails[2]));

        // Signing Process
        console.log("\n✍️ Agreement Signing Process");
        
        // Check current signatures
        const sellerSigned = await registry.hasSignedAgreement(agreementId, initialDetails[1]);
        const buyerSigned = await registry.hasSignedAgreement(agreementId, initialDetails[2]);
        
        console.log("\nCurrent Signature Status:");
        console.log(`Seller (${initialDetails[1]}): ${sellerSigned ? '✅ Signed' : '❌ Not Signed'}`);
        console.log(`Buyer (${initialDetails[2]}): ${buyerSigned ? '✅ Signed' : '❌ Not Signed'}`);

        // Sign as seller or buyer
        console.log("\nSelect role to sign as:");
        console.log("1: Seller");
        console.log("2: Buyer");
        console.log("3: UNFCCC (for activation)");
        const role = parseInt(await question("Choose role (1-3): "));

        let signerAddress;
        switch(role) {
            case 1: // Seller
                signerAddress = initialDetails[1];
                break;
            case 2: // Buyer
                signerAddress = initialDetails[2];
                break;
            case 3: // UNFCCC
                const [signer] = await hre.ethers.getSigners();
                signerAddress = signer.address;
                const UNFCCC_ROLE = await registry.UNFCCC_ROLE();
                const hasRole = await registry.hasRole(UNFCCC_ROLE, signerAddress);
                if (!hasRole) {
                    throw new Error(`Account ${signerAddress} does not have UNFCCC_ROLE`);
                }
                break;
            default:
                throw new Error("Invalid role selection");
        }

        if (role === 1 || role === 2) {
            // Signing process
            console.log(`\n🔄 Signing as ${role === 1 ? 'Seller' : 'Buyer'}...`);
            
            // Check if already signed
            const alreadySigned = await registry.hasSignedAgreement(agreementId, signerAddress);
            if (alreadySigned) {
                console.log("This party has already signed the agreement.");
            } else {
                // Sign the agreement
                const countryAddress = signerAddress;
                const countryPrivateKey = await question("Enter your private key: ");
                const country = new hre.ethers.Wallet(countryPrivateKey, hre.ethers.provider);
                console.log(country.address.toLowerCase())
                if (country.address.toLowerCase() !== countryAddress.toLowerCase()) {
                    throw new Error("Address and private key do not match");
                }
                const countryRegistry  = registry.connect(country);
                const signTx = await countryRegistry.signAgreement(agreementId);
                console.log("Waiting for signature confirmation...");
                await signTx.wait();
                console.log("✅ Agreement signed successfully");
            }
        } else {
            // UNFCCC Activation process
            // Check if both parties have signed
            if (!sellerSigned || !buyerSigned) {
                throw new Error("Cannot activate: Both parties must sign first");
            }

            console.log("\n🔄 Activating agreement as UNFCCC...");
            const activateTx = await registry.activateAgreement(agreementId);
            console.log("Waiting for activation confirmation...");
            await activateTx.wait();
            console.log("✅ Agreement activated successfully");
        }

        // Get and display final agreement details
        const finalDetails = await registry.getAgreementDetails(agreementId);
        console.log("\n📊 Updated Agreement Details:");
        console.log(`Status: ${getAgreementStatus(finalDetails[7])}`);
        console.log(`Seller Signed: ${await registry.hasSignedAgreement(agreementId, finalDetails[1])}`);
        console.log(`Buyer Signed: ${await registry.hasSignedAgreement(agreementId, finalDetails[2])}`);
        console.log(`Created: ${formatDate(finalDetails[8])}`);
        console.log(`Valid Until: ${formatDate(finalDetails[9])}`);
        console.log(`Transfer Deadline: ${formatDate(finalDetails[10])}`);

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