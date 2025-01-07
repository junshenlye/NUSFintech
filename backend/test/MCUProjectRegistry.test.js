const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MCUProjectRegistry", function () {
    let MCUProjectRegistry;
    let registry;
    let unfccc;
    let countryA;
    let countryB;
    let nonAuthorized;

    // Constants
    const UNFCCC_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNFCCC_ROLE"));
    const COUNTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNTRY_ROLE"));
    const CARBON_UNITS_PER_TOKEN = 1000;
    const PROJECT_ID = "PROJECT001";
    const PROJECT_NAME = "Solar Farm Project";
    const PROJECT_DESCRIPTION = "A project to build a solar farm.";
    const REGISTRY_SYSTEM = "BlockchainPlatformXYZ";
    const HOST_COUNTRY_REGISTRY = "Registry ABC";
    const EMISSION_UNIT = "tCO2e";

    // Emission Data
    const EMISSION_DATA = {
        totalEmissionReduction: 0,
        baselineEmissions: 10000,
        verifiedReductions: 0,
        emissionUnit: EMISSION_UNIT,
        isVerified: false,
    };

    beforeEach(async function () {
        [unfccc, countryA, countryB, nonAuthorized] = await ethers.getSigners();

        // Deploy contract
        MCUProjectRegistry = await ethers.getContractFactory("MCUProjectRegistry");
        registry = await MCUProjectRegistry.deploy("https://mcu-metadata.uri/");

        // Grant COUNTRY_ROLE to test addresses
        await registry.grantRole(COUNTRY_ROLE, countryA.address);
        await registry.grantRole(COUNTRY_ROLE, countryB.address);
    });

    describe("Deployment", function () {
        it("Should set the right UNFCCC", async function () {
            expect(await registry.hasRole(UNFCCC_ROLE, unfccc.address)).to.be.true;
        });

        it("Should set the right token URI", async function () {
            expect(await registry.uri(0)).to.equal("https://mcu-metadata.uri/");
        });
    });

    describe("Project Registration", function () {
        it("Should allow a country to register a project", async function () {
            await expect(
                registry.connect(countryA).registerProject(
                    PROJECT_ID,
                    PROJECT_NAME,
                    PROJECT_DESCRIPTION,
                    0, // ProjectType.RenewableEnergy
                    REGISTRY_SYSTEM,
                    HOST_COUNTRY_REGISTRY,
                    EMISSION_DATA
                )
            )
                .to.emit(registry, "ProjectRegistered")
                .withArgs(0, countryA.address, PROJECT_ID, PROJECT_NAME, 0);

            const project = await registry.getProject(0);
            expect(project.projectId).to.equal(PROJECT_ID);
            expect(project.projectName).to.equal(PROJECT_NAME);
            expect(project.description).to.equal(PROJECT_DESCRIPTION);
            expect(project.countryOwner).to.equal(countryA.address);
            expect(project.status).to.equal(0); // Pending
        });

        it("Should not allow non-country to register a project", async function () {
            await expect(
                registry.connect(nonAuthorized).registerProject(
                    PROJECT_ID,
                    PROJECT_NAME,
                    PROJECT_DESCRIPTION,
                    0, // ProjectType.RenewableEnergy
                    REGISTRY_SYSTEM,
                    HOST_COUNTRY_REGISTRY,
                    EMISSION_DATA
                )
            ).to.be.revertedWith(
                `AccessControl: account ${nonAuthorized.address.toLowerCase()} is missing role ${COUNTRY_ROLE}`
            );
        });

        it("Should not allow empty project identifier", async function () {
            await expect(
                registry.connect(countryA).registerProject(
                    "",
                    PROJECT_NAME,
                    PROJECT_DESCRIPTION,
                    0, // ProjectType.RenewableEnergy
                    REGISTRY_SYSTEM,
                    HOST_COUNTRY_REGISTRY,
                    EMISSION_DATA
                )
            ).to.be.revertedWith("Invalid project identifier");
        });
    });

    describe("Token Minting", function () {
        let projectId;

        beforeEach(async function () {
            const tx = await registry.connect(countryA).registerProject(
                PROJECT_ID,
                PROJECT_NAME,
                PROJECT_DESCRIPTION,
                0, // ProjectType.RenewableEnergy
                REGISTRY_SYSTEM,
                HOST_COUNTRY_REGISTRY,
                EMISSION_DATA
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment && log.fragment.name === 'ProjectRegistered'
            );
            projectId = event.args[0];
        });

        it("Should mint correct number of tokens for carbon reduction", async function () {
            const carbonReduction = 5000; // Should result in 5 tokens
            const expectedTokens = Math.floor(carbonReduction / CARBON_UNITS_PER_TOKEN);

            await expect(registry.validateAndMintTokens(projectId, carbonReduction))
                .to.emit(registry, "TokensMinted")
                .withArgs(projectId, countryA.address, expectedTokens);

            const balance = await registry.balanceOf(countryA.address, projectId);
            expect(balance).to.equal(expectedTokens);
        });

        it("Should update project details after minting", async function () {
            const carbonReduction = 5000;
            await registry.validateAndMintTokens(projectId, carbonReduction);

            const project = await registry.getProject(projectId);
            expect(project.emissionData.totalEmissionReduction).to.equal(carbonReduction);
            expect(project.tokensMinted).to.equal(5);
            expect(project.status).to.equal(2); // Active
        });

        it("Should not mint tokens for insufficient carbon reduction", async function () {
            const carbonReduction = 500; // Less than CARBON_UNITS_PER_TOKEN
            await expect(
                registry.validateAndMintTokens(projectId, carbonReduction)
            ).to.be.revertedWith("Insufficient carbon reduction for token minting");
        });

        it("Should not allow non-UNFCCC to mint tokens", async function () {
            await expect(
                registry.connect(countryA).validateAndMintTokens(projectId, 5000)
            ).to.be.revertedWith(
                `AccessControl: account ${countryA.address.toLowerCase()} is missing role ${UNFCCC_ROLE}`
            );
        });
    });

    describe("Project Management", function () {
        let projectId;

        beforeEach(async function () {
            const tx = await registry.connect(countryA).registerProject(
                PROJECT_ID,
                PROJECT_NAME,
                PROJECT_DESCRIPTION,
                0, // ProjectType.RenewableEnergy
                REGISTRY_SYSTEM,
                HOST_COUNTRY_REGISTRY,
                EMISSION_DATA
            );
            const receipt = await tx.wait();
            const event = receipt.logs.find(
                log => log.fragment && log.fragment.name === 'ProjectRegistered'
            );
            projectId = event.args[0];
        });

        it("Should allow UNFCCC to suspend a project", async function () {
            await registry.suspendProject(projectId);
            const project = await registry.getProject(projectId);
            expect(project.status).to.equal(3); // Suspended
        });

        it("Should get all projects for a country", async function () {
            const projects = await registry.getCountryProjects(countryA.address);
            expect(projects.length).to.equal(1);
            expect(projects[0]).to.equal(projectId);
        });

        it("Should calculate potential tokens correctly", async function () {
            const carbonReduction = 5000;
            const potentialTokens = await registry.calculatePotentialTokens(projectId, carbonReduction);
            expect(potentialTokens).to.equal(5);
        });

        it("Should allow UNFCCC to add project documents", async function () {
            const documentHash = "QmXYZ123";
            await registry.addProjectDocument(projectId, documentHash);

            const documents = await registry.getProjectDocuments(projectId);
            expect(documents.length).to.equal(1);
            expect(documents[0]).to.equal(documentHash);
        });

        it("Should allow UNFCCC to update project status", async function () {
            await registry.updateProjectStatus(projectId, 1); // Validated
            const project = await registry.getProject(projectId);
            expect(project.status).to.equal(1); // Validated
        });

        it("Should allow UNFCCC to update emission data", async function () {
            const newEmissionData = {
                totalEmissionReduction: 10000,
                baselineEmissions: 20000,
                verifiedReductions: 10000,
                emissionUnit: EMISSION_UNIT,
                isVerified: true,
            };

            await registry.updateEmissionData(projectId, newEmissionData);

            const project = await registry.getProject(projectId);
            expect(project.emissionData.totalEmissionReduction).to.equal(10000);
            expect(project.emissionData.verifiedReductions).to.equal(10000);
            expect(project.tokensMinted).to.equal(10); // 10000 / 1000
        });
    });

    describe("Security Features", function () {
        it("Should allow UNFCCC to pause the contract", async function () {
            await registry.pause();
            expect(await registry.paused()).to.be.true;
        });

        it("Should not allow project registration while paused", async function () {
            await registry.pause();
            await expect(
                registry.connect(countryA).registerProject(
                    PROJECT_ID,
                    PROJECT_NAME,
                    PROJECT_DESCRIPTION,
                    0, // ProjectType.RenewableEnergy
                    REGISTRY_SYSTEM,
                    HOST_COUNTRY_REGISTRY,
                    EMISSION_DATA
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