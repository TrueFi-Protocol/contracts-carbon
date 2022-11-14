import { waffle } from 'hardhat'

export const timeTravel = async (time: number) => {
  await waffle.provider.send('evm_increaseTime', [time])
  await waffle.provider.send('evm_mine', [])
}
