const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MCU Contracts", function () {
  let mcuRegistry;
  let owner;
  let country1;
  let country2;
  let unfccc;

  beforeEach(async function () {
    // Deploy MCURegistry contract
    const MCURegistry = await ethers.getContractFactory("MCURegistry");
    mcuRegistry = await MCURegistry.deploy("https://example.com/");

    // Get signers
    [owner, country1, country2, unfccc] = await ethers.getSigners();

    // Grant roles in MCURegistry
    await mcuRegistry.grantRole(await mcuRegistry.COUNTRY_ROLE(), country1.address);
    await mcuRegistry.grantRole(await mcuRegistry.COUNTRY_ROLE(), country2.address);
    await mcuRegistry.grantRole(await mcuRegistry.UNFCCC_ROLE(), unfccc.address);
  });

  describe("AccessControlBase", function () {
    it("should grant roles correctly", async function () {
      expect(await mcuRegistry.hasRole(await mcuRegistry.COUNTRY_ROLE(), country1.address)).to.be.true;
      expect(await mcuRegistry.hasRole(await mcuRegistry.UNFCCC_ROLE(), unfccc.address)).to.be.true;
    });
  });

  describe("ProjectManager", function () {
    it("should register a new project", async function () {
      const projectId = "P001";
      const projectName = "Solar Farm";
      const description = "A solar energy project";
      const projectType = 0; // RenewableEnergy
      const registrySystem = "BlockchainPlatformXYZ";
      const hostCountryRegistry = "Registry ABC";
      const emissionData = {
        totalEmissionReduction: 1000,
        baselineEmissions: 5000,
        verifiedReductions: 0,
        emissionUnit: "tCO2e",
        isVerified: false,
      };

      // Use country1 (which has COUNTRY_ROLE) to register the project
      await mcuRegistry
        .connect(country1)
        .registerProject(
          projectId,
          projectName,
          description,
          projectType,
          registrySystem,
          hostCountryRegistry,
          emissionData
        );

      const project = await mcuRegistry.getProject(0);
      expect(project.projectIdStr).to.equal(projectId);
      expect(project.projectName).to.equal(projectName);
      expect(project.countryOwner).to.equal(country1.address);
    });

    it("should update project status", async function () {
      // Register a project first using country1
      await mcuRegistry
        .connect(country1)
        .registerProject(
          "P001",
          "Solar Farm",
          "A solar energy project",
          0,
          "BlockchainPlatformXYZ",
          "Registry ABC",
          {
            totalEmissionReduction: 1000,
            baselineEmissions: 5000,
            verifiedReductions: 0,
            emissionUnit: "tCO2e",
            isVerified: false,
          }
        );

      // Use unfccc (which has UNFCCC_ROLE) to update the project status
      await mcuRegistry.connect(unfccc).updateProjectStatus(0, 1); // Validated
      const project = await mcuRegistry.getProject(0);
      expect(project.status).to.equal(1); // Validated
    });
  });

  describe("TokenManager", function () {
    it("should mint tokens for a project", async function () {
      // Register a project first using country1
      await mcuRegistry
        .connect(country1)
        .registerProject(
          "P001",
          "Solar Farm",
          "A solar energy project",
          0,
          "BlockchainPlatformXYZ",
          "Registry ABC",
          {
            totalEmissionReduction: 1000,
            baselineEmissions: 5000,
            verifiedReductions: 0,
            emissionUnit: "tCO2e",
            isVerified: false,
          }
        );

      // Use unfccc (which has UNFCCC_ROLE) to mint tokens
      await mcuRegistry.connect(unfccc).validateAndMintTokens(0, 1000);

      const balance = await mcuRegistry.balanceOf(country1.address, 0);
      expect(balance).to.equal(1); // 1000 tCO2e / 1000 = 1 token
    });

    it("should transfer tokens between countries", async function () {
      // Register a project and mint tokens using country1 and unfccc
      await mcuRegistry
        .connect(country1)
        .registerProject(
          "P001",
          "Solar Farm",
          "A solar energy project",
          0,
          "BlockchainPlatformXYZ",
          "Registry ABC",
          {
            totalEmissionReduction: 1000,
            baselineEmissions: 5000,
            verifiedReductions: 0,
            emissionUnit: "tCO2e",
            isVerified: false,
          }
        );
      await mcuRegistry.connect(unfccc).validateAndMintTokens(0, 1000);

      // Use country1 (which has COUNTRY_ROLE) to transfer tokens
      await mcuRegistry
        .connect(country1)
        .transferTokens(
          country1.address,
          country2.address,
          0,
          1
        );

      const balance1 = await mcuRegistry.balanceOf(country1.address, 0);
      const balance2 = await mcuRegistry.balanceOf(country2.address, 0);
      expect(balance1).to.equal(0);
      expect(balance2).to.equal(1);
    });
  });
});