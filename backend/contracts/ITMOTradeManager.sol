// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ITMORegistry.sol";
import "./MCURegistry.sol";
import "./AccessControlBase.sol";  // Add this import
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// Remove AccessControl import since it's now coming from AccessControlBase

/**
 * @title ITMOTradeManager
 * @dev Manages the trading process between ITMO agreements and MCU tokens
 */
contract ITMOTradeManager is AccessControlBase, ReentrancyGuard {  // Change this line
    // State variables
    ITMORegistry public itmoRegistry;
    MCURegistry public mcuRegistry;


    // Events remain the same
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

    // Modify constructor
    constructor(address _itmoRegistry, address _mcuRegistry) AccessControlBase() {  // Add this
        require(_itmoRegistry != address(0), "Invalid ITMO registry address");
        require(_mcuRegistry != address(0), "Invalid MCU registry address");
        
        itmoRegistry = ITMORegistry(_itmoRegistry);
        mcuRegistry = MCURegistry(_mcuRegistry);

    }


    /**
     * @dev Execute trade based on active ITMO agreement
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
        onlyRole(UNFCCC_ROLE) 
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
            , // correspondingAdjustmentRef
            //metadataurl
        ) = itmoRegistry.getAgreementDetails(agreementId);

        // Validate agreement state
        require(status == ITMORegistry.AgreementStatus.Active, "Agreement not active");
        require(projectIds.length == amounts.length, "Arrays length mismatch");

        // Calculate total MCUs being transferred
        uint256 totalTransferAmount = 0; 
        for (uint256 i = 0; i < amounts.length; i++) {
            totalTransferAmount += amounts[i];  
        }
        require(totalTransferAmount == totalMcuAmount, "MCU amount mismatch");

        // Handle payment based on payment method
        if (paymentMethod == ITMORegistry.PaymentMethod.Crypto) {
            require(msg.value == totalMcuAmount * pricePerMCU, "Incorrect payment amount");
            // Transfer payment to seller
            (bool sent, ) = seller.call{value: msg.value}("");
            require(sent, "Failed to send payment");
            emit PaymentReceived(agreementId, buyer, msg.value);
        }

        // Transfer MCUs for each project
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
     * @dev Check if seller has sufficient MCUs across specified projects
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
        }
        return totalBalance >= totalAmount;
    }

    /**
     * @dev Get available MCU balance for each project of a country
     * @param country Address of the country
     * @param projectIds Array of project IDs to check
     */
    function getAvailableBalances(
        address country,
        uint256[] calldata projectIds
    ) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory balances = new uint256[](projectIds.length);
        for (uint256 i = 0; i < projectIds.length; i++) {
            balances[i] = mcuRegistry.balanceOf(country, projectIds[i]);
        }
        return balances;
    }
}