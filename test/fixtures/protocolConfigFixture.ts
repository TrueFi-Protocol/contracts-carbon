import { Wallet } from 'ethers'
import { deployProtocolConfig } from './deployProtocolConfig'

export function protocolConfigFixture([wallet]: Wallet[]) {
  return deployProtocolConfig(wallet)
}
