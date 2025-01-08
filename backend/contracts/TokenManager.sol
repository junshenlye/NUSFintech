// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./ProjectManager.sol"; // Import ProjectManager

contract TokenManager is ERC1155, ProjectManager { // Inherit from ProjectManager
    // Conversion constant: 1 MCU = 1000 tCO2e
    uint256 public constant CARBON_UNITS_PER_TOKEN = 1000;

    // Token ownership history
    struct TokenHistory {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
    }


    mapping(uint256 => TokenHistory[]) public tokenHistory; // Token ID => Ownership history

    // Tracking Retired Tokens
    struct RetirementRecord {
    uint256 projectId;
    uint256 amount;
    uint256 timestamp;
    string reason;
    bool isRetired;
    }
    
    // Mapping to track retired tokens 
    mapping(address => mapping(uint256 => RetirementRecord[])) public retirementRecords;

    // Events
    event CarbonReductionValidated(
        uint256 indexed projectId,
        uint256 carbonReduction,
        uint256 tokensMinted
    );

    event TokensMinted(
        uint256 indexed projectId,
        address indexed countryOwner,
        uint256 amount
    );

    event TokenTransfer(
        uint256 indexed projectId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event TokensRetired(
        address indexed owner,
        uint256 indexed projectId, 
        uint256 amount,
        string reason,
        uint256 timestamp
    );

    constructor(string memory uri_) ERC1155(uri_) {}

    /**
     * @dev Validate carbon reduction and mint corresponding MCU tokens
     * @param projectId ID of the project
     * @param carbonReduction Verified carbon reduction in tCO2e
     */
    function validateAndMintTokens(
        uint256 projectId,
        uint256 carbonReduction
    ) public virtual onlyRole(UNFCCC_ROLE) {
        require(carbonReduction > 0, "Invalid carbon reduction amount");

        // Calculate number of tokens to mint (1 token per 1000 tCO2e)
        uint256 tokensToMint = carbonReduction / CARBON_UNITS_PER_TOKEN;
        require(tokensToMint > 0, "Insufficient carbon reduction for token minting");

        // Mint tokens to the country owner
        address countryOwner = getCountryOwner(projectId);
        _mint(countryOwner, projectId, tokensToMint, "");

        // Update the tokensMinted field in the Project struct
        Project storage project = projects[projectId]; // Access the Project struct
        project.tokensMinted += tokensToMint; // Update tokensMinted

        emit CarbonReductionValidated(projectId, carbonReduction, tokensToMint);
        emit TokensMinted(projectId, countryOwner, tokensToMint);
    }

    /**
     * @dev Transfer tokens from one address to another
     * @param from Address of the sender
     * @param to Address of the recipient
     * @param projectId ID of the project (token ID)
     * @param amount Number of tokens to transfer
     */
    function transferTokens(
        address from,
        address to,
        uint256 projectId,
        uint256 amount
    ) public virtual onlyRole(COUNTRY_ROLE) {
        require(from != address(0), "Invalid sender address");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        // Check if the sender has enough tokens
        uint256 senderBalance = balanceOf(from, projectId);
        require(senderBalance >= amount, "Insufficient token balance");

        // Transfer tokens
        _safeTransferFrom(from, to, projectId, amount, "");

        // Log the transfer in the token history
        tokenHistory[projectId].push(TokenHistory({
            from: from,
            to: to,
            amount: amount,
            timestamp: block.timestamp
        }));

        // Emit a custom event
        emit TokenTransfer(projectId, from, to, amount, block.timestamp);
    }

    /**
     * @dev Get the ownership history for a specific project
     * @param projectId ID of the project
     */
    function getTokenHistory(uint256 projectId) external view returns (TokenHistory[] memory) {
        return tokenHistory[projectId];
    }

    /**
     * @dev Get the total tokens minted for a country across all projects
     * @param country Address of the country
     */
    function getTotalTokensMinted(address country) external view returns (uint256) {
        uint256[] memory projectIds = getCountryProjectIds(country); // This function will be implemented in MCURegistry
        uint256 totalTokens = 0;

        for (uint256 i = 0; i < projectIds.length; i++) {
            totalTokens += balanceOf(country, projectIds[i]);
        }

        return totalTokens;
    }

    /**
     * @dev Override supportsInterface to handle multiple inheritance
     * @param interfaceId The interface identifier, as specified in ERC-165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Helper functions to be implemented in MCURegistry
    function getCountryOwner(uint256) internal view virtual returns (address) {
        // This function will be implemented in MCURegistry
        return address(0);
    }

    function getCountryProjectIds(address) internal view virtual returns (uint256[] memory) {
        // This function will be implemented in MCURegistry
        return new uint256[](0);
    }
    /**
    * @dev Retire tokens from circulation (mark as used)
    * @param projectId ID of the project
    * @param amount Amount of tokens to retire
    * @param reason Reason for retirement (e.g., "NDC commitment", "Voluntary cancellation")
    */
    function retireTokens(
        uint256 projectId,
        uint256 amount,
        string memory reason
    ) public onlyRole(COUNTRY_ROLE) {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender, projectId) >= amount, "Insufficient balance");

        // Create retirement record
        RetirementRecord memory record = RetirementRecord({
            projectId: projectId,
            amount: amount,
            timestamp: block.timestamp,
            reason: reason,
            isRetired: true
        });

        // Store retirement record
        retirementRecords[msg.sender][projectId].push(record);

        // Lock tokens (transfer to a designated retirement address)
        address retirementAddress = address(0x1); // Special address for retired tokens
        _safeTransferFrom(msg.sender, retirementAddress, projectId, amount, "");

        emit TokensRetired(msg.sender, projectId, amount, reason, block.timestamp);
    }

    /**
    * @dev Get retirement records for a specific project and owner
    * @param owner Address of the token owner
    * @param projectId ID of the project
    */
    function getRetirementRecords(address owner, uint256 projectId) 
        external 
        view 
        returns (RetirementRecord[] memory) 
    {
        return retirementRecords[owner][projectId];
    }
}