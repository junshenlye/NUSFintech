const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ITMORegistry - Agreement Management", function () {
    async function deployWithAgreementFixture() {
        const [unfccc, countryA, countryB, countryC, verifier] = await ethers.getSigners();
        
        const ITMORegistry = await ethers.getContractFactory("ITMORegistry");
        const registry = await ITMORegistry.deploy();
        
        // Register countries and verifier
        await registry.registerCountry(countryA.address);
        await registry.registerCountry(countryB.address);
        await registry.registerCountry(countryC.address);
        await registry.grantRole(ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE")), verifier.address);

        // Sample ITMO Agreement Data
        const itmoData = {
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

        return { 
            registry, 
            unfccc, 
            countryA, 
            countryB, 
            countryC, 
            verifier,
            itmoData
        };
    }

    describe("ITMO Agreement Initialization", function () {
        it("Should initialize ITMO agreement correctly", async function () {
            const { registry, countryA, countryB, itmoData } = await loadFixture(deployWithAgreementFixture);
            
            const tx = await registry.initializeITMOAgreement(
                itmoData.itmoId,
                itmoData.projectName,
                itmoData.projectType,
                countryA.address,
                [countryA.address, countryB.address],
                itmoData.emissionData,
                itmoData.metadataHash
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment?.name === 'ITMOAgreementInitialized'
            );
            
            expect(event.args.itmoId).to.equal(itmoData.itmoId);
            expect(event.args.projectName).to.equal(itmoData.projectName);
            expect(event.args.originatingCountry).to.equal(countryA.address);
            expect(event.args.totalEmissionReduction).to.equal(itmoData.emissionData.totalEmissionReduction);
        });

        it("Should reject invalid ITMO data", async function () {
            const { registry, countryA, countryB, itmoData } = await loadFixture(deployWithAgreementFixture);
            
            // Test with empty ITMO ID
            await expect(
                registry.initializeITMOAgreement(
                    "",
                    itmoData.projectName,
                    itmoData.projectType,
                    countryA.address,
                    [countryA.address, countryB.address],
                    itmoData.emissionData,
                    itmoData.metadataHash
                )
            ).to.be.revertedWith("Invalid ITMO ID");

            // Test with zero emission reduction
            const invalidEmissionData = {
                ...itmoData.emissionData,
                totalEmissionReduction: 0
            };
            await expect(
                registry.initializeITMOAgreement(
                    itmoData.itmoId,
                    itmoData.projectName,
                    itmoData.projectType,
                    countryA.address,
                    [countryA.address, countryB.address],
                    invalidEmissionData,
                    itmoData.metadataHash
                )
            ).to.be.revertedWith("Invalid emission reduction");
        });
    });

    describe("Agreement Signing Process", function () {
        async function deployedAgreementFixture() {
            const base = await deployWithAgreementFixture();
            
            // Initialize agreement
            const tx = await base.registry.initializeITMOAgreement(
                base.itmoData.itmoId,
                base.itmoData.projectName,
                base.itmoData.projectType,
                base.countryA.address,
                [base.countryA.address, base.countryB.address],
                base.itmoData.emissionData,
                base.itmoData.metadataHash
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment?.name === 'ITMOAgreementInitialized');
            const agreementId = event.args.agreementId;
            
            return { ...base, agreementId };
        }

        it("Should allow countries to sign agreement", async function () {
            const { registry, countryA, agreementId } = await loadFixture(deployedAgreementFixture);
            
            await registry.connect(countryA).signAgreement(agreementId);
            expect(await registry.hasSignedAgreement(agreementId, countryA.address)).to.be.true;
        });

        it("Should emit AllSignaturesCollected when all countries sign", async function () {
            const { registry, countryA, countryB, agreementId } = await loadFixture(deployedAgreementFixture);
            
            await registry.connect(countryA).signAgreement(agreementId);
            
            await expect(registry.connect(countryB).signAgreement(agreementId))
                .to.emit(registry, "AllSignaturesCollected")
                .withArgs(agreementId);
        });
    });
});