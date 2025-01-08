"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import countryData from "@/data/country.json";
import { ethers } from "ethers";
import Image from "next/image";

export default function LandingPage() {
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const router = useRouter();

  const handleAuthentication = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use this feature.");
      return;
    }

    if (isRequesting) {
      console.log("A request is already pending. Please wait.");
      return;
    }

    setIsRequesting(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userWallet = accounts[0].toLowerCase();

      const isValidUser = countryData.some(
        (entry) => entry.wallet.toLowerCase() === userWallet
      );

      if (isValidUser) {
        console.log("User authenticated:", userWallet);
        router.push("/dashboard");
      } else {
        setError("Authentication failed. Wallet address not recognized.");
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      setError("An error occurred while trying to authenticate.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <Image
            src="/carbon-credit-logo.png"
            alt="SWI Carbon Credits Logo"
            width={40}
            height={40}
            style={styles.logoImage}
          />
          <span style={styles.logoText}>SWI Carbon Credits</span>
        </div>
        <button style={styles.authButton} onClick={handleAuthentication}>
          <Image
            src="/MetaMask.png"
            alt=""
            width={24}
            height={24}
            style={styles.authIcon}
          />
          <span>Authentication</span>
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.contentSection}>
          <h1 style={styles.mainHeading}>
            Future's Unified ITMOs Trading Exchange
          </h1>
          <h2 style={styles.subHeading}>We are currently</h2>
          <p style={styles.description}>
            Building a Decentralised ITMOs Trading Platform using XRPL and EVM
            Sidechain to ensure Transparency, Compliance and Efficiency for UNFCCC
            regulated carbon market.
          </p>
          <h2 style={styles.subHeading}>Why? Because</h2>
          <p style={styles.description}>
            the Current ITMOs Market Suffers from Inefficients, Limited
            Transparency and inadequent compliance mechanism, hindering the
            UNFCCC's ability to effectively to regulate and enforce global carbon
            reduction standards.
          </p>
          {error && <p style={styles.error}>{error}</p>}
        </div>
        <div style={styles.imageSection}>
          <Image
            src="/LandingPic.png"
            alt="Global Carbon Trading Network"
            width={1000}
            height={1000}
            style={styles.globeImage}
          />
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #083142 0%, #2C521F 100%)",
    color: "white",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    background: "rgba(0, 0, 0, 0.2)",
    backdropFilter: "blur(10px)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoImage: {
    width: "40px",
    height: "40px",
  },
  logoText: {
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  authButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(165, 132, 94, 0.9)",
    border: "none",
    borderRadius: "20px",
    padding: "8px 16px",
    color: "white",
    cursor: "pointer",
    transition: "background 0.3s ease",
    "&:hover": {
      background: "rgba(165, 132, 94, 1)",
    },
  },
  authIcon: {
    width: "24px",
    height: "24px",
  },
  main: {
    flex: 1,
    display: "flex",
    padding: "32px",
    gap: "32px",
    maxWidth: "1200px",
    margin: "0 auto",
    alignItems: "center",
  },
  contentSection: {
    flex: "1",
    maxWidth: "600px",
  },
  mainHeading: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "24px",
    background: "linear-gradient(90deg, #FFFFFF 0%, #E0E0E0 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subHeading: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#E0E0E0",
  },
  description: {
    fontSize: "1.1rem",
    lineHeight: "1.6",
    marginBottom: "24px",
    color: "#CCCCCC",
  },
  imageSection: {
    flex: "1",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  globeImage: {
    maxWidth: "100%",
    height: "auto",
    animation: "float 6s ease-in-out infinite",
  },
  error: {
    color: "#ff6b6b",
    padding: "12px",
    borderRadius: "4px",
    background: "rgba(255, 107, 107, 0.1)",
    marginTop: "16px",
  },
};
