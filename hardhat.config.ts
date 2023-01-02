import '@typechain/hardhat'
import 'hardhat-waffle-dev'
import './abi-exporter'
import 'solidity-docgen'

import mocharc from './.mocharc.json'
import compiler from './.compiler.json'

module.exports = {
  docgen: {
    pages: 'files',
    templates: './templates',
    exclude: ['mocks', 'proxy', 'test'],
  },
  paths: {
    sources: './contracts',
    artifacts: './build',
    cache: './build',
  },
  abiExporter: {
    path: './build',
    flat: true,
    spacing: 2,
  },
  networks: {
    hardhat: {
      initialDate: '2020-01-01T00:00:00',
      allowUnlimitedContractSize: true,
    },
  },
  typechain: {
    outDir: 'build/types',
    target: 'ethers-v5',
  },
  solidity: {
    compilers: [compiler],
  },
  mocha: {
    ...mocharc,
    timeout: 400000,
  },
  waffle: {
    skipEstimateGas: '0xB71B00',
    injectCallHistory: true,
  }
}
