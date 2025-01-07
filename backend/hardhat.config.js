/**
 * hardhat.config.js
 * Configuration file for the Hardhat Ethereum development environment
 * Sets up networks and compiler settings for the project
 */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // Enable the IR-based compiler to reduce stack depth
    },
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    xrpl_evm_testnet: {
      url: process.env.XRPL_TESTNET_URL || "https://rpc-evm-sidechain.xrpl.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 1440002
    }
  }
};