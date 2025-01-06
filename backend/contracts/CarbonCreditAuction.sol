// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
/**
 * @title CarbonCreditAuction
 * @dev Implementation of an auction system for carbon credit NFTs
 * Enables creation and management of auctions for carbon credit tokens
*/

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CarbonCreditAuction is ReentrancyGuard {
    /**
     * @dev Struct to store auction details
     * @param seller Address of the NFT seller
     * @param tokenId ID of the NFT being auctioned
     * @param startingPrice Minimum bid price
     * @param endTime Timestamp when auction ends
     * @param highestBidder Address of current highest bidder
     * @param highestBid Current highest bid amount
     * @param ended Whether auction has ended
     * @param exists Whether auction exists
     */
    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool ended;
        bool exists;
    }
    
    IERC721 public nft;  // Reference to the NFT contract
    mapping(uint256 => Auction) public auctions;  // Mapping from token ID to auction
    address private _owner;
    
    // Events for tracking auction activities
    event AuctionCreated(uint256 tokenId, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 tokenId, address winner, uint256 amount);
    
    /**
     * @dev Constructor sets the NFT contract address
     * @param _nft Address of the Carbon Credit NFT contract
     */
    constructor(address _nft) {
        nft = IERC721(_nft);
        _owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == _owner, "Not the owner");
        _;
    }
    
    /**
     * @dev Creates a new auction for a token
     * @param tokenId ID of the token to auction
     * @param startingPrice Minimum bid price
     * @param duration Duration of the auction in seconds
     */
    function createAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    ) external {
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(nft.getApproved(tokenId) == address(this), "Auction not approved");
        
        auctions[tokenId] = Auction({
            seller: msg.sender,
            tokenId: tokenId,
            startingPrice: startingPrice,
            endTime: block.timestamp + duration,
            highestBidder: address(0),
            highestBid: 0,
            ended: false,
            exists: true
        });
        
        emit AuctionCreated(tokenId, startingPrice, block.timestamp + duration);
    }
    
    /**
     * @dev Places a bid on an auction
     * @param tokenId ID of the token being auctioned
     */
    function placeBid(uint256 tokenId) external payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.exists, "Auction does not exist");
        require(!auction.ended, "Auction ended");
        require(block.timestamp < auction.endTime, "Auction expired");
        require(msg.value > auction.highestBid, "Bid too low");
        
        // Handle refund of previous bid
        address previousBidder = auction.highestBidder;
        uint256 previousBid = auction.highestBid;
        
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        
        if (previousBidder != address(0)) {
            payable(previousBidder).transfer(previousBid);
        }
        
        emit BidPlaced(tokenId, msg.sender, msg.value);
    }
    
    /**
     * @dev Ends an auction and handles token/payment transfer
     * @param tokenId ID of the token being auctioned
     */
    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.exists, "Auction does not exist");
        require(!auction.ended, "Auction already ended");
        require(block.timestamp >= auction.endTime, "Auction not yet ended");
        
        auction.ended = true;
        
        if (auction.highestBidder != address(0)) {
            // Transfer NFT to winner and payment to seller
            nft.transferFrom(auction.seller, auction.highestBidder, tokenId);
            payable(auction.seller).transfer(auction.highestBid);
            
            emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
        } else {
            emit AuctionEnded(tokenId, auction.seller, 0);
        }
    }
}