// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CarbonCredit
 * @dev Implementation of a carbon credit NFT system using ERC721 standard
 * This contract enables the creation, management, and trading of carbon credits as NFTs
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CarbonCredit is ERC721, ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;  // Counter for generating unique token IDs
    
    /**
     * @dev Struct to store metadata for each carbon credit
     * @param carbonAmount Amount of carbon offset in metric tons
     * @param projectLocation Location where the carbon offset project is implemented
     * @param validityPeriod Timestamp until when the credit is valid
     * @param isVerified Boolean indicating if the credit is verified
     * @param issuer Address of the entity that issued the credit
     * @param issuanceDate Timestamp when the credit was issued
     */
    struct CreditMetadata {
        uint256 carbonAmount;
        string projectLocation;
        uint256 validityPeriod;
        bool isVerified;
        address issuer;
        uint256 issuanceDate;
    }
    
    // Mapping from token ID to its metadata
    mapping(uint256 => CreditMetadata) public creditMetadata;
    // Mapping to track which addresses are authorized to issue credits
    mapping(address => bool) public authorizedIssuers;
    address private _owner;
    
    // Events for tracking important contract actions
    event IssuerAuthorized(address issuer);
    event IssuerRevoked(address issuer);
    event CreditIssued(
        uint256 tokenId,
        address issuer,
        address recipient,
        uint256 carbonAmount,
        string projectLocation
    );
    
    /**
     * @dev Constructor initializes the NFT with name and symbol
     * Sets the deployer as owner and first authorized issuer
     */
    constructor() ERC721("Carbon Credit", "CCARB") {
        _owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }
    
    // Access control modifiers
    modifier onlyOwner() {
        require(msg.sender == _owner, "Not the owner");
        _;
    }
    
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }
    
    /**
     * @dev Authorizes a new issuer of carbon credits
     * @param issuer Address to authorize
     */
    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
        emit IssuerAuthorized(issuer);
    }
    
    /**
     * @dev Revokes an issuer's authorization
     * @param issuer Address to revoke
     */
    function revokeIssuer(address issuer) external onlyOwner {
        require(issuer != _owner, "Cannot revoke owner");
        authorizedIssuers[issuer] = false;
        emit IssuerRevoked(issuer);
    }
    
    /**
     * @dev Issues a new carbon credit NFT to a recipient
     * @param recipient Address receiving the credit
     * @param carbonAmount Amount of carbon offset
     * @param projectLocation Location of the project
     * @param validityPeriod Validity period of the credit
     * @param uri Metadata URI for the token
     * @return tokenId The ID of the newly created token
     */
    function issueCreditTo(
        address recipient,
        uint256 carbonAmount,
        string memory projectLocation,
        uint256 validityPeriod,
        string memory uri
    ) public onlyAuthorizedIssuer returns (uint256) {
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, uri);
        
        creditMetadata[tokenId] = CreditMetadata({
            carbonAmount: carbonAmount,
            projectLocation: projectLocation,
            validityPeriod: validityPeriod,
            isVerified: true,
            issuer: msg.sender,
            issuanceDate: block.timestamp
        });
        
        emit CreditIssued(
            tokenId,
            msg.sender,
            recipient,
            carbonAmount,
            projectLocation
        );
        
        return tokenId;
    }
    
    // Standard ERC721 override functions below
    function burn(uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner/approved");
        super._burn(tokenId);
    }
    
    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage)
        returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage)
        returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}