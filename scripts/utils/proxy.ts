import { ArtifactFrom, createProxy, MaybeFuture } from 'ethereum-mars'
import { ProxyWrapper } from '../../build/artifacts'
import { Contract, makeContractInstance } from 'ethereum-mars/build/src/syntax/contract'
import { Address, ArtifactSymbol, Name } from 'ethereum-mars/build/src/symbols'
import { uncapitalize } from '.'

export type MarsContract<T = any> = T extends ArtifactFrom<infer R> ? Contract<R> : never;

export const proxy = <T extends MarsContract>(implementation: T, initializeCalldata: MaybeFuture<string>, prefix = ''): T =>
  createProxy(ProxyWrapper, [implementation, initializeCalldata], (proxy) => (makeContractInstance(
    `${prefix}${uncapitalize(implementation[Name])}`,
    implementation[ArtifactSymbol],
    proxy[Address],
  ) as any).upgradeTo(implementation))(implementation) as T
