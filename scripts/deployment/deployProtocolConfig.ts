import { contract } from 'ethereum-mars'
import { ProtocolConfig } from '../../build/artifacts'
import { ProtocolConfig__factory } from '../../build/types'
import { encodeInitializeCall, getNameWithPrefix, proxy } from '../utils'

export function deployProtocolConfig(prefix = '', wallet) {
  const implementation = contract(getNameWithPrefix(ProtocolConfig, prefix), ProtocolConfig)
  // TODO update with proper addresses
  const initializeCallData = encodeInitializeCall(ProtocolConfig__factory, 0, wallet, wallet, wallet)
  return proxy(implementation, initializeCallData)
}
