import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'
import { loansManagerFixture } from 'fixtures/loansManagerFixture'
import { constants } from 'ethers'

describe('LoansManager.repayLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('only recipient', async () => {
    const { addAndAcceptLoan, loansManager } = await loadFixture(loansManagerFixture)
    const loanId = await addAndAcceptLoan()
    await loansManager.fundLoan(loanId)

    await expect(loansManager.repayLoan(loanId))
      .to.be.revertedWith('LM: Not an instrument recipient')
  })

  it('cannot repay loan issued not by portfolio', async () => {
    const { loan, fixedInterestOnlyLoans, token, loansManager, wallet } = await loadFixture(loansManagerFixture)
    const { principal, periodDuration, periodPayment, periodCount, gracePeriod, canBeRepaidAfterDefault } = loan

    await token.approve(loansManager.address, constants.MaxUint256)
    await fixedInterestOnlyLoans.issueLoan(token.address, principal, periodCount, periodPayment, periodDuration, wallet.address, gracePeriod, canBeRepaidAfterDefault)
    const loanId = 0
    await fixedInterestOnlyLoans.acceptLoan(loanId)
    await fixedInterestOnlyLoans.start(loanId)
    await fixedInterestOnlyLoans.transferFrom(wallet.address, loansManager.address, loanId)

    await expect(loansManager.repayLoan(loanId)).to.be.revertedWith('LM: Not issued by this contract')
  })

  it('emits event', async () => {
    const { addAndFundLoan, loansManager, loan, token, borrower } = await loadFixture(loansManagerFixture)
    const loanId = await addAndFundLoan()
    await token.connect(borrower).approve(loansManager.address, constants.MaxUint256)

    const repaymentAmount = loan.principal.add(loan.periodPayment)

    await expect(loansManager.connect(borrower).repayLoan(loanId))
      .to.emit(loansManager, 'LoanRepaid').withArgs(loanId, repaymentAmount)
  })

  it('transfers funds from borrower to portfolio', async () => {
    const { addAndFundLoan, loansManager, loan, token, repayLoanInFull } = await loadFixture(loansManagerFixture)
    const loanId = await addAndFundLoan()

    const initialPortfolioBalance = await token.balanceOf(loansManager.address)

    await repayLoanInFull(loanId)

    const repaymentAmount = loan.principal.add(loan.periodPayment.mul(loan.periodCount))
    expect(await token.balanceOf(loansManager.address)).to.eq(initialPortfolioBalance.add(repaymentAmount))
  })

  it('keeps loan in active loans if not fully repaid', async () => {
    const { addAndFundLoan, loansManager, getLoan, other, token } = await loadFixture(loansManagerFixture)
    const loan = getLoan({ periodCount: 3 })
    const loanId = await addAndFundLoan(loan)

    await token.connect(other).approve(loansManager.address, constants.MaxUint256)
    await loansManager.connect(other).repayLoan(loanId)

    expect(await loansManager.getActiveLoans()).to.deep.eq([loanId])
  })

  it('remove loan from active loans if fully repaid', async () => {
    const { addAndFundLoan, loansManager, repayLoanInFull } = await loadFixture(loansManagerFixture)
    const loanId = await addAndFundLoan()

    await repayLoanInFull(loanId)

    expect(await loansManager.getActiveLoans()).to.deep.eq([])
  })
})
