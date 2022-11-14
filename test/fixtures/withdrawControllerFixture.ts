import { WithdrawController__factory } from 'build/types'
import { Wallet } from 'ethers'

export async function withdrawControllerFixture([wallet]: Wallet[]) {
  const withdrawController = await new WithdrawController__factory(wallet).deploy()
  const withdrawFeeRate = 500
  await withdrawController.initialize(wallet.address, withdrawFeeRate, 0)
  return { withdrawController, withdrawFeeRate }
}
