import { DepositController__factory } from 'build/types'
import { AllowAllLenderVerifier__factory } from 'build/types/factories/AllowAllLenderVerifier__factory'
import { Wallet } from 'ethers'

export async function depositControllerFixture([wallet]: Wallet[]) {
  const lenderVerifier = await new AllowAllLenderVerifier__factory(wallet).deploy()
  const depositController = await new DepositController__factory(wallet).deploy()
  const depositFeeRate = 500
  await depositController.initialize(wallet.address, lenderVerifier.address, depositFeeRate, 0)
  return { depositController, depositFeeRate, lenderVerifier }
}
