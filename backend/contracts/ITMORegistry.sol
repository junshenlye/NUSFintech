// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ITMORegistry
 * @dev Manages ITMO agreements between countries under UNFCCC supervision
 */
contract ITMORegistry is AccessControl, Pausable, ReentrancyGuard {
    // Roles
    bytes32 public constant UNFCCC_ROLE = keccak256("UNFCCC_ROLE");
    bytes32 public constant COUNTRY_ROLE = keccak256("COUNTRY_ROLE");

    // Agreement Status
    enum AgreementStatus {
        NonExistent,
        Initialized,
        SignaturePending,
        AllSignaturesCollected,
        Active,
        Terminated
    }

    // Agreement Structure
    struct Agreement {
        bytes32 agreementHash;          // Hash of the off-chain agreement
        address[] requiredSigners;      // List of countries that need to sign
        mapping(address => bool) hasSigned;  // Track which countries have signed
        uint256 signatureCount;         // Number of signatures collected
        AgreementStatus status;         // Current status of agreement
        uint256 createdAt;             // Timestamp when agreement was created
        uint256 activatedAt;           // Timestamp when agreement was activated
    }

    // Storage
    mapping(uint256 => Agreement) public agreements;
    uint256 public nextAgreementId;

    // Events
    event AgreementInitialized(uint256 indexed agreementId, bytes32 agreementHash, address[] requiredSigners);
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
     * @dev Register a new country
     * @param country Address of the country to register
     */
    function registerCountry(address country) 
        external 
        onlyRole(UNFCCC_ROLE) 
    {
        require(country != address(0), "Invalid country address");
        require(!hasRole(COUNTRY_ROLE, country), "Country already registered");
        
        _grantRole(COUNTRY_ROLE, country);
        emit CountryRegistered(country);
    }

    /**
     * @dev Initialize a new agreement
     * @param agreementHash Hash of the agreement document
     * @param requiredSigners Array of country addresses required to sign
     */
    function initializeAgreement(
        bytes32 agreementHash,
        address[] calldata requiredSigners
    ) 
        external 
        onlyRole(UNFCCC_ROLE)
        whenNotPaused 
        returns (uint256)
    {
        require(agreementHash != bytes32(0), "Invalid agreement hash");
        require(requiredSigners.length >= 2, "Minimum two signers required");

        uint256 agreementId = nextAgreementId++;
        Agreement storage agreement = agreements[agreementId];

        // Initialize agreement
        agreement.agreementHash = agreementHash;
        agreement.requiredSigners = requiredSigners;
        agreement.status = AgreementStatus.SignaturePending;
        agreement.createdAt = block.timestamp;

        // Verify all signers are registered countries
        for (uint i = 0; i < requiredSigners.length; i++) {
            require(
                hasRole(COUNTRY_ROLE, requiredSigners[i]), 
                "Invalid signer address"
            );
        }

        emit AgreementInitialized(agreementId, agreementHash, requiredSigners);
        return agreementId;
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
        Agreement storage agreement = agreements[agreementId];
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
        Agreement storage agreement = agreements[agreementId];
        require(
            agreement.status == AgreementStatus.AllSignaturesCollected,
            "Not ready for activation"
        );

        agreement.status = AgreementStatus.Active;
        agreement.activatedAt = block.timestamp;

        emit AgreementActivated(agreementId);
    }

    /**
     * @dev Get agreement details
     * @param agreementId ID of the agreement
     */
    function getAgreementDetails(uint256 agreementId) 
        external 
        view 
        returns (
            bytes32 agreementHash,
            address[] memory requiredSigners,
            uint256 signatureCount,
            AgreementStatus status,
            uint256 createdAt,
            uint256 activatedAt
        )
    {
        Agreement storage agreement = agreements[agreementId];
        return (
            agreement.agreementHash,
            agreement.requiredSigners,
            agreement.signatureCount,
            agreement.status,
            agreement.createdAt,
            agreement.activatedAt
        );
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
}