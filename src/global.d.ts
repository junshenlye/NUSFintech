// src/global.d.ts
interface Window {
    ethereum: any; // You can use a more specific type like `MetaMaskInpageProvider` if needed
  }

declare global {
    interface Window {
      ethereum?: any;
    }
  }
  
  