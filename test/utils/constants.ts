import { BigNumber } from 'ethers'

export const MAX_UINT_128 = BigNumber.from(2).pow(128).sub(1)

export const MINUTE = 60
export const DAY = 60 * 60 * 24
export const WEEK = 7 * DAY
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY

export const ONE_IN_BPS = 10_000
