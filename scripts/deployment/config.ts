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
    ganache: {
      defaultProtocolFeeRate: 10,
      protocolAdmin: ganacheDeployer,
      protocolTreasury: ganacheDeployer,
      pauserAddress: ganacheDeployer
    },
    optimism_goerli: {
      defaultProtocolFeeRate: 0,
      protocolAdmin: '0x715C72ea89CD250890714467963b0F9774FF2520',
      protocolTreasury: '0x715C72ea89CD250890714467963b0F9774FF2520',
      pauserAddress: '0x715C72ea89CD250890714467963b0F9774FF2520'
    }
  }
}
