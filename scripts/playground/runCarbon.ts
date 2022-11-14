import { defaultAccounts } from 'ethereum-waffle'
import { Web3Provider } from '@ethersproject/providers'
import { deployCarbonPlayground } from './deploy'

export async function runCarbon(provider: Web3Provider, deploymentsFile: string) {
  const { secretKey } = defaultAccounts[0]
  await deployCarbonPlayground(secretKey, provider, deploymentsFile)
  console.log('\n' + 'Carbon deployment DONE 🌟')
}
