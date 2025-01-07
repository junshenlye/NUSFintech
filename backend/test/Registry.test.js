const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ITMORegistry", function () {
    let ITMORegistry;
    let registry;
    let unfccc;
    let countryA;
    let countryB;
    let countryC;
    let nonAuthorized;

    const UNFCCC_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNFCCC_ROLE"));
    const COUNTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNTRY_ROLE"));
    
    beforeEach(async function () {
        [unfccc, countryA, countryB, countryC, nonAuthorized] = await ethers.getSigners();
        
        // Deploy contract
        ITMORegistry = await ethers.getContractFactory("ITMORegistry");
        registry = await ITMORegistry.deploy();
        
        // Register countries
        await registry.registerCountry(countryA.address);
        await registry.registerCountry(countryB.address);
        await registry.registerCountry(countryC.address);
    });

    describe("Role Management", function () {
        it("Should set deployer as UNFCCC role", async function () {
            expect(await registry.hasRole(UNFCCC_ROLE, unfccc.address)).to.be.true;
        });

        it("Should register countries correctly", async function () {
            expect(await registry.hasRole(COUNTRY_ROLE, countryA.address)).to.be.true;
            expect(await registry.hasRole(COUNTRY_ROLE, countryB.address)).to.be.true;
            expect(await registry.hasRole(COUNTRY_ROLE, countryC.address)).to.be.true;
        });

        it("Should not allow non-UNFCCC to register countries", async function () {
            await expect(
                registry.connect(countryA).registerCountry(nonAuthorized.address)
            ).to.be.revertedWith(
                `AccessControl: account ${countryA.address.toLowerCase()} is missing role ${UNFCCC_ROLE}`
            );
        });
    });

    describe("Agreement Management", function () {
        let agreementId;
        const mockAgreementHash = ethers.keccak256(ethers.toUtf8Bytes("Mock Agreement"));
        
        beforeEach(async function () {
            // Initialize an agreement
            const tx = await registry.initializeAgreement(
                mockAgreementHash,
                [countryA.address, countryB.address, countryC.address]
            );
            const receipt = await tx.wait();
            
            // Get agreement ID from event
            const event = receipt.logs.find(
                log => log.fragment && log.fragment.name === 'AgreementInitialized'
            );
            agreementId = event.args[0];
        });

        it("Should initialize agreement correctly", async function () {
            const agreement = await registry.getAgreementDetails(agreementId);
            
            expect(agreement[0]).to.equal(mockAgreementHash); // agreementHash
            
            // Compare arrays by converting to lowercase and sorting
            const expectedSigners = [
                countryA.address.toLowerCase(),
                countryB.address.toLowerCase(),
                countryC.address.toLowerCase()
            ].sort();
            
            const actualSigners = agreement[1].map(addr => addr.toLowerCase()).sort();
            expect(actualSigners).to.deep.equal(expectedSigners);
            
            expect(agreement[2]).to.equal(0); // signatureCount
            expect(agreement[3]).to.equal(2); // status (SignaturePending)
        });

        it("Should allow countries to sign agreement", async function () {
            await registry.connect(countryA).signAgreement(agreementId);
            
            expect(await registry.hasSignedAgreement(agreementId, countryA.address))
                .to.be.true;
            
            const agreement = await registry.getAgreementDetails(agreementId);
            expect(agreement[2]).to.equal(1); // signatureCount
        });

        it("Should not allow double signing", async function () {
            await registry.connect(countryA).signAgreement(agreementId);
            
            await expect(
                registry.connect(countryA).signAgreement(agreementId)
            ).to.be.revertedWith("Already signed");
        });

        it("Should emit AllSignaturesCollected when all countries sign", async function () {
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            
            await expect(registry.connect(countryC).signAgreement(agreementId))
                .to.emit(registry, "AllSignaturesCollected")
                .withArgs(agreementId);
            
            const agreement = await registry.getAgreementDetails(agreementId);
            expect(agreement[3]).to.equal(3); // AllSignaturesCollected
        });

        it("Should allow UNFCCC to activate agreement after all signatures", async function () {
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            await registry.connect(countryC).signAgreement(agreementId);
            
            await expect(registry.activateAgreement(agreementId))
                .to.emit(registry, "AgreementActivated")
                .withArgs(agreementId);
            
            const agreement = await registry.getAgreementDetails(agreementId);
            expect(agreement[3]).to.equal(4); // Active
        });

        it("Should not allow activation before all signatures", async function () {
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            
            await expect(
                registry.activateAgreement(agreementId)
            ).to.be.revertedWith("Not ready for activation");
        });
    });

    describe("Security Features", function () {
        it("Should allow UNFCCC to pause the contract", async function () {
            await registry.pause();
            expect(await registry.paused()).to.be.true;
        });

        it("Should not allow operations while paused", async function () {
            await registry.pause();
            
            const mockAgreementHash = ethers.keccak256(ethers.toUtf8Bytes("Mock Agreement"));
            await expect(
                registry.initializeAgreement(
                    mockAgreementHash,
                    [countryA.address, countryB.address]
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should allow UNFCCC to unpause the contract", async function () {
            await registry.pause();
            await registry.unpause();
            expect(await registry.paused()).to.be.false;
        });
    });
});