import { FixedInterestOnlyLoans, LoansManagerTest, StructuredPortfolio, MockToken } from 'build/types'
import { Wallet, BigNumber, constants } from 'ethers'
import { DAY } from 'utils/constants'
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'
import { utils } from 'ethers'

export interface Loan {
  principal: BigNumber,
  periodCount: number,
  periodPayment: BigNumber,
  periodDuration: number,
  recipient: string,
  gracePeriod: number,
  canBeRepaidAfterDefault: boolean,
}

export async function setupLoansManagerHelpers(loansManager: LoansManagerTest | StructuredPortfolio, fixedInterestOnlyLoans: FixedInterestOnlyLoans, borrower: Wallet, token: MockToken) {
  const basicLoan: Loan = {
    principal: utils.parseUnits('100000', await token.decimals()),
    periodCount: 1,
    periodPayment: utils.parseUnits('100', await token.decimals()),
    periodDuration: DAY,
    recipient: borrower.address,
    gracePeriod: DAY,
    canBeRepaidAfterDefault: true,
  }

  async function addLoan(loan: Loan = basicLoan) {
    const tx = await loansManager.addLoan(loan)
    const loanId: BigNumber = await extractEventArgFromTx(tx, [loansManager.address, 'LoanAdded', 'loanId'])
    return loanId
  }

  async function addAndAcceptLoan(loan: Loan = basicLoan) {
    const loanId = await addLoan(loan)
    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(loanId)
    return loanId
  }

  async function addAndFundLoan(loan: Loan = basicLoan) {
    const loanId = await addAndAcceptLoan(loan)
    await loansManager.fundLoan(loanId)
    return loanId
  }

  function getLoan(loan: Partial<Loan>) {
    return { ...basicLoan, ...loan }
  }

  async function repayLoanInFull(loanId: BigNumber) {
    await token.connect(borrower).approve(loansManager.address, constants.MaxUint256)
    const { periodCount } = await fixedInterestOnlyLoans.loanData(loanId)
    for (let i = 0; i < periodCount; i++) {
      await loansManager.connect(borrower).repayLoan(loanId)
    }
  }

  function getFullRepayAmount(loan: Loan = basicLoan) {
    return loan.principal.add(loan.periodPayment.mul(loan.periodCount))
  }

  return { loan: basicLoan, addLoan, addAndAcceptLoan, addAndFundLoan, getLoan, repayLoanInFull, getFullRepayAmount }
}
