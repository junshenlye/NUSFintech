
# SWI Carbon Credit - Revolutionizing ITMO Trading with Blockchain

SWI Carbon Credit is a cutting-edge Fintech API designed to transform the trading of Internationally Transferred Mitigation Outcomes (ITMOs). By leveraging blockchain technology, it addresses inefficiencies in the current carbon credit market, ensuring transparency, security, and global compliance.

Our mission is to tackle systemic issues in climate change, promote global collaboration, and drive economic growth through sustainable practices. With an emphasis on efficiency and adherence to the Paris Agreement's Article 6 framework, SWI Carbon Credit facilitates the achievement of global carbon reduction goals.

---

## Key Features

- **Transparent Trading System**: A smart contract-based platform ensuring the integrity of ITMO transactions and safeguarding global carbon credit policies.
- **Preservation of Agreements and Tokens**: Secure mechanisms for recording agreements, project details, and tokenizing Mitigation Contribution Units (MCUs) to represent carbon offsets.
- **Automation and Auditing Tools**: Streamlined verification processes with tools for auditing, enabling higher trading volumes and faster ITMO validation.
- **Automated International Transactions**: Seamless agreement execution eliminates middleman costs and expedites cross-border settlements.
- **Burning Token Mechanism**: Prevents double counting and maintains the integrity of MCU supply.

SWI Carbon Credit is more than a platform; it's a step toward global sustainability and compliance with international carbon reduction policies.


# Smart Contracts for Carbon Credit Management

This repository contains Solidity smart contracts designed for managing carbon credit projects, validation, and trading under the United Nations Framework Convention on Climate Change (UNFCCC). The system includes access control, project management, tokenization, and ITMO trade mechanisms.

## Overview

The solution leverages role-based access control, multi-token standards (ERC-1155), and project lifecycle management to facilitate transparent and efficient carbon credit operations.

### Key Contracts

1. [**AccessControlBase**](backend/contracts/AccessControlBase.sol): Implements role-based access control using OpenZeppelin's `AccessControl`.
2. [**ProjectManager**](backendc/ontracts/ProjectManager.sol): Manages carbon credit projects, including registration, emissions tracking, and status updates.
3. [**TokenManager**](backend/contracts/TokenManager.sol): Handles carbon credit tokens (ERC-1155), including minting, transfers, and retirement.
4. [**MCURegistry**](backend/contracts/MCURegistry.sol): Integrates project and token management while adding pausable functionality.
5. [**ITMORegistry**](backend/contracts/ITMORegistry.sol): Manages ITMO agreements between countries.
6. [**ITMOTradeManager**](backend/contracts/ITMOTradeManager.sol): Facilitates trades under ITMO agreements, ensuring secure MCU transfers.

---

## Features

- **Role-Based Access Control**: Secure role assignment and management (`DEFAULT_ADMIN_ROLE`, `UNFCCC_ROLE`, `COUNTRY_ROLE`).
- **ERC-1155 Tokens**: Implements multi-token standards for carbon credits.
- **Project Lifecycle Management**: From registration to validation and activation.
- **ITMO Agreements**: Creation, signing, validation, and execution of inter-country agreements.
- **Secure Trading**: MCU token trading between countries with payment validation.
- **Pausable Operations**: Critical operations can be paused in emergencies.

---

## Contract Structure

### AccessControlBase
- Provides roles for secure access to operations.
- Supports `UNFCCC_ROLE` and `COUNTRY_ROLE`.

### ProjectManager
- Registers and validates carbon credit projects.
- Tracks emissions data and associated documents.

### TokenManager
- Mints and manages carbon credit tokens.
- Tracks ownership history and retired tokens.

### MCURegistry
- Inherit from project and token management.
- Adds pausable functionality for critical operations.

### ITMORegistry
- Manages agreements between countries.
- Tracks lifecycle from initialization to completion.

### ITMOTradeManager
- Executes secure trades under ITMO agreements.
- Validates balances, payments, and agreement terms.

---

## Deployment and Setup

### Prerequisites
- [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/)
- [Hardhat](https://hardhat.org/)
- Ethereum-compatible wallet with testnet/mainnet funds

### Deploy Contracts
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo.git
   cd your-repo
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Deploy contracts using Hardhat:
   ```bash
   npx hardhat run scripts/deploy-contract.js --network <network-name>
   ```

---

## Testing

Run test scripts to validate individual components:
```bash
npx hardhat test/script-name.test.js
```

Available scripts:
- `test/project-registration.test.js`
- `test/project-validation.test.js`
- `test/agreement-validation.test.js`
- `test/validate-trade-execution.test.js`
- `test/retire-tokens.test.js`

---

## Security

- **Access Control**: Role-based restrictions on critical functions.
- **Reentrancy Protection**: Guards against reentrancy attacks using `ReentrancyGuard`.
- **Data Integrity**: Ensures data validation and event logging.

---

## Future Enhancements

- **Proxy Pattern**: Support for upgradable contracts.
- **Multi-Signature Agreements**: Additional parties for enhanced governance.
- **Analytics and Reporting**: Detailed insights into project and trade statuses.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Contributing

We welcome contributions! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

---

# Full Documentation

The full documentation of our code can be seen here: https://tinyurl.com/nus-fintech-CarbonCredit
