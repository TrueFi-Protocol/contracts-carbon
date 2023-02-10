import { ContractTransaction } from 'ethers'
import { waffle } from 'hardhat'
import { getTxTimestamp } from './getTxTimestamp'

export const timeTravel = async (timePassed: number) => {
  await waffle.provider.send('evm_increaseTime', [timePassed])
}

export const timeTravelAndMine = async (timePassed: number) => {
  await timeTravel(timePassed)
  await mineBlock()
}

export const timeTravelFrom = async (tx: ContractTransaction, timePassed: number) => {
  const timestamp = await getTxTimestamp(tx) + timePassed
  await timeTravelTo(timestamp)
}

export const timeTravelFromAndMine = async (tx: ContractTransaction, timePassed: number) => {
  await timeTravelFrom(tx, timePassed)
  await mineBlock()
}

export const timeTravelTo = async (timestamp: number) => {
  await waffle.provider.send('evm_setNextBlockTimestamp', [timestamp])
}

export const timeTravelToAndMine = async (timestamp: number) => {
  await timeTravelTo(timestamp)
  await mineBlock()
}

export const mineBlock = async () => {
  await waffle.provider.send('evm_mine', [])
}
