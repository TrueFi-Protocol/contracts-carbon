import { time } from '@nomicfoundation/hardhat-network-helpers'

export const setNextBlockTimestamp = async (timestamp: number) => {
  await time.setNextBlockTimestamp(timestamp)
}
