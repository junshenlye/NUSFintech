const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ITMORegistry - Verification Process", function () {
    // Constants for test data
    const TEST_VERIFICATION_STANDARD = "ISO 14064";
    const ZERO_ADDRESS = ethers.ZeroAddress;

    // Sample ITMO data
    const sampleITMOData = {
        itmoId: "ITMO12345",
        projectName: "Green Energy Project",
        projectType: 0, // RenewableEnergy
        emissionData: {
            totalEmissionReduction: 50000,
            baselineEmissions: 70000,
            mitigationActivityDescription: "Wind turbine installation",
            isVerified: false
        },
        metadataHash: ethers.keccak256(ethers.toUtf8Bytes("Additional Metadata"))
    };

    async function deployWithInitializedAgreementFixture() {
        const [unfccc, countryA, countryB, verifier, nonAuthorizedVerifier] = await ethers.getSigners();
        
        // Deploy contract
        const ITMORegistry = await ethers.getContractFactory("ITMORegistry");
        const registry = await ITMORegistry.connect(unfccc).deploy();
        await registry.waitForDeployment();

        // Setup roles
        const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
        await registry.connect(unfccc).grantRole(VERIFIER_ROLE, verifier.address);
        await registry.connect(unfccc).registerCountry(countryA.address);
        await registry.connect(unfccc).registerCountry(countryB.address);

        // Initialize an agreement
        const tx = await registry.connect(unfccc).initializeITMOAgreement(
            sampleITMOData.itmoId,
            sampleITMOData.projectName,
            sampleITMOData.projectType,
            countryA.address,
            [countryA.address, countryB.address],
            sampleITMOData.emissionData,
            sampleITMOData.metadataHash
        );
        const receipt = await tx.wait();
        const event = receipt.logs.find(
            log => log.fragment?.name === 'ITMOAgreementInitialized'
        );
        const agreementId = event.args[0];

        return {
            registry,
            unfccc,
            countryA,
            countryB,
            verifier,
            nonAuthorizedVerifier,
            agreementId,
            VERIFIER_ROLE
        };
    }

    describe("Verifier Role Management", function () {
        it("Should allow UNFCCC to grant verifier role", async function () {
            const { registry, unfccc, nonAuthorizedVerifier, VERIFIER_ROLE } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            await registry.connect(unfccc).grantRole(VERIFIER_ROLE, nonAuthorizedVerifier.address);
            expect(await registry.hasRole(VERIFIER_ROLE, nonAuthorizedVerifier.address)).to.be.true;
        });

        it("Should not allow non-UNFCCC to grant verifier role", async function () {
            const { registry, countryA, nonAuthorizedVerifier } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            const UNFCCC_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNFCCC_ROLE"));
            await expect(
                registry.connect(countryA).grantRole(UNFCCC_ROLE, nonAuthorizedVerifier.address)
            ).to.be.revertedWith(
                `AccessControl: account ${countryA.address.toLowerCase()} is missing role ${UNFCCC_ROLE}`
            );
        });
    });

    describe("Verification Process", function () {
        it("Should allow authorized verifier to complete verification", async function () {
            const { registry, verifier, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            const tx = await registry.connect(verifier).completeVerification(
                agreementId,
                TEST_VERIFICATION_STANDARD
            );
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const expectedTimestamp = block.timestamp;

            await expect(tx)
                .to.emit(registry, "VerificationCompleted")
                .withArgs(
                    agreementId,
                    verifier.address,
                    expectedTimestamp
                );
        });

        it("Should not allow non-verifier to complete verification", async function () {
            const { registry, nonAuthorizedVerifier, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
            await expect(
                registry.connect(nonAuthorizedVerifier).completeVerification(
                    agreementId,
                    TEST_VERIFICATION_STANDARD
                )
            ).to.be.revertedWith(
                `AccessControl: account ${nonAuthorizedVerifier.address.toLowerCase()} is missing role ${VERIFIER_ROLE}`
            );
        });

        it("Should properly update verification status and details", async function () {
            const { registry, verifier, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            await registry.connect(verifier).completeVerification(
                agreementId,
                TEST_VERIFICATION_STANDARD
            );

            const agreementDetails = await registry.getITMOAgreementDetails(agreementId);
            expect(agreementDetails.isVerified).to.be.true;
        });

        it("Should not allow verification of non-existent agreement", async function () {
            const { registry, verifier } = await loadFixture(deployWithInitializedAgreementFixture);
            const nonExistentAgreementId = 99999;

            await expect(
                registry.connect(verifier).completeVerification(
                    nonExistentAgreementId,
                    TEST_VERIFICATION_STANDARD
                )
            ).to.be.reverted;
        });
    });

    describe("Verification State Management", function () {
        it("Should maintain verification data after activation", async function () {
            const { registry, unfccc, verifier, countryA, countryB, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            // Complete verification
            await registry.connect(verifier).completeVerification(
                agreementId,
                TEST_VERIFICATION_STANDARD
            );

            // Sign and activate agreement
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            await registry.connect(unfccc).activateAgreement(agreementId);

            // Verify data is maintained
            const agreementDetails = await registry.getITMOAgreementDetails(agreementId);
            expect(agreementDetails.isVerified).to.be.true;
        });

        it("Should not allow multiple verifications", async function () {
            const { registry, verifier, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            // First verification
            await registry.connect(verifier).completeVerification(
                agreementId,
                TEST_VERIFICATION_STANDARD
            );

            // Attempt second verification
            await expect(
                registry.connect(verifier).completeVerification(
                    agreementId,
                    "Different Standard"
                )
            ).to.be.revertedWith("Invalid agreement status for verification");
        });

        it("Should not allow verification after agreement is activated", async function () {
            const { registry, unfccc, verifier, countryA, countryB, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            // Sign and activate agreement
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            await registry.connect(unfccc).activateAgreement(agreementId);

            // Attempt verification after activation
            await expect(
                registry.connect(verifier).completeVerification(
                    agreementId,
                    TEST_VERIFICATION_STANDARD
                )
            ).to.be.revertedWith("Invalid agreement status for verification");
        });
    });

    describe("Verification Security", function () {
        it("Should not allow verification when contract is paused", async function () {
            const { registry, verifier, agreementId } = 
                await loadFixture(deployWithInitializedAgreementFixture);

            await registry.pause();

            await expect(
                registry.connect(verifier).completeVerification(
                    agreementId,
                    TEST_VERIFICATION_STANDARD
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should protect against verification of uninitialized agreements", async function () {
            const { registry, verifier } = await loadFixture(deployWithInitializedAgreementFixture);
            const uninitializedAgreementId = 9999;

            await expect(
                registry.connect(verifier).completeVerification(
                    uninitializedAgreementId,
                    TEST_VERIFICATION_STANDARD
                )
            ).to.be.reverted;
        });
    });
});