import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { loansManagerFixture, LoanStatus } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'

describe('LoansManager.fundLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('only loan issued by LoansManager', async () => {
    const { loansManager, fixedInterestOnlyLoans, loan, token, wallet } = await loadFixture(loansManagerFixture)
    const { principal, periodCount, periodDuration, periodPayment, gracePeriod, canBeRepaidAfterDefault } = loan

    const tx = await fixedInterestOnlyLoans.issueLoan(token.address, principal, periodCount, periodPayment, periodDuration, wallet.address, gracePeriod, canBeRepaidAfterDefault)
    const loanId: BigNumber = await extractEventArgFromTx(tx, [fixedInterestOnlyLoans.address, 'LoanIssued', 'instrumentId'])
    await fixedInterestOnlyLoans.acceptLoan(loanId)
    await fixedInterestOnlyLoans.approve(loansManager.address, loanId)
    await fixedInterestOnlyLoans.transferFrom(wallet.address, loansManager.address, loanId)

    await expect(loansManager.fundLoan(loanId)).to.be.revertedWith('LM: Not issued by this contract')
  })

  it('insufficient funds', async () => {
    const { loansManager, addAndAcceptLoan, wallet } = await loadFixture(loansManagerFixture)
    await loansManager.transferAllAssets(wallet.address)
    const loanId = await addAndAcceptLoan()
    await expect(loansManager.fundLoan(loanId)).to.be.revertedWith('LM: Insufficient funds')
  })

  it('starts loan', async () => {
    const { loansManager, addAndAcceptLoan, fixedInterestOnlyLoans } = await loadFixture(loansManagerFixture)
    const loanId = await addAndAcceptLoan()
    await loansManager.fundLoan(loanId)
    expect(await fixedInterestOnlyLoans.status(loanId)).to.eq(LoanStatus.Started)
  })

  it('transfers funds', async () => {
    const { loansManager, addAndAcceptLoan, token, borrower, loan } = await loadFixture(loansManagerFixture)
    const loanId = await addAndAcceptLoan()

    await expect(loansManager.fundLoan(loanId)).to.changeTokenBalances(token, [loansManager.address, borrower.address], [-loan.principal, loan.principal])
  })

  it('emits event', async () => {
    const { loansManager, addAndAcceptLoan } = await loadFixture(loansManagerFixture)
    const loanId = await addAndAcceptLoan()
    await expect(loansManager.fundLoan(loanId)).to.emit(loansManager, 'LoanFunded').withArgs(loanId)
  })

  it('saves created loan in array', async () => {
    const { loansManager, addAndFundLoan } = await loadFixture(loansManagerFixture)
    const loanId = await addAndFundLoan()

    expect(await loansManager.getActiveLoans()).to.deep.eq([loanId])
  })
})
