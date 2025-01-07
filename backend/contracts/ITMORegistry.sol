// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ITMORegistry
 * @dev Manages ITMO agreements between countries under UNFCCC supervision
 * @notice This contract only handles the agreement registration and verification,
 * not the actual trading of ITMOs
 */
contract ITMORegistry is AccessControl, Pausable, ReentrancyGuard {
    // Roles
    bytes32 public constant UNFCCC_ROLE = keccak256("UNFCCC_ROLE");
    bytes32 public constant COUNTRY_ROLE = keccak256("COUNTRY_ROLE");

    // ITMO Agreement Status
    enum AgreementStatus {
        NonExistent,
        Initialized,
        SignaturePending,
        AllSignaturesCollected,
        Active,
        Terminated
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

    // Emission Reduction Details
    struct EmissionReductions {
        uint256 totalEmissionReduction;
        uint256 baselineEmissions;
        string mitigationActivityDescription;
    }

    // ITMO Agreement Structure
    struct ITMOAgreement {
        string projectName;             // Name of the project
        string itmoId;                  // Unique ITMO identifier
        ProjectType projectType;        // Type of the project
        address originatingCountry;     // Address of the originating country
        string hostCountryRegistry;     // Host country registry (optional)
        EmissionReductions emissionReductions; // Emission reduction details
        address[] requiredSigners;      // List of countries that need to sign
        mapping(address => bool) hasSigned;  // Track which countries have signed
        uint256 signatureCount;         // Number of signatures collected
        AgreementStatus status;         // Current status of agreement
        uint256 createdAt;              // Timestamp when agreement was created
        uint256 activatedAt;            // Timestamp when agreement was activated
        bytes32 metadataHash;           // Hash of additional metadata (stored off-chain)
        string agreementTerms;          // Terms of the agreement (e.g., transfer amount, price)
        string monitoringRequirements;  // Monitoring and reporting requirements
        string validityPeriod;          // Validity period of the agreement
        address[] involvedParties;      // Additional parties involved (e.g., observers)
    }

    // Storage
    mapping(uint256 => ITMOAgreement) public agreements;
    uint256 public nextAgreementId;

    // Events
    event ITMOAgreementInitialized(
        uint256 indexed agreementId,
        string itmoId,
        string projectName,
        address originatingCountry,
        uint256 totalEmissionReduction
    );
    event AgreementSigned(uint256 indexed agreementId, address indexed signer);
    event AllSignaturesCollected(uint256 indexed agreementId);
    event AgreementActivated(uint256 indexed agreementId);
    event CountryRegistered(address indexed country);

    /**
     * @dev Constructor that gives msg.sender all the default admin role
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNFCCC_ROLE, msg.sender);
    }

    /**
     * @dev Initialize a new ITMO agreement
     * @param itmoId Unique identifier for the ITMO
     * @param projectName Name of the project
     * @param projectType Type of the project
     * @param originatingCountry Address of the originating country
     * @param requiredSigners Array of country addresses required to sign
     * @param emissionData Emission reduction details
     * @param metadataHash Hash of additional metadata stored off-chain
     * @param agreementTerms Terms of the agreement (e.g., transfer amount, price)
     * @param monitoringRequirements Monitoring and reporting requirements
     * @param validityPeriod Validity period of the agreement
     * @param involvedParties Additional parties involved (e.g., observers)
     */
    function initializeITMOAgreement(
        string calldata itmoId,
        string calldata projectName,
        ProjectType projectType,
        address originatingCountry,
        address[] calldata requiredSigners,
        EmissionReductions calldata emissionData,
        bytes32 metadataHash,
        string calldata agreementTerms,
        string calldata monitoringRequirements,
        string calldata validityPeriod,
        address[] calldata involvedParties
    ) 
        external 
        onlyRole(UNFCCC_ROLE)
        whenNotPaused 
        returns (uint256)
    {
        require(bytes(itmoId).length > 0, "Invalid ITMO ID");
        require(bytes(projectName).length > 0, "Invalid project name");
        require(requiredSigners.length >= 2, "Minimum two signers required");
        require(emissionData.totalEmissionReduction > 0, "Invalid emission reduction");
        require(metadataHash != bytes32(0), "Invalid metadata hash");

        uint256 agreementId = nextAgreementId++;
        ITMOAgreement storage agreement = agreements[agreementId];

        // Initialize agreement
        agreement.itmoId = itmoId;
        agreement.projectName = projectName;
        agreement.projectType = projectType;
        agreement.originatingCountry = originatingCountry;
        agreement.requiredSigners = requiredSigners;
        agreement.emissionReductions = emissionData;
        agreement.status = AgreementStatus.SignaturePending;
        agreement.createdAt = block.timestamp;
        agreement.metadataHash = metadataHash;
        agreement.agreementTerms = agreementTerms;
        agreement.monitoringRequirements = monitoringRequirements;
        agreement.validityPeriod = validityPeriod;
        agreement.involvedParties = involvedParties;

        // Verify all signers are registered countries
        for (uint i = 0; i < requiredSigners.length; i++) {
            require(
                hasRole(COUNTRY_ROLE, requiredSigners[i]), 
                "Invalid signer address"
            );
        }

        emit ITMOAgreementInitialized(
            agreementId,
            itmoId,
            projectName,
            originatingCountry,
            emissionData.totalEmissionReduction
        );
        return agreementId;
    }

    /**
     * @dev Register a new country
     * @param country Address of the country to register
     */
    function registerCountry(address country) 
        external 
        onlyRole(UNFCCC_ROLE) 
        whenNotPaused
    {
        require(country != address(0), "Invalid country address");
        require(!hasRole(COUNTRY_ROLE, country), "Country already registered");
        
        _grantRole(COUNTRY_ROLE, country);
        emit CountryRegistered(country);
    }

    /**
     * @dev Check if a country has signed an agreement
     */
    function hasSignedAgreement(uint256 agreementId, address country) 
        external 
        view 
        returns (bool) 
    {
        return agreements[agreementId].hasSigned[country];
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(UNFCCC_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(UNFCCC_ROLE) {
        _unpause();
    }

    /**
     * @dev Sign an agreement
     * @param agreementId ID of the agreement to sign
     */
    function signAgreement(uint256 agreementId) 
        external 
        onlyRole(COUNTRY_ROLE)
        whenNotPaused 
    {
        ITMOAgreement storage agreement = agreements[agreementId];
        require(
            agreement.status == AgreementStatus.SignaturePending,
            "Agreement not in signing phase"
        );

        bool isRequiredSigner = false;
        for (uint i = 0; i < agreement.requiredSigners.length; i++) {
            if (agreement.requiredSigners[i] == msg.sender) {
                isRequiredSigner = true;
                break;
            }
        }
        require(isRequiredSigner, "Not authorized to sign");
        require(!agreement.hasSigned[msg.sender], "Already signed");

        agreement.hasSigned[msg.sender] = true;
        agreement.signatureCount++;

        emit AgreementSigned(agreementId, msg.sender);

        if (agreement.signatureCount == agreement.requiredSigners.length) {
            agreement.status = AgreementStatus.AllSignaturesCollected;
            emit AllSignaturesCollected(agreementId);
        }
    }

    /**
     * @dev Activate an agreement after all signatures are collected
     * @param agreementId ID of the agreement to activate
     */
    function activateAgreement(uint256 agreementId) 
        external 
        onlyRole(UNFCCC_ROLE)
        whenNotPaused 
    {
        ITMOAgreement storage agreement = agreements[agreementId];
        require(
            agreement.status == AgreementStatus.AllSignaturesCollected,
            "Not ready for activation"
        );

        agreement.status = AgreementStatus.Active;
        agreement.activatedAt = block.timestamp;

        emit AgreementActivated(agreementId);
    }

    /**
     * @dev Get detailed ITMO agreement information
     * @param agreementId ID of the agreement
     */
    function getITMOAgreementDetails(uint256 agreementId) 
        external 
        view 
        returns (
            string memory itmoId,
            string memory projectName,
            ProjectType projectType,
            address originatingCountry,
            uint256 totalEmissionReduction,
            address[] memory requiredSigners,
            uint256 signatureCount,
            AgreementStatus status,
            uint256 createdAt,
            uint256 activatedAt,
            bytes32 metadataHash,
            string memory agreementTerms,
            string memory monitoringRequirements,
            string memory validityPeriod,
            address[] memory involvedParties
        )
    {
        ITMOAgreement storage agreement = agreements[agreementId];
        return (
            agreement.itmoId,
            agreement.projectName,
            agreement.projectType,
            agreement.originatingCountry,
            agreement.emissionReductions.totalEmissionReduction,
            agreement.requiredSigners,
            agreement.signatureCount,
            agreement.status,
            agreement.createdAt,
            agreement.activatedAt,
            agreement.metadataHash,
            agreement.agreementTerms,
            agreement.monitoringRequirements,
            agreement.validityPeriod,
            agreement.involvedParties
        );
    }
}