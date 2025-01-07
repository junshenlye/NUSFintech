const hre = require("hardhat");
require('dotenv').config();

const TRADE_MANAGER_ABI = [
    "function executeTrade(uint256 agreementId, uint256[] calldata projectIds, uint256[] calldata amounts) external payable",
    "function validateSellerBalance(address seller, uint256[] calldata projectIds, uint256 totalAmount) external view returns (bool)"
];

const ITMO_ABI = [
    "function getAgreementDetails(uint256 agreementId) view returns (uint256, address, address, uint256, uint256, string, uint8, uint8, uint256, uint256, uint256, string)"
];

const MCU_ABI = [
    "function balanceOf(address account, uint256 id) view returns (uint256)"
];

async function main() {
    console.log("\n🌍 ITMO Direct Trade Test\n");

    // Setup accounts
    const provider = new hre.ethers.JsonRpcProvider("https://rpc-evm-sidechain.xrpl.org");
    const countryA = new hre.ethers.Wallet(process.env.Country_A_Private_Key, provider);
    const countryB = new hre.ethers.Wallet(process.env.Country_B_Private_Key, provider);

    console.log("Trading Parties:");
    console.log(`Country A (Seller): ${countryA.address}`);
    console.log(`Country B (Buyer): ${countryB.address}`);

    try {
        // Contract addresses
        const itmoRegistryAddress = "0xDc8a5ee9d4B23Edf701581A577668A6cF205a2c7";
        const mcuRegistryAddress = "0xdf3117fE0daA4CC09B8181AbB3eDC35cB179c42C";
        const tradeManagerAddress = "0x26B6ddf80c7aEb4A2F104272F906f45bf02f2428";

        // Create contract instances
        const itmoRegistry = new hre.ethers.Contract(itmoRegistryAddress, ITMO_ABI, provider);
        const mcuRegistry = new hre.ethers.Contract(mcuRegistryAddress, MCU_ABI, provider);
        const tradeManager = new hre.ethers.Contract(tradeManagerAddress, TRADE_MANAGER_ABI, countryB);

        // Setup trade parameters
        const agreementId = 1736263379355;
        const projectIds = [5];
        const mcuAmounts = [20];

        // Get initial XRP balances
        console.log("\n💰 Initial XRP Balances:");
        const initialSellerXRP = await provider.getBalance(countryA.address);
        const initialBuyerXRP = await provider.getBalance(countryB.address);
        console.log(`Country A: ${hre.ethers.formatEther(initialSellerXRP)} XRP`);
        console.log(`Country B: ${hre.ethers.formatEther(initialBuyerXRP)} XRP`);

        // Get initial MCU balances
        console.log("\n💰 Initial MCU Balances:");
        const initialSellerBalance = await mcuRegistry.balanceOf(countryA.address, projectIds[0]);
        const initialBuyerBalance = await mcuRegistry.balanceOf(countryB.address, projectIds[0]);
        console.log(`Country A (Project ${projectIds[0]}): ${initialSellerBalance} MCUs`);
        console.log(`Country B (Project ${projectIds[0]}): ${initialBuyerBalance} MCUs`);

        // Get agreement details and calculate payment
        console.log("\n📄 Fetching Agreement Details...");
        const agreement = await itmoRegistry.getAgreementDetails(agreementId);
        const mcuAmount = agreement[3];
        const pricePerMCU = agreement[4];
        const paymentAmount = mcuAmount * pricePerMCU;

        console.log("\n💫 Trade Parameters:");
        console.log(`MCU Amount: ${mcuAmount} MCUs`);
        console.log(`Price per MCU: ${hre.ethers.formatEther(pricePerMCU)} XRP`);
        console.log(`Total Payment: ${hre.ethers.formatEther(paymentAmount)} XRP`);

        // Execute trade as buyer
        console.log("\n🔄 Executing Trade...");
        const tradeTx = await tradeManager.executeTrade(
            agreementId,
            projectIds,
            mcuAmounts,
            { value: paymentAmount }
        );
        const receipt = await tradeTx.wait();
        console.log("Trade executed successfully!");
        console.log("Transaction Hash:", receipt.hash);

        // Get final XRP balances
        console.log("\n💰 Final XRP Balances:");
        const finalSellerXRP = await provider.getBalance(countryA.address);
        const finalBuyerXRP = await provider.getBalance(countryB.address);
        console.log(`Country A: ${hre.ethers.formatEther(finalSellerXRP)} XRP`);
        console.log(`Country B: ${hre.ethers.formatEther(finalBuyerXRP)} XRP`);

        // Get final MCU balances
        console.log("\n💰 Final MCU Balances:");
        const finalSellerBalance = await mcuRegistry.balanceOf(countryA.address, projectIds[0]);
        const finalBuyerBalance = await mcuRegistry.balanceOf(countryB.address, projectIds[0]);
        console.log(`Country A (Project ${projectIds[0]}): ${finalSellerBalance} MCUs`);
        console.log(`Country B (Project ${projectIds[0]}): ${finalBuyerBalance} MCUs`);

        // Log all balance changes
        console.log("\n📈 Balance Changes Summary:");
        console.log("XRP Changes:");
        console.log(`Country A: ${hre.ethers.formatEther(finalSellerXRP - initialSellerXRP)} XRP`);
        console.log(`Country B: ${hre.ethers.formatEther(finalBuyerXRP - initialBuyerXRP)} XRP`);
        console.log("\nMCU Changes:");
        console.log(`Country A: ${finalSellerBalance - initialSellerBalance} MCUs`);
        console.log(`Country B: ${finalBuyerBalance - initialBuyerBalance} MCUs`);

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