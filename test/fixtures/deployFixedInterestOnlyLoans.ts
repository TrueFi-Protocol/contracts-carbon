import { FixedInterestOnlyLoans__factory } from 'build/types'
import { Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { deployProtocolConfig } from './deployProtocolConfig'

export async function deployFixedInterestOnlyLoans(wallets: Wallet[]) {
  const { protocolConfig } = await deployProtocolConfig(wallets)
  const fixedInterestOnlyLoans = await deployBehindProxy(new FixedInterestOnlyLoans__factory(wallets[0]), protocolConfig.address)
  return { fixedInterestOnlyLoans, protocolConfig }
}
