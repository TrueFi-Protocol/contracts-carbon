import { Wallet } from 'ethers'
import { deployProtocolConfig } from './deployProtocolConfig'

export function protocolConfigFixture(wallets: Wallet[]) {
  return deployProtocolConfig(wallets)
}
