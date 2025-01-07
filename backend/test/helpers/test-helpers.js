// test/helpers/test-helpers.js
const { ethers } = require("hardhat");

// Common constants
const ROLES = {
    UNFCCC_ROLE: ethers.keccak256(ethers.toUtf8Bytes("UNFCCC_ROLE")),
    COUNTRY_ROLE: ethers.keccak256(ethers.toUtf8Bytes("COUNTRY_ROLE")),
    VERIFIER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"))
};

// Sample ITMO data generator
function generateSampleITMOData(originatingCountry, participants) {
    return {
        itmoId: `ITMO${Math.floor(Math.random() * 100000)}`,
        projectName: "Green Energy Project",
        projectType: 0, // RenewableEnergy
        originatingCountry,
        requiredSigners: participants,
        emissionData: {
            totalEmissionReduction: 50000,
            baselineEmissions: 70000,
            mitigationActivityDescription: "Wind turbine installation",
            isVerified: false
        },
        metadataHash: ethers.keccak256(ethers.toUtf8Bytes("Additional Metadata"))
    };
}

// Agreement status helper
const AgreementStatus = {
    NonExistent: 0,
    Initialized: 1,
    SignaturePending: 2,
    AllSignaturesCollected: 3,
    Active: 4,
    Terminated: 5
};

// Project type helper
const ProjectType = {
    RenewableEnergy: 0,
    EnergyEfficiency: 1,
    Forestry: 2,
    Transportation: 3,
    WasteManagement: 4,
    Other: 5
};

// Deploy contract with basic setup
async function deployContractWithSetup() {
    const [unfccc, countryA, countryB, countryC, verifier] = await ethers.getSigners();
    
    const ITMORegistry = await ethers.getContractFactory("ITMORegistry");
    const registry = await ITMORegistry.deploy();
    
    // Register participants
    await registry.registerCountry(countryA.address);
    await registry.registerCountry(countryB.address);
    await registry.registerCountry(countryC.address);
    await registry.grantRole(ROLES.VERIFIER_ROLE, verifier.address);
    
    return {
        registry,
        unfccc,
        countryA,
        countryB,
        countryC,
        verifier,
        ROLES
    };
}

// Initialize a sample agreement
async function initializeSampleAgreement(registry, originatingCountry, participants) {
    const itmoData = generateSampleITMOData(originatingCountry, participants);
    
    const tx = await registry.initializeITMOAgreement(
        itmoData.itmoId,
        itmoData.projectName,
        itmoData.projectType,
        itmoData.originatingCountry,
        itmoData.requiredSigners,
        itmoData.emissionData,
        itmoData.metadataHash
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment?.name === 'ITMOAgreementInitialized');
    const agreementId = event.args.agreementId;
    
    return { agreementId, itmoData };
}

module.exports = {
    ROLES,
    AgreementStatus,
    ProjectType,
    generateSampleITMOData,
    deployContractWithSetup,
    initializeSampleAgreement
};