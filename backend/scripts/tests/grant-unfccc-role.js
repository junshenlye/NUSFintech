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

    // Grant the UNFCCC_ROLE to the Trade Manager contract
    const tx = await tradeManager.grantRole(UNFCCC_ROLE, tradeManagerAddress);
    await tx.wait();

    console.log(`UNFCCC_ROLE granted to Trade Manager contract at ${tradeManagerAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });