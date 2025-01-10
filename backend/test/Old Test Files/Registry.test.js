const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ITMORegistry - Base Functionality", function () {
    // Roles
    const UNFCCC_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UNFCCC_ROLE"));
    const COUNTRY_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNTRY_ROLE"));
    const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));

    // Test fixture
    async function deployContractFixture() {
        const [unfccc, countryA, countryB, countryC, verifier, nonAuthorized] = await ethers.getSigners();
        
        // Deploy contract
        const ITMORegistry = await ethers.getContractFactory("ITMORegistry");
        const registry = await ITMORegistry.connect(unfccc).deploy();
        await registry.waitForDeployment();

        return { 
            registry, 
            unfccc, 
            countryA, 
            countryB, 
            countryC, 
            verifier, 
            nonAuthorized 
        };
    }

    describe("Role Management", function () {
        it("Should set deployer as UNFCCC role", async function () {
            const { registry, unfccc } = await loadFixture(deployContractFixture);
            expect(await registry.hasRole(UNFCCC_ROLE, unfccc.address)).to.be.true;
        });

        it("Should register countries correctly", async function () {
            const { registry, countryA, countryB, countryC } = await loadFixture(deployContractFixture);
            
            // Register countries
            await registry.registerCountry(countryA.address);
            await registry.registerCountry(countryB.address);
            await registry.registerCountry(countryC.address);

            expect(await registry.hasRole(COUNTRY_ROLE, countryA.address)).to.be.true;
            expect(await registry.hasRole(COUNTRY_ROLE, countryB.address)).to.be.true;
            expect(await registry.hasRole(COUNTRY_ROLE, countryC.address)).to.be.true;
        });

        it("Should not allow non-UNFCCC to register countries", async function () {
            const { registry, countryA, nonAuthorized } = await loadFixture(deployContractFixture);
            
            await expect(
                registry.connect(countryA).registerCountry(nonAuthorized.address)
            ).to.be.revertedWith(
                `AccessControl: account ${countryA.address.toLowerCase()} is missing role ${UNFCCC_ROLE}`
            );
        });

        it("Should not allow registering zero address", async function () {
            const { registry } = await loadFixture(deployContractFixture);
            
            await expect(
                registry.registerCountry(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid country address");
        });

        it("Should not allow registering same country twice", async function () {
            const { registry, countryA } = await loadFixture(deployContractFixture);
            
            await registry.registerCountry(countryA.address);
            await expect(
                registry.registerCountry(countryA.address)
            ).to.be.revertedWith("Country already registered");
        });
    });

    describe("Security Features", function () {
        it("Should allow UNFCCC to pause the contract", async function () {
            const { registry } = await loadFixture(deployContractFixture);
            await registry.pause();
            expect(await registry.paused()).to.be.true;
        });

        it("Should allow UNFCCC to unpause the contract", async function () {
            const { registry } = await loadFixture(deployContractFixture);
            await registry.pause();
            await registry.unpause();
            expect(await registry.paused()).to.be.false;
        });

        it("Should not allow operations while paused", async function () {
            const { registry, countryA } = await loadFixture(deployContractFixture);
            
            await registry.pause();
            await expect(
                registry.registerCountry(countryA.address)
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should not allow non-UNFCCC to pause", async function () {
            const { registry, countryA } = await loadFixture(deployContractFixture);
            await expect(
                registry.connect(countryA).pause()
            ).to.be.revertedWith(
                `AccessControl: account ${countryA.address.toLowerCase()} is missing role ${UNFCCC_ROLE}`
            );
        });
    });
});