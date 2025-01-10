const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
    ROLES,
    AgreementStatus,
    deployContractWithSetup,
    initializeSampleAgreement
} = require("./helpers/test-helpers");

describe("ITMORegistry - Integration Tests", function () {
    async function deployWithFullSetupFixture() {
        const setup = await deployContractWithSetup();
        const { agreementId, itmoData } = await initializeSampleAgreement(
            setup.registry,
            setup.countryA.address,
            [setup.countryA.address, setup.countryB.address]
        );
        
        return { ...setup, agreementId, itmoData };
    }

    describe("Complete Agreement Lifecycle", function () {
        it("Should handle full agreement lifecycle successfully", async function () {
            const {
                registry,
                countryA,
                countryB,
                verifier,
                agreementId
            } = await loadFixture(deployWithFullSetupFixture);

            // Step 1: Verify the agreement
            await registry.connect(verifier).completeVerification(
                agreementId,
                "ISO 14064"
            );
            
            let details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.isVerified).to.be.true;

            // Step 2: Countries sign the agreement
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            
            details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.AllSignaturesCollected);

            // Step 3: Activate the agreement
            await registry.activateAgreement(agreementId);
            
            details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.Active);
        });

        it("Should maintain correct state transitions", async function () {
            const {
                registry,
                countryA,
                countryB,
                verifier,
                agreementId
            } = await loadFixture(deployWithFullSetupFixture);

            // Initial state
            let details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.SignaturePending);

            // After verification
            await registry.connect(verifier).completeVerification(
                agreementId,
                "ISO 14064"
            );
            details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.SignaturePending);

            // After first signature
            await registry.connect(countryA).signAgreement(agreementId);
            details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.SignaturePending);

            // After all signatures
            await registry.connect(countryB).signAgreement(agreementId);
            details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.AllSignaturesCollected);

            // After activation
            await registry.activateAgreement(agreementId);
            details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.status).to.equal(AgreementStatus.Active);
        });
    });

    describe("Error Scenarios", function () {
        it("Should handle invalid state transitions properly", async function () {
            const {
                registry,
                countryA,
                countryB,
                verifier,
                agreementId
            } = await loadFixture(deployWithFullSetupFixture);

            // Try to activate before signatures
            await expect(
                registry.activateAgreement(agreementId)
            ).to.be.revertedWith("Not ready for activation");

            // Complete normal flow
            await registry.connect(verifier).completeVerification(
                agreementId,
                "ISO 14064"
            );
            await registry.connect(countryA).signAgreement(agreementId);
            await registry.connect(countryB).signAgreement(agreementId);
            await registry.activateAgreement(agreementId);

            // Try to sign after activation
            await expect(
                registry.connect(countryA).signAgreement(agreementId)
            ).to.be.revertedWith("Agreement not in signing phase");
        });

        it("Should handle paused contract scenarios", async function () {
            const {
                registry,
                countryA,
                verifier,
                agreementId
            } = await loadFixture(deployWithFullSetupFixture);

            // Pause the contract
            await registry.pause();

            // Try operations while paused
            await expect(
                registry.connect(verifier).completeVerification(
                    agreementId,
                    "ISO 14064"
                )
            ).to.be.revertedWith("Pausable: paused");

            await expect(
                registry.connect(countryA).signAgreement(agreementId)
            ).to.be.revertedWith("Pausable: paused");

            // Unpause and verify operations work
            await registry.unpause();
            await registry.connect(verifier).completeVerification(
                agreementId,
                "ISO 14064"
            );
        });
    });

    describe("Data Integrity", function () {
        it("Should maintain correct emission data", async function () {
            const { registry, agreementId, itmoData } = await loadFixture(deployWithFullSetupFixture);
            
            const details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.totalEmissionReduction).to.equal(itmoData.emissionData.totalEmissionReduction);
        });

        it("Should track metadata correctly", async function () {
            const { registry, agreementId, itmoData } = await loadFixture(deployWithFullSetupFixture);
            
            const details = await registry.getITMOAgreementDetails(agreementId);
            expect(details.metadataHash).to.equal(itmoData.metadataHash);
        });
    });
});