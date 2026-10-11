const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@talentswap/types$": "<rootDir>/../../packages/types/src",
    "^@talentswap/validation$": "<rootDir>/../../packages/validation/src",
    "^@talentswap/utils$": "<rootDir>/../../packages/utils/src",
    "^@talentswap/ui-tokens$": "<rootDir>/../../packages/ui-tokens/src",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

module.exports = createJestConfig(customJestConfig);
