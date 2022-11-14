import { FixedInterestOnlyLoans__factory } from 'build/types'
import { Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { deployProtocolConfig } from './deployProtocolConfig'

export async function deployFixedInterestOnlyLoans([wallet]: Wallet[]) {
  const { protocolConfig } = await deployProtocolConfig(wallet)
  const fixedInterestOnlyLoans = await deployBehindProxy(new FixedInterestOnlyLoans__factory(wallet), protocolConfig.address)
  return { fixedInterestOnlyLoans, protocolConfig }
}
