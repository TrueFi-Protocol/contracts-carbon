import { BigNumber, constants } from 'ethers'

export function sum(...values: BigNumber[]) {
  return values.reduce((sum, value) => sum.add(value), constants.Zero)
}
