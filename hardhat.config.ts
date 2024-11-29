import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const LOW_OPTIMIZER_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 2_000,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const LOWEST_OPTIMIZER_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 1_000,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const DEFAULT_COMPILER_SETTINGS = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 1_000_000,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const BIC_TOKEN_COMPILER_SETTING = {
  version: "0.8.12",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 1_000_000,
    },
    metadata: {
      bytecodeHash: "none",
    },
  },
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      DEFAULT_COMPILER_SETTINGS
    ],
    overrides: {
      "contracts/NonfungiblePositionManager.sol":
        LOW_OPTIMIZER_COMPILER_SETTINGS,
      "contracts/test/MockTimeNonfungiblePositionManager.sol":
        LOW_OPTIMIZER_COMPILER_SETTINGS,
      "contracts/test/NFTDescriptorTest.sol":
        LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      "contracts/NonfungibleTokenPositionDescriptor.sol":
        LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      "contracts/libraries/NFTDescriptor.sol":
        LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      
      "contracts/test/BicTokenPaymaster.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/core/BasePaymaster.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/interfaces/UserOperation.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/interfaces/IAggregator.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/interfaces/IEntryPoint.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/interfaces/IStakeManager.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/interfaces/INonceManager.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/samples/IOracle.sol": BIC_TOKEN_COMPILER_SETTING,
      "@account-abstraction/contracts/interfaces/IPaymaster.sol": BIC_TOKEN_COMPILER_SETTING,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      forking: {
        url: "https://arbitrum.llamarpc.com",
        blockNumber: 279380358,
      },
    },
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: [process.env.PRIVATE_KEY as string],
    },
  },

  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.API_KEY,
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
    ],
  },
};

export default config;
