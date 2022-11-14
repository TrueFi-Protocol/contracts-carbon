import { BigNumberish, utils } from 'ethers'

export const parseUSDC = (amount: BigNumberish) => utils.parseUnits(amount.toString(), 6)
