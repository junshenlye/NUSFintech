const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    // Replace with your contract addresses
    const tradeManagerAddress = "0x5ab08A5AF0193Bc54657CF136b0cfE4783Ea3D09";

    // Get the contract instance
    const TradeManager = await hre.ethers.getContractFactory("ITMOTradeManager");
    const tradeManager = TradeManager.attach(tradeManagerAddress);

    // Get the UNFCCC_ROLE
    const UNFCCC_ROLE = await tradeManager.UNFCCC_ROLE();

    // Check if the Trade Manager contract has the UNFCCC_ROLE
    const hasRole = await tradeManager.hasRole(UNFCCC_ROLE, tradeManagerAddress);
    console.log(`Trade Manager has UNFCCC_ROLE: ${hasRole}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });