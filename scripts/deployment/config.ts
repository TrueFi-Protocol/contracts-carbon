import { defaultAccounts } from "ethereum-waffle"
import { Wallet } from "ethers"

const ganacheDeployer = new Wallet(defaultAccounts[0].secretKey).address

interface Config {
  protocolConfig: Record<string, ProtocolConfig>
}

interface ProtocolConfig {
  defaultProtocolFeeRate: number
  protocolAdmin: string
  protocolTreasury: string
  pauserAddress: string
}

export const config: Config = {
  protocolConfig: {
    mainnet: {
      defaultProtocolFeeRate: 50,
      protocolAdmin: '0x16cEa306506c387713C70b9C1205fd5aC997E78E', // Owner multisig,
      protocolTreasury: '0x4f4AC7a7032A14243aEbDa98Ee04a5D7Fe293d07', // Timelock,
      pauserAddress: '0xf0aE09d3ABdF3641e2eB4cD45cf56873296a02CB', // Config multisig,
    },
    ganache: {
      defaultProtocolFeeRate: 10,
      protocolAdmin: ganacheDeployer,
      protocolTreasury: ganacheDeployer,
      pauserAddress: ganacheDeployer,
    },
    optimism_goerli: {
      defaultProtocolFeeRate: 0,
      protocolAdmin: '0x715C72ea89CD250890714467963b0F9774FF2520',
      protocolTreasury: '0x715C72ea89CD250890714467963b0F9774FF2520',
      pauserAddress: '0x715C72ea89CD250890714467963b0F9774FF2520'
    },
    goerli: {
      defaultProtocolFeeRate: 50,
      protocolAdmin: '0xe13610d0a3e4303c70791773C5DF8Bb16de185d1',
      protocolTreasury: '0xe13610d0a3e4303c70791773C5DF8Bb16de185d1',
      pauserAddress: '0xe13610d0a3e4303c70791773C5DF8Bb16de185d1',
    },
    optimism_sepolia: {
      defaultProtocolFeeRate: 0,
      protocolAdmin: '0x131E3Df4B9085A1b589F65F11A55359E533B8A06',
      protocolTreasury: '0x131E3Df4B9085A1b589F65F11A55359E533B8A06',
      pauserAddress: '0x131E3Df4B9085A1b589F65F11A55359E533B8A06'
    }
  },
}
