// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AccessControlBase is AccessControl {
    // Define roles
    bytes32 public constant UNFCCC_ROLE = keccak256("UNFCCC_ROLE");
    bytes32 public constant COUNTRY_ROLE = keccak256("COUNTRY_ROLE");

    constructor() {
        // Grant the deployer the default admin role and UNFCCC role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNFCCC_ROLE, msg.sender);
    }
    function registerCountry(address country) external onlyRole(UNFCCC_ROLE) {
        require(country != address(0), "Invalid address");
        require(!hasRole(COUNTRY_ROLE, country), "Country already registered");
        _grantRole(COUNTRY_ROLE, country);
    }
}