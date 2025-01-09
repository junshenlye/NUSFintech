// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AccessControlBase.sol";

/**
 * @title ITMORegistry
 * @dev Manages ITMO agreements between countries under UNFCCC supervision
 * @notice This contract handles agreement creation, signing, and supervision for ITMO trades
 */
contract ITMORegistry is AccessControlBase, Pausable, ReentrancyGuard {
    // Agreement Status
    enum AgreementStatus {
        NonExistent,
        Initialized,
        SignaturePending,
        AllSignaturesCollected,
        Active,
        Completed,
        Terminated
    }

    // Payment Method
    enum PaymentMethod {
        Fiat,
        Crypto,
        Mixed
    }

    // ITMO Agreement Structure
    struct ITMOAgreement {
        // Basic Information
        uint256 agreementId;               
        address sellerCountry;             
        address buyerCountry;              
        uint256 mcuAmount;                 
        uint256 pricePerMCU;              
        string paymentCurrency;            
        PaymentMethod paymentMethod;       
        
        // Status Information
        AgreementStatus status;            
        mapping(address => bool) hasSigned;  
        uint256 signatureCount;             
        
        // Timeline Information
        uint256 createdAt;                 
        uint256 validUntil;                
        uint256 transferDeadline;          
        
        // Agreement Type and References
        bool isBilateral;                  
        string correspondingAdjustmentRef; 

        // Metadata URL
        string metadataUrl;  // New field for IPFS URL
    }

    // Storage
    mapping(uint256 => ITMOAgreement) public agreements;

    // Events
    event AgreementInitialized(
        uint256 indexed agreementId,
        address indexed seller,
        address indexed buyer,
        uint256 mcuAmount,
        uint256 pricePerMCU,
        string paymentCurrency,
        string metadataUrl  // Added metadataUrl
    );
    event AgreementSigned(uint256 indexed agreementId, address indexed signer);
    event AllSignaturesCollected(uint256 indexed agreementId);
    event AgreementActivated(uint256 indexed agreementId);
    event AgreementCompleted(uint256 indexed agreementId);
    event AgreementTerminated(uint256 indexed agreementId);

    /**
     * @dev Constructor initializes the contract with AccessControlBase
     */
    constructor() AccessControlBase() {}

    /**
     * @dev Initialize a new ITMO agreement
     * @param agreementId UNFCCC reference number
     * @param seller Address of the selling country
     * @param buyer Address of the buying country
     * @param mcuAmount Amount of MCUs to be transferred
     * @param pricePerMCU Price per MCU
     * @param paymentCurrency Currency for payment
     * @param paymentMethod Method of payment
     * @param validityPeriod Duration of agreement validity in seconds
     * @param transferDeadline Deadline for MCU transfer in seconds from now
     * @param correspondingAdjustmentRef Reference to corresponding adjustment
     * @param metadataUrl IPFS URL for agreement metadata
     */
    function initializeAgreement(
        uint256 agreementId,
        address seller,
        address buyer,
        uint256 mcuAmount,
        uint256 pricePerMCU,
        string calldata paymentCurrency,
        PaymentMethod paymentMethod,
        uint256 validityPeriod,
        uint256 transferDeadline,
        string calldata correspondingAdjustmentRef,
        string calldata metadataUrl  // New parameter for IPFS URL
    ) 
        external 
        onlyRole(UNFCCC_ROLE)
        whenNotPaused 
    {
        require(agreementId > 0, "Invalid agreement ID");
        require(seller != address(0) && buyer != address(0), "Invalid addresses");
        require(mcuAmount > 0, "Invalid MCU amount");
        require(pricePerMCU > 0, "Invalid price");
        require(hasRole(COUNTRY_ROLE, seller) && hasRole(COUNTRY_ROLE, buyer), "Invalid country roles");
        require(transferDeadline > block.timestamp, "Invalid deadline");

        ITMOAgreement storage agreement = agreements[agreementId];

        // Initialize agreement
        agreement.agreementId = agreementId;
        agreement.sellerCountry = seller;
        agreement.buyerCountry = buyer;
        agreement.mcuAmount = mcuAmount;
        agreement.pricePerMCU = pricePerMCU;
        agreement.paymentCurrency = paymentCurrency;
        agreement.paymentMethod = paymentMethod;
        agreement.status = AgreementStatus.SignaturePending;
        agreement.createdAt = block.timestamp;
        agreement.validUntil = block.timestamp + validityPeriod;
        agreement.transferDeadline = block.timestamp + transferDeadline;
        agreement.isBilateral = true;
        agreement.correspondingAdjustmentRef = correspondingAdjustmentRef;
        agreement.metadataUrl = metadataUrl;  // Set the metadata URL

        emit AgreementInitialized(
            agreementId,
            seller,
            buyer,
            mcuAmount,
            pricePerMCU,
            paymentCurrency,
            metadataUrl  // Include metadataUrl in the event
        );
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
        require(
            msg.sender == agreement.sellerCountry || msg.sender == agreement.buyerCountry,
            "Not authorized to sign"
        );
        require(!agreement.hasSigned[msg.sender], "Already signed");

        agreement.hasSigned[msg.sender] = true;
        agreement.signatureCount++;

        emit AgreementSigned(agreementId, msg.sender);

        if (agreement.signatureCount == 2) {  // Both parties have signed
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
        require(block.timestamp <= agreement.validUntil, "Agreement expired");

        agreement.status = AgreementStatus.Active;
        emit AgreementActivated(agreementId);
    }

    /**
     * @dev Mark an agreement as completed
     * @param agreementId ID of the agreement to complete
     */
    function completeAgreement(uint256 agreementId)
        external
        onlyRole(UNFCCC_ROLE)
        whenNotPaused
    {
        ITMOAgreement storage agreement = agreements[agreementId];
        require(agreement.status == AgreementStatus.Active, "Agreement not active");
        
        agreement.status = AgreementStatus.Completed;
        emit AgreementCompleted(agreementId);
    }

    /**
     * @dev Get agreement details
     * @param agreementId ID of the agreement
     */
    function getAgreementDetails(uint256 agreementId)
        external
        view
        returns (
            uint256 agreementRef,
            address seller,
            address buyer,
            uint256 mcuAmount,
            uint256 pricePerMCU,
            string memory paymentCurrency,
            PaymentMethod paymentMethod,
            AgreementStatus status,
            uint256 createdAt,
            uint256 validUntil,
            uint256 transferDeadline,
            string memory correspondingAdjustmentRef,
            string memory metadataUrl
        )
    {
        ITMOAgreement storage agreement = agreements[agreementId];
        return (
            agreement.agreementId,
            agreement.sellerCountry,
            agreement.buyerCountry,
            agreement.mcuAmount,
            agreement.pricePerMCU,
            agreement.paymentCurrency,
            agreement.paymentMethod,
            agreement.status,
            agreement.createdAt,
            agreement.validUntil,
            agreement.transferDeadline,
            agreement.correspondingAdjustmentRef,
            agreement.metadataUrl  // Ensure this is included
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