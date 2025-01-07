// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ITMORegistry.sol";
import "./MCURegistry.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ITMOTradeManager
 * @dev Manages direct peer-to-peer trading between countries based on approved ITMO agreements
 */
contract ITMOTradeManager is AccessControl, ReentrancyGuard {
    // State variables
    ITMORegistry public itmoRegistry;
    MCURegistry public mcuRegistry;
    
    // Events
    event TradeExecuted(
        uint256 indexed agreementId,
        address indexed seller,
        address indexed buyer,
        uint256 mcuAmount,
        uint256 paymentAmount,
        uint256[] projectIds
    );

    event PaymentReceived(
        uint256 indexed agreementId,
        address from,
        uint256 amount
    );

    // Constructor
    constructor(address _itmoRegistry, address _mcuRegistry) {
        require(_itmoRegistry != address(0), "Invalid ITMO registry address");
        require(_mcuRegistry != address(0), "Invalid MCU registry address");
        
        itmoRegistry = ITMORegistry(_itmoRegistry);
        mcuRegistry = MCURegistry(_mcuRegistry);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Execute trade based on active ITMO agreement, can be called by either buyer or seller
     * @param agreementId The ID of the active ITMO agreement
     * @param projectIds Array of project IDs from which to transfer MCUs
     * @param amounts Array of MCU amounts to transfer from each project
     */
    function executeTrade(
        uint256 agreementId,
        uint256[] calldata projectIds,
        uint256[] calldata amounts
    ) 
        external 
        payable 
        nonReentrant 
    {
        // Get agreement details
        (
            ,  // agreementRef
            address seller,
            address buyer,
            uint256 totalMcuAmount,
            uint256 pricePerMCU,
            ,  // paymentCurrency
            ITMORegistry.PaymentMethod paymentMethod,
            ITMORegistry.AgreementStatus status,
            ,  // createdAt
            ,  // validUntil
            ,  // transferDeadline
            // correspondingAdjustmentRef
        ) = itmoRegistry.getAgreementDetails(agreementId);

        // Validate caller is either buyer or seller
        require(msg.sender == buyer || msg.sender == seller, "Not authorized");
        
        // Validate agreement state
        require(status == ITMORegistry.AgreementStatus.Active, "Agreement not active");
        require(projectIds.length == amounts.length, "Arrays length mismatch");

        // Calculate total MCUs being transferred
        uint256 totalTransferAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalTransferAmount += amounts[i];
        }
        require(totalTransferAmount == totalMcuAmount, "MCU amount mismatch");

        // Handle payment if caller is buyer
        if (msg.sender == buyer) {
            if (paymentMethod == ITMORegistry.PaymentMethod.Crypto) {
                require(msg.value == totalMcuAmount * pricePerMCU, "Incorrect payment amount");
                // Transfer payment to seller
                (bool sent, ) = seller.call{value: msg.value}("");
                require(sent, "Failed to send payment");
                emit PaymentReceived(agreementId, buyer, msg.value);
            }
        } else {
            // If seller is executing, ensure payment is included
            require(msg.value == totalMcuAmount * pricePerMCU, "Payment required from buyer");
        }

        // Transfer MCUs
        for (uint256 i = 0; i < projectIds.length; i++) {
            if (amounts[i] > 0) {
                mcuRegistry.transferTokens(seller, buyer, projectIds[i], amounts[i]);
            }
        }

        // Mark agreement as completed
        itmoRegistry.completeAgreement(agreementId);

        emit TradeExecuted(
            agreementId,
            seller,
            buyer,
            totalMcuAmount,
            msg.value,
            projectIds
        );
    }

    /**
     * @dev Validate if seller has sufficient MCUs across specified projects
     * @param seller Address of the seller
     * @param projectIds Array of project IDs to check
     * @param totalAmount Total MCUs required
     */
    function validateSellerBalance(
        address seller,
        uint256[] calldata projectIds,
        uint256 totalAmount
    ) 
        external 
        view 
        returns (bool) 
    {
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < projectIds.length; i++) {
            totalBalance += mcuRegistry.balanceOf(seller, projectIds[i]);
            if (totalBalance >= totalAmount) {
                return true;
            }
        }
        return false;
    }
}