const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ITMORegistry", function () {
    // Common variables
    const UNFCCC_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNFCCC_ROLE"));
    const COUNTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNTRY_ROLE"));

    async function deployFixture() {
        // Get signers
        const [unfccc, countryA, countryB, countryC, nonAuthorized] = await ethers.getSigners();
        
        // Deploy contract
        const ITMORegistry = await ethers.getContractFactory("ITMORegistry");
        const registry = await ITMORegistry.deploy();
        
        // Register countries
        await registry.registerCountry(countryA.address);
        await registry.registerCountry(countryB.address);
        await registry.registerCountry(countryC.address);

        // Get current timestamp
        const currentTimestamp = await time.latest();

        // Sample agreement data
        const agreementData = {
            agreementId: 1,
            seller: countryA.address,
            buyer: countryB.address,
            mcuAmount: ethers.parseUnits("100", 0), // 100 MCUs
            pricePerMCU: ethers.parseEther("0.5"), // 0.5 ETH per MCU
            paymentCurrency: "ETH",
            paymentMethod: 1, // Crypto
            validityPeriod: 30 * 24 * 60 * 60, // 30 days
            transferDeadline: currentTimestamp + (7 * 24 * 60 * 60), // current time + 7 days
            correspondingAdjustmentRef: "ADJ-2024-001"
        };

        return { 
            registry, 
            unfccc, 
            countryA, 
            countryB, 
            countryC, 
            nonAuthorized,
            agreementData,
            UNFCCC_ROLE,
            COUNTRY_ROLE
        };
    }

    describe("Deployment & Role Management", function () {
        it("Should set deployer as UNFCCC role", async function () {
            const { registry, unfccc } = await loadFixture(deployFixture);
            expect(await registry.hasRole(UNFCCC_ROLE, unfccc.address)).to.be.true;
        });

        it("Should register countries correctly", async function () {
            const { registry, countryA, countryB } = await loadFixture(deployFixture);
            expect(await registry.hasRole(COUNTRY_ROLE, countryA.address)).to.be.true;
            expect(await registry.hasRole(COUNTRY_ROLE, countryB.address)).to.be.true;
        });

        it("Should not allow non-UNFCCC to register countries", async function () {
            const { registry, countryA, nonAuthorized } = await loadFixture(deployFixture);
            await expect(
                registry.connect(countryA).registerCountry(nonAuthorized.address)
            ).to.be.revertedWith(
                `AccessControl: account ${countryA.address.toLowerCase()} is missing role ${UNFCCC_ROLE}`
            );
        });
    });

    describe("Agreement Management", function () {
        it("Should initialize agreement correctly", async function () {
            const { registry, agreementData } = await loadFixture(deployFixture);
            
            const tx = await registry.initializeAgreement(
                agreementData.agreementId,
                agreementData.seller,
                agreementData.buyer,
                agreementData.mcuAmount,
                agreementData.pricePerMCU,
                agreementData.paymentCurrency,
                agreementData.paymentMethod,
                agreementData.validityPeriod,
                agreementData.transferDeadline,
                agreementData.correspondingAdjustmentRef
            );

            await expect(tx)
                .to.emit(registry, "AgreementInitialized")
                .withArgs(
                    agreementData.agreementId,
                    agreementData.seller,
                    agreementData.buyer,
                    agreementData.mcuAmount,
                    agreementData.pricePerMCU,
                    agreementData.paymentCurrency
                );

            const details = await registry.getAgreementDetails(agreementData.agreementId);
            expect(details.seller).to.equal(agreementData.seller);
            expect(details.buyer).to.equal(agreementData.buyer);
            expect(details.mcuAmount).to.equal(agreementData.mcuAmount);
        });

        it("Should reject invalid agreement parameters", async function () {
            const { registry, agreementData } = await loadFixture(deployFixture);

            // Test with invalid agreement ID (0)
            await expect(
                registry.initializeAgreement(
                    0,
                    agreementData.seller,
                    agreementData.buyer,
                    agreementData.mcuAmount,
                    agreementData.pricePerMCU,
                    agreementData.paymentCurrency,
                    agreementData.paymentMethod,
                    agreementData.validityPeriod,
                    agreementData.transferDeadline,
                    agreementData.correspondingAdjustmentRef
                )
            ).to.be.revertedWith("Invalid agreement ID");

            // Test with invalid MCU amount (0)
            await expect(
                registry.initializeAgreement(
                    agreementData.agreementId,
                    agreementData.seller,
                    agreementData.buyer,
                    0,
                    agreementData.pricePerMCU,
                    agreementData.paymentCurrency,
                    agreementData.paymentMethod,
                    agreementData.validityPeriod,
                    agreementData.transferDeadline,
                    agreementData.correspondingAdjustmentRef
                )
            ).to.be.revertedWith("Invalid MCU amount");
        });

        it("Should handle agreement signing process correctly", async function () {
            const { registry, countryA, countryB, agreementData } = await loadFixture(deployFixture);
            
            // Initialize agreement
            await registry.initializeAgreement(
                agreementData.agreementId,
                agreementData.seller,
                agreementData.buyer,
                agreementData.mcuAmount,
                agreementData.pricePerMCU,
                agreementData.paymentCurrency,
                agreementData.paymentMethod,
                agreementData.validityPeriod,
                agreementData.transferDeadline,
                agreementData.correspondingAdjustmentRef
            );

            // First signature
            await expect(registry.connect(countryA).signAgreement(agreementData.agreementId))
                .to.emit(registry, "AgreementSigned")
                .withArgs(agreementData.agreementId, countryA.address);

            expect(await registry.hasSignedAgreement(agreementData.agreementId, countryA.address))
                .to.be.true;

            // Second signature should trigger AllSignaturesCollected
            await expect(registry.connect(countryB).signAgreement(agreementData.agreementId))
                .to.emit(registry, "AllSignaturesCollected")
                .withArgs(agreementData.agreementId);
        });

        it("Should activate agreement properly", async function () {
            const { registry, countryA, countryB, agreementData } = await loadFixture(deployFixture);
            
            // Initialize and sign agreement
            await registry.initializeAgreement(
                agreementData.agreementId,
                agreementData.seller,
                agreementData.buyer,
                agreementData.mcuAmount,
                agreementData.pricePerMCU,
                agreementData.paymentCurrency,
                agreementData.paymentMethod,
                agreementData.validityPeriod,
                agreementData.transferDeadline,
                agreementData.correspondingAdjustmentRef
            );
            
            await registry.connect(countryA).signAgreement(agreementData.agreementId);
            await registry.connect(countryB).signAgreement(agreementData.agreementId);

            await expect(registry.activateAgreement(agreementData.agreementId))
                .to.emit(registry, "AgreementActivated")
                .withArgs(agreementData.agreementId);
        });

        it("Should complete agreement properly", async function () {
            const { registry, countryA, countryB, agreementData } = await loadFixture(deployFixture);
            
            // Initialize, sign and activate agreement
            await registry.initializeAgreement(
                agreementData.agreementId,
                agreementData.seller,
                agreementData.buyer,
                agreementData.mcuAmount,
                agreementData.pricePerMCU,
                agreementData.paymentCurrency,
                agreementData.paymentMethod,
                agreementData.validityPeriod,
                agreementData.transferDeadline,
                agreementData.correspondingAdjustmentRef
            );
            
            await registry.connect(countryA).signAgreement(agreementData.agreementId);
            await registry.connect(countryB).signAgreement(agreementData.agreementId);
            await registry.activateAgreement(agreementData.agreementId);

            await expect(registry.completeAgreement(agreementData.agreementId))
                .to.emit(registry, "AgreementCompleted")
                .withArgs(agreementData.agreementId);
        });
    });

    describe("Security Features", function () {
        it("Should handle pause/unpause correctly", async function () {
            const { registry, agreementData } = await loadFixture(deployFixture);
            
            await registry.pause();
            expect(await registry.paused()).to.be.true;

            // Try to initialize agreement while paused
            await expect(
                registry.initializeAgreement(
                    agreementData.agreementId,
                    agreementData.seller,
                    agreementData.buyer,
                    agreementData.mcuAmount,
                    agreementData.pricePerMCU,
                    agreementData.paymentCurrency,
                    agreementData.paymentMethod,
                    agreementData.validityPeriod,
                    agreementData.transferDeadline,
                    agreementData.correspondingAdjustmentRef
                )
            ).to.be.revertedWith("Pausable: paused");

            await registry.unpause();
            expect(await registry.paused()).to.be.false;
        });
    });
});