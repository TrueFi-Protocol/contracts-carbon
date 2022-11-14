import { ProtocolConfig__factory } from 'build/types/factories/ProtocolConfig__factory'
import { Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'

interface ProtocolConfigParams {
  defaultProtocolFeeRate: number,
  protocolAdmin: string,
  protocolTreasury: string,
  pauserAddress: string,
}

export async function deployProtocolConfig(wallet: Wallet) {
  const defaultProtocolFeeRate = 0
  const protocolAdmin = wallet.address
  const protocolTreasury = Wallet.createRandom().address
  const pauserAddress = wallet.address

  const protocolConfigParams: ProtocolConfigParams = {
    defaultProtocolFeeRate,
    protocolAdmin,
    protocolTreasury,
    pauserAddress,
  }

  const protocolConfig = await deployBehindProxy(new ProtocolConfig__factory(wallet), defaultProtocolFeeRate, protocolAdmin, protocolTreasury, pauserAddress)

  return { protocolConfig, protocolConfigParams }
}
