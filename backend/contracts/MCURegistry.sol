// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProjectManager.sol";
import "./TokenManager.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract MCURegistry is ProjectManager, TokenManager, Pausable {
    constructor(string memory uri_) TokenManager(uri_) {}

    /**
     * @dev Override getCountryOwner to fetch the country owner from ProjectManager
     * @param projectId ID of the project
     */
    function getCountryOwner(uint256 projectId) internal view override returns (address) {
        require(projects[projectId].exists, "Project does not exist");
        return projects[projectId].countryOwner;
    }

    /**
     * @dev Override getCountryProjectIds to fetch project IDs for a country from ProjectManager
     * @param country Address of the country
     */
    function getCountryProjectIds(address country) internal view override returns (uint256[] memory) {
        return countryProjects[country];
    }

    /**
     * @dev Register a new carbon reduction project (overridden to add pausable functionality)
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
    ) public override onlyRole(COUNTRY_ROLE) whenNotPaused returns (uint256) {
        return super.registerProject(
            projectId,
            projectName,
            description,
            projectType,
            registrySystem,
            hostCountryRegistry,
            emissionData
        );
    }

    /**
     * @dev Validate carbon reduction and mint corresponding MCU tokens (overridden to add pausable functionality)
     * @param projectId ID of the project
     * @param carbonReduction Verified carbon reduction in tCO2e
     */
    function validateAndMintTokens(
        uint256 projectId,
        uint256 carbonReduction
    ) public override onlyRole(UNFCCC_ROLE) whenNotPaused {
        super.validateAndMintTokens(projectId, carbonReduction);
    }

    /**
     * @dev Transfer tokens from one address to another (overridden to add pausable functionality)
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
    ) public override onlyRole(UNFCCC_ROLE) whenNotPaused {
        super.transferTokens(from, to, projectId, amount);
    }

    /**
     * @dev Update project status (overridden to add pausable functionality)
     * @param projectId ID of the project
     * @param newStatus New status to set
     */
    function updateProjectStatus(
        uint256 projectId,
        ProjectStatus newStatus
    ) public override onlyRole(UNFCCC_ROLE) whenNotPaused {
        super.updateProjectStatus(projectId, newStatus);
    }

    /**
     * @dev Suspend a project (overridden to add pausable functionality)
     * @param projectId ID of the project to suspend
     */
    function suspendProject(uint256 projectId) public override onlyRole(UNFCCC_ROLE) whenNotPaused {
        super.suspendProject(projectId);
    }

    /**
     * @dev Pause the contract (only callable by UNFCCC_ROLE)
     */
    function pause() external onlyRole(UNFCCC_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract (only callable by UNFCCC_ROLE)
     */
    function unpause() external onlyRole(UNFCCC_ROLE) {
        _unpause();
    }

    /**
     * @dev Override supportsInterface to handle multiple inheritance
     * @param interfaceId The interface identifier, as specified in ERC-165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(TokenManager, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}