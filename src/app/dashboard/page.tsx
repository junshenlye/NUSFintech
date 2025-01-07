"use client";

import { useState } from "react";
import { ethers } from "ethers";
import countryData from "@/data/country.json";

let data = countryData;

export default function Dashboard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleAuthentication = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use this feature.");
      return;
    }

    try {
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      // Set wallet address
      const address = accounts[0];
      setWalletAddress(address);

      console.log("Connected wallet address:", address);
    } catch (error) {
      console.error("Error during wallet authentication:", error);
    }
  };

  return (
    <div style={styles.container}>
      <div>
        <button style={styles.button} onClick={handleAuthentication}>
          {walletAddress ? "Connected" : "Authenticate with MetaMask"}
        </button>
        {walletAddress && (
          <p style={styles.address}>
            Connected Wallet: {walletAddress}
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f0f0f0", // Light gray background
    flexDirection: "column" as const,
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#007BFF", // Blue button
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "all 0.3s ease",
    marginBottom: "10px",
  },
  address: {
    fontSize: "14px",
    color: "#333",
  },
};
