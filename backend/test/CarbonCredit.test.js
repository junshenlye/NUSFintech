const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Carbon Credit Marketplace", function () {
    let CarbonCredit, carbonCredit;
    let CarbonCreditAuction, carbonCreditAuction;
    let owner, addr1, addr2;
    
    beforeEach(async function () {
        // Get signers
        [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy Carbon Credit contract
        CarbonCredit = await ethers.getContractFactory("CarbonCredit");
        carbonCredit = await CarbonCredit.deploy();
        
        // Deploy Auction contract
        CarbonCreditAuction = await ethers.getContractFactory("CarbonCreditAuction");
        carbonCreditAuction = await CarbonCreditAuction.deploy(await carbonCredit.getAddress());
    });
    
    describe("Carbon Credit Token", function () {
        it("Should issue a new carbon credit token", async function () {
            // First authorize addr1 as an issuer
            await carbonCredit.authorizeIssuer(addr1.address);
            
            const tx = await carbonCredit.connect(addr1).issueCreditTo(
                addr1.address,  // recipient
                100, // 100 metric tons
                "Amazon Rainforest",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // Valid for 1 year
                "ipfs://metadata-uri"
            );
            
            await tx.wait();
            
            // Check token ownership
            expect(await carbonCredit.ownerOf(1)).to.equal(addr1.address);
            
            // Check metadata
            const metadata = await carbonCredit.creditMetadata(1);
            expect(metadata.carbonAmount).to.equal(100);
            expect(metadata.projectLocation).to.equal("Amazon Rainforest");
            expect(metadata.isVerified).to.be.true;
            expect(metadata.issuer).to.equal(addr1.address);
        });
    
        it("Should only allow authorized issuers to mint", async function () {
            // Try to mint without authorization
            await expect(
                carbonCredit.connect(addr2).issueCreditTo(
                    addr2.address,
                    100,
                    "Amazon Rainforest",
                    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                    "ipfs://metadata-uri"
                )
            ).to.be.revertedWith("Not authorized issuer");
        });
    });
    
    describe("Auction", function () {
        beforeEach(async function () {
            // Authorize and mint a token for testing
            await carbonCredit.authorizeIssuer(owner.address);
            await carbonCredit.issueCreditTo(
                addr1.address,
                100,
                "Amazon Rainforest",
                Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
                "ipfs://metadata-uri"
            );
        });
        
        it("Should create an auction", async function () {
            // Approve auction contract
            await carbonCredit.connect(addr1).approve(await carbonCreditAuction.getAddress(), 1);
            
            // Create auction
            const tx = await carbonCreditAuction.connect(addr1).createAuction(
                1, // tokenId
                ethers.parseEther("1"), // 1 ETH starting price
                3600 // 1 hour duration
            );
            
            await tx.wait();
            
            const auction = await carbonCreditAuction.auctions(1);
            expect(auction.seller).to.equal(addr1.address);
            expect(auction.exists).to.be.true;
            expect(auction.startingPrice).to.equal(ethers.parseEther("1"));
        });
    });
});