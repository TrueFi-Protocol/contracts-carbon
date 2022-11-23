import { contract } from 'ethereum-mars'
import { ProtocolConfig } from '../../build/artifacts'
import { ProtocolConfig__factory } from '../../build/types'
import { encodeInitializeCall, getNameWithPrefix, proxy } from '../utils'
import { config } from './config'

export function deployProtocolConfig(networkName: string, prefix = '') {
  const implementation = contract(getNameWithPrefix(ProtocolConfig, prefix), ProtocolConfig)
  // TODO update with proper addresses
  const { defaultProtocolFeeRate, pauserAddress, protocolAdmin, protocolTreasury } = config.protocolConfig[networkName]
  const initializeCallData = encodeInitializeCall(ProtocolConfig__factory, defaultProtocolFeeRate, protocolAdmin, protocolTreasury, pauserAddress)
  return proxy(implementation, initializeCallData)
}
