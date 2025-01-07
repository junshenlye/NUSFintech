// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControlBase.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ProjectManager is AccessControlBase {
    using Counters for Counters.Counter;

    // Project-related structures and enums
    struct EmissionData {
        uint256 totalEmissionReduction;
        uint256 baselineEmissions;
        uint256 verifiedReductions;
        string emissionUnit;
        bool isVerified;
    }

    struct ProjectRegistry {
        string registrySystem;
        string hostCountryRegistry;
        bool isActive;
    }

    struct Project {
        string projectId;
        string projectName;
        string description;
        address countryOwner;
        ProjectType projectType;
        ProjectRegistry registry;
        EmissionData emissionData;
        uint256 tokensMinted; // Ensure this field exists
        ProjectStatus status;
        uint256 createdAt;
        uint256 validatedAt;
        bool exists;
        string[] documents;
        mapping(string => string) additionalData;
    }

    enum ProjectType {
        RenewableEnergy,
        EnergyEfficiency,
        Forestry,
        Transportation,
        WasteManagement,
        Other
    }

    enum ProjectStatus {
        Pending,
        Validated,
        Active,
        Suspended
    }

    // State variables
    Counters.Counter private _projectIds;
    mapping(uint256 => Project) public projects;
    mapping(address => uint256[]) public countryProjects;

    // Events
    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed countryOwner,
        string projectIdentifier,
        string projectName,
        ProjectType projectType
    );

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
    ) public virtual onlyRole(COUNTRY_ROLE) returns (uint256) {
        require(bytes(projectId).length > 0, "Invalid project identifier");
        require(bytes(projectName).length > 0, "Invalid project name");
        require(bytes(registrySystem).length > 0, "Invalid registry system");
        require(emissionData.baselineEmissions > 0, "Invalid baseline emissions");

        uint256 newProjectId = _projectIds.current();
        _projectIds.increment();

        Project storage project = projects[newProjectId];
        project.projectId = projectId;
        project.projectName = projectName;
        project.description = description;
        project.countryOwner = msg.sender;
        project.projectType = projectType;
        project.registry.registrySystem = registrySystem;
        project.registry.hostCountryRegistry = hostCountryRegistry;
        project.registry.isActive = true;
        project.emissionData = emissionData;
        project.status = ProjectStatus.Pending;
        project.createdAt = block.timestamp;
        project.exists = true;

        countryProjects[msg.sender].push(newProjectId);

        emit ProjectRegistered(newProjectId, msg.sender, projectId, projectName, projectType);

        return newProjectId;
    }

    /**
     * @dev Get project details
     * @param projectId ID of the project
     */
    function getProject(uint256 projectId) external view returns (
        string memory projectIdStr,
        string memory projectName,
        string memory description,
        address countryOwner,
        ProjectType projectType,
        ProjectRegistry memory registry,
        EmissionData memory emissionData,
        uint256 tokensMinted,
        ProjectStatus status,
        uint256 createdAt,
        uint256 validatedAt,
        string[] memory documents
    ) {
        require(projects[projectId].exists, "Project does not exist");
        Project storage project = projects[projectId];

        return (
            project.projectId,
            project.projectName,
            project.description,
            project.countryOwner,
            project.projectType,
            project.registry,
            project.emissionData,
            project.tokensMinted,
            project.status,
            project.createdAt,
            project.validatedAt,
            project.documents
        );
    }

    /**
     * @dev Update project status
     * @param projectId ID of the project
     * @param newStatus New status to set
     */
    function updateProjectStatus(
        uint256 projectId,
        ProjectStatus newStatus
    ) public virtual onlyRole(UNFCCC_ROLE) {
        require(projects[projectId].exists, "Project does not exist");
        projects[projectId].status = newStatus;
    }

    /**
     * @dev Suspend a project
     * @param projectId ID of the project to suspend
     */
    function suspendProject(uint256 projectId) public virtual onlyRole(UNFCCC_ROLE) {
        require(projects[projectId].exists, "Project does not exist");
        projects[projectId].status = ProjectStatus.Suspended;
    }
}