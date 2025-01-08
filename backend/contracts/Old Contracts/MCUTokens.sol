// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MCUProjectRegistry
 * @dev Manages MCU (Mitigation Contribution Units) tokens for carbon emission reduction projects
 * Each MCU token represents 1000 tCO2e of verified emission reduction
 */
contract MCUProjectRegistry is ERC1155, AccessControl, Pausable {
    using Counters for Counters.Counter;
    
    // Roles
    bytes32 public constant UNFCCC_ROLE = keccak256("UNFCCC_ROLE");
    bytes32 public constant COUNTRY_ROLE = keccak256("COUNTRY_ROLE");
    
    // Conversion constant: 1 MCU = 1000 tCO2e
    uint256 public constant CARBON_UNITS_PER_TOKEN = 1000;

    // Enhanced Project Structure
    struct EmissionData {
        uint256 totalEmissionReduction;
        uint256 baselineEmissions;
        uint256 verifiedReductions;    // Amount of verified reductions so far
        string emissionUnit;           // Usually "tCO2e"
        bool isVerified;              // Verification status
    }

    struct ProjectRegistry {
        string registrySystem;         // e.g., "BlockchainPlatformXYZ"
        string hostCountryRegistry;    // e.g., "Registry ABC"
        bool isActive;
    }

    struct Project {
        // Basic Info
        string projectId;            // Unique project identifier
        string projectName;          // Name of the project
        string description;          // Project description
        
        // Ownership & Type
        address countryOwner;        // Country that owns the project
        ProjectType projectType;     // Type of mitigation project
        
        // Registry Info
        ProjectRegistry registry;    // Registry information
        
        // Emissions & Verification
        EmissionData emissionData;   // Emission reduction details
        
        // Token Info
        uint256 tokensMinted;        // Number of MCU tokens minted
        
        // Status Info
        ProjectStatus status;        // Current project status
        uint256 createdAt;          // Project submission timestamp
        uint256 validatedAt;        // Last validation timestamp
        bool exists;                // Project existence flag
        
        // Additional Info
        string[] documents;         // Array of document hashes/URIs
        mapping(string => string) additionalData; // Flexible additional data storage
    }

    // Define ProjectView struct to return project details
    struct ProjectView {
        string projectId;
        string projectName;
        string description;
        address countryOwner;
        ProjectType projectType;
        ProjectRegistry registry;
        EmissionData emissionData;
        uint256 tokensMinted;
        ProjectStatus status;
        uint256 createdAt;
        uint256 validatedAt;
        string[] documents;
    }

    // Project Type Enumeration
    enum ProjectType {
        RenewableEnergy,
        EnergyEfficiency,
        Forestry,
        Transportation,
        WasteManagement,
        Other
    }

    // Project Status
    enum ProjectStatus {
        Pending,
        Validated,
        Active,
        Suspended
    }

    // State Variables
    Counters.Counter private _projectIds;
    mapping(uint256 => Project) public projects;
    mapping(address => uint256[]) public countryProjects;

    // Token Ownership History
    struct TokenHistory {
        address from;       // Address of the sender
        address to;         // Address of the recipient
        uint256 amount;     // Amount of tokens transferred
        uint256 timestamp;  // Timestamp of the transfer
    }

    mapping(uint256 => TokenHistory[]) public tokenHistory; // Token ID => Ownership history

    // Events
    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed countryOwner,
        string projectIdentifier, // Renamed to avoid duplicate parameter name
        string projectName,
        ProjectType projectType
    );

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

    event EmissionDataUpdated(
        uint256 indexed projectId,
        uint256 totalEmissionReduction,
        uint256 verifiedReductions,
        uint256 tokensMinted
    );

    event TokenTransfer(
        uint256 indexed projectId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Constructor
     * @param uri_ Base URI for token metadata
     */
    constructor(string memory uri_) ERC1155(uri_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNFCCC_ROLE, msg.sender);
    }

    /**
     * @dev Register a new carbon reduction project
     * @param projectId Unique project identifier
     * @param projectName Name of the project
     * @param description Project description
     * @param projectType Type of the carbon reduction project
     * @param registrySystem Registry system
     * @param hostCountryRegistry Host country registry
     * @param emissionData Emission data
     */
    function registerProject(
        string calldata projectId,
        string calldata projectName,
        string calldata description,
        ProjectType projectType,
        string calldata registrySystem,
        string calldata hostCountryRegistry,
        EmissionData calldata emissionData
    ) 
        external
        onlyRole(COUNTRY_ROLE)
        whenNotPaused
        returns (uint256)
    {
        require(bytes(projectId).length > 0, "Invalid project identifier");
        require(bytes(projectName).length > 0, "Invalid project name");
        require(bytes(registrySystem).length > 0, "Invalid registry system");
        require(emissionData.baselineEmissions > 0, "Invalid baseline emissions");
        
        uint256 newProjectId = _projectIds.current();
        _projectIds.increment();

        Project storage project = projects[newProjectId];
        
        // Set basic info
        project.projectId = projectId;
        project.projectName = projectName;
        project.description = description;
        project.countryOwner = msg.sender;
        project.projectType = projectType;
        
        // Set registry info
        project.registry.registrySystem = registrySystem;
        project.registry.hostCountryRegistry = hostCountryRegistry;
        project.registry.isActive = true;
        
        // Set emission data
        project.emissionData = emissionData;
        
        // Set status info
        project.status = ProjectStatus.Pending;
        project.createdAt = block.timestamp;
        project.exists = true;

        countryProjects[msg.sender].push(newProjectId);

        emit ProjectRegistered(
            newProjectId,
            msg.sender,
            projectId, // projectIdentifier
            projectName,
            projectType
        );

        return newProjectId;
    }

    /**
     * @dev Validate carbon reduction and mint corresponding MCU tokens
     * @param projectId ID of the project
     * @param carbonReduction Verified carbon reduction in tCO2e
     */
    function validateAndMintTokens(
        uint256 projectId,
        uint256 carbonReduction
    )
        external
        onlyRole(UNFCCC_ROLE)
        whenNotPaused
    {
        require(projects[projectId].exists, "Project does not exist");
        require(carbonReduction > 0, "Invalid carbon reduction amount");

        Project storage project = projects[projectId];
        require(project.status != ProjectStatus.Suspended, "Project is suspended");

        // Calculate number of tokens to mint (1 token per 1000 tCO2e)
        uint256 tokensToMint = carbonReduction / CARBON_UNITS_PER_TOKEN;
        require(tokensToMint > 0, "Insufficient carbon reduction for token minting");

        // Update project data
        project.emissionData.totalEmissionReduction += carbonReduction;
        project.emissionData.verifiedReductions += carbonReduction;
        project.tokensMinted += tokensToMint;
        project.status = ProjectStatus.Active;
        project.validatedAt = block.timestamp;

        // Mint tokens to country
        _mint(project.countryOwner, projectId, tokensToMint, "");

        emit CarbonReductionValidated(projectId, carbonReduction, tokensToMint);
        emit TokensMinted(projectId, project.countryOwner, tokensToMint);
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
    ) external onlyRole(COUNTRY_ROLE) whenNotPaused {
        require(projects[projectId].exists, "Project does not exist");
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
     * @dev Get the total tokens minted for a country across all projects
     * @param country Address of the country
     */
    function getTotalTokensMinted(address country) external view returns (uint256) {
        uint256[] memory projectIds = countryProjects[country];
        uint256 totalTokens = 0;

        for (uint256 i = 0; i < projectIds.length; i++) {
            totalTokens += projects[projectIds[i]].tokensMinted;
        }

        return totalTokens;
    }

    /**
     * @dev Get the ownership history for a specific project
     * @param projectId ID of the project
     */
    function getTokenHistory(uint256 projectId) external view returns (TokenHistory[] memory) {
        return tokenHistory[projectId];
    }

    /**
     * @dev Get project details
     * @param projectId ID of the project
     */
    function getProject(uint256 projectId) 
        external 
        view 
        returns (ProjectView memory) 
    {
        require(projects[projectId].exists, "Project does not exist");
        Project storage project = projects[projectId];

        // Create a ProjectView struct to return the project details
        return ProjectView({
            projectId: project.projectId,
            projectName: project.projectName,
            description: project.description,
            countryOwner: project.countryOwner,
            projectType: project.projectType,
            registry: project.registry,
            emissionData: project.emissionData,
            tokensMinted: project.tokensMinted,
            status: project.status,
            createdAt: project.createdAt,
            validatedAt: project.validatedAt,
            documents: project.documents
        });
    }


    /**
     * @dev Get all projects owned by a country
     * @param country Address of the country
     */
    function getCountryProjects(address country)
        external
        view
        returns (uint256[] memory)
    {
        return countryProjects[country];
    }

    /**
     * @dev Calculate remaining potential tokens for a project
     * @param projectId ID of the project
     * @param newCarbonReduction Additional carbon reduction to validate
     */
    function calculatePotentialTokens(
        uint256 projectId,
        uint256 newCarbonReduction
    )
        external
        view
        returns (uint256)
    {
        require(projects[projectId].exists, "Project does not exist");
        return newCarbonReduction / CARBON_UNITS_PER_TOKEN;
    }

    function setProjectData(
        uint256 projectId,
        string calldata key,
        string calldata value
    )
        external
        onlyRole(UNFCCC_ROLE)
        whenNotPaused
    {
        require(projects[projectId].exists, "Project does not exist");
        Project storage project = projects[projectId];
        project.additionalData[key] = value;
    }

    function updateProjectStatus(
        uint256 projectId,
        ProjectStatus newStatus
    )
        external
        onlyRole(UNFCCC_ROLE)
        whenNotPaused
    {
        require(projects[projectId].exists, "Project does not exist");
        Project storage project = projects[projectId];
        project.status = newStatus;
    }

    // Admin functions

    function pause() external onlyRole(UNFCCC_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(UNFCCC_ROLE) {
        _unpause();
    }

    /**
     * @dev Suspend a project
     * @param projectId ID of the project to suspend
     */
    function suspendProject(uint256 projectId)
        external
        onlyRole(UNFCCC_ROLE)
    {
        require(projects[projectId].exists, "Project does not exist");
        projects[projectId].status = ProjectStatus.Suspended;
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function getProjectDetails(uint256 projectId)
        external
        view
        returns (
            string memory projectName,
            string memory description,
            address countryOwner,
            ProjectType projectType,
            ProjectRegistry memory registry,
            EmissionData memory emissionData,
            uint256 tokensMinted,
            ProjectStatus status,
            uint256 createdAt,
            uint256 validatedAt
        )
    {
        require(projects[projectId].exists, "Project does not exist");
        Project storage project = projects[projectId];
        
        return (
            project.projectName,
            project.description,
            project.countryOwner,
            project.projectType,
            project.registry,
            project.emissionData,
            project.tokensMinted,
            project.status,
            project.createdAt,
            project.validatedAt
        );
    }

    function updateEmissionData(
        uint256 projectId,
        EmissionData calldata newEmissionData
    )
        external
        onlyRole(UNFCCC_ROLE)
        whenNotPaused
    {
        require(projects[projectId].exists, "Project does not exist");
        Project storage project = projects[projectId];
        
        // Update emission data
        project.emissionData = newEmissionData;
        
        // Calculate and mint tokens if verified
        if (newEmissionData.isVerified && 
            newEmissionData.verifiedReductions >= CARBON_UNITS_PER_TOKEN) {
            uint256 newTokens = newEmissionData.verifiedReductions / CARBON_UNITS_PER_TOKEN;
            _mint(project.countryOwner, projectId, newTokens, "");
            project.tokensMinted += newTokens;
            
            emit EmissionDataUpdated(
                projectId,
                newEmissionData.totalEmissionReduction,
                newEmissionData.verifiedReductions,
                newTokens
            );
        }
    }
}