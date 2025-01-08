// test/itmo-agreement.test.js

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
    console.log("\n🌍 ITMO Agreement Creation Interactive Test\n");

    try {
        // Get contract instances
        const itmoRegistryAddress = "0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const ITMORegistry = await hre.ethers.getContractFactory("ITMORegistry");
        const registry = ITMORegistry.attach(itmoRegistryAddress);

        // Get user input for agreement details
        console.log("📝 Please enter ITMO agreement details:");
        
        const agreementId = parseInt(await question("Agreement ID (numeric): "));
        
        let seller;
        do {
            seller = await question("Seller Country Address: ");
            if (!isValidAddress(seller)) {
                console.log("❌ Invalid address format. Please try again.");
            }
        } while (!isValidAddress(seller));

        let buyer;
        do {
            buyer = await question("Buyer Country Address: ");
            if (!isValidAddress(buyer)) {
                console.log("❌ Invalid address format. Please try again.");
            }
        } while (!isValidAddress(buyer));

        const mcuAmount = parseInt(await question("MCU Amount to Transfer: "));
        const pricePerMCU = parseFloat(await question("Price per MCU (in XRP): "));
        const paymentCurrency = await question("Payment Currency (e.g., XRP): ");

        console.log("\nPayment Methods:");
        console.log("0: Fiat");
        console.log("1: Crypto");
        console.log("2: Mixed");
        const paymentMethod = parseInt(await question("Select Payment Method (0-2): "));

        const validityDays = parseInt(await question("Agreement Validity Period (in days): "));
        const validityPeriod = validityDays * 24 * 60 * 60; // Convert to seconds

        const transferDeadlineDays = parseInt(await question("Transfer Deadline (in days from now): "));
        const transferDeadline = transferDeadlineDays * 24 * 60 * 60; // Convert to seconds

        const correspondingAdjustmentRef = await question("Corresponding Adjustment Reference: ");

        // Display summary before creation
        console.log("\n📋 Agreement Summary:");
        console.log(`Agreement ID: ${agreementId}`);
        console.log(`Seller: ${seller}`);
        console.log(`Buyer: ${buyer}`);
        console.log(`MCU Amount: ${mcuAmount}`);
        console.log(`Price per MCU: ${pricePerMCU} XRP`);
        console.log(`Payment Method: ${getPaymentMethod(paymentMethod)}`);
        console.log(`Validity Period: ${validityDays} days`);
        console.log(`Transfer Deadline: ${transferDeadlineDays} days`);

        const confirm = await question("\nConfirm agreement creation? (yes/no): ");
        if (confirm.toLowerCase() !== 'yes') {
            console.log("Agreement creation cancelled.");
            process.exit(0);
        }

        // Initialize agreement
        console.log("\n📝 Creating ITMO agreement...");
        const initTx = await registry.initializeAgreement(
            agreementId,
            seller,
            buyer,
            mcuAmount,
            hre.ethers.parseEther(pricePerMCU.toString()),
            paymentCurrency,
            paymentMethod,
            validityPeriod,
            transferDeadline,
            correspondingAdjustmentRef
        );

        console.log("Waiting for transaction confirmation...");
        const receipt = await initTx.wait();

        // Get and display agreement details
        const agreement = await registry.getAgreementDetails(agreementId);
        console.log("\n📊 Created Agreement Details:");
        console.log(`Agreement ID: ${agreement[0]}`);
        console.log(`Seller: ${agreement[1]}`);
        console.log(`Buyer: ${agreement[2]}`);
        console.log(`MCU Amount: ${agreement[3].toString()}`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(agreement[4])} XRP`);
        console.log(`Payment Method: ${getPaymentMethod(agreement[6])}`);
        console.log(`Status: ${getAgreementStatus(agreement[7])}`);
        console.log(`Created: ${formatDate(agreement[8])}`);
        console.log(`Valid Until: ${formatDate(agreement[9])}`);

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