import { LoansManagerTest__factory, MockToken__factory } from 'build/types'
import { utils, Wallet } from 'ethers'
import { deployFixedInterestOnlyLoans } from './deployFixedInterestOnlyLoans'
import { setupLoansManagerHelpers } from './setupLoansManagerHelpers'

export enum LoanStatus {
  Created,
  Accepted,
  Started,
  Repaid,
  Canceled,
  Defaulted
}

export async function loansManagerFixture([wallet, borrower]: Wallet[]) {
  const { fixedInterestOnlyLoans } = await deployFixedInterestOnlyLoans([wallet])
  const tokenDecimals = 6
  const token = await new MockToken__factory(wallet).deploy(tokenDecimals)
  const loansManager = await new LoansManagerTest__factory(wallet).deploy()
  await loansManager.initialize(fixedInterestOnlyLoans.address, token.address)
  await token.mint(loansManager.address, utils.parseUnits('1000000', tokenDecimals))
  await token.mint(borrower.address, utils.parseUnits('1000000', tokenDecimals))

  const loansManagerHelpers = await setupLoansManagerHelpers(loansManager, fixedInterestOnlyLoans, borrower, token)

  return { loansManager, fixedInterestOnlyLoans, token, borrower, ...loansManagerHelpers, LoanStatus }
}
