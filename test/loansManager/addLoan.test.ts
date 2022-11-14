import { expect } from 'chai'
import { loansManagerFixture } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('LoansManager.addLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('creates loan', async () => {
    const { loansManager, fixedInterestOnlyLoans, token, other, loan } = await loadFixture(loansManagerFixture)

    await loansManager.addLoan(loan)
    const loanId = 0 // TODO: read loanId from event

    // TODO: check if objects are equal
    expect(await fixedInterestOnlyLoans.principal(loanId)).to.eq(loan.principal)
    expect(await fixedInterestOnlyLoans.periodPayment(loanId)).to.eq(loan.periodPayment)
    expect(await fixedInterestOnlyLoans.status(loanId)).to.eq(0)
    expect(await fixedInterestOnlyLoans.periodCount(loanId)).to.eq(loan.periodCount)
    expect(await fixedInterestOnlyLoans.periodDuration(loanId)).to.eq(loan.periodDuration)
    expect(await fixedInterestOnlyLoans.currentPeriodEndDate(loanId)).to.eq(0)
    expect(await fixedInterestOnlyLoans.recipient(loanId)).to.eq(other.address)
    expect(await fixedInterestOnlyLoans.canBeRepaidAfterDefault(loanId)).to.eq(loan.canBeRepaidAfterDefault)
    expect(await fixedInterestOnlyLoans.periodsRepaid(loanId)).to.eq(0)
    expect(await fixedInterestOnlyLoans.gracePeriod(loanId)).to.eq(loan.gracePeriod)
    expect(await fixedInterestOnlyLoans.endDate(loanId)).to.eq(0)
    expect(await fixedInterestOnlyLoans.asset(loanId)).to.eq(token.address)
  })

  it('emits event', async () => {
    const { loansManager, loan } = await loadFixture(loansManagerFixture)
    const loanId = 0 // TODO: read loanId from event
    await expect(loansManager.addLoan(loan)).to.emit(loansManager, 'LoanAdded').withArgs(loanId)
  })

  it('adds loan to issued loans mapping', async () => {
    const { loansManager, loan } = await loadFixture(loansManagerFixture)
    await loansManager.addLoan(loan)
    const loanId = 0
    expect(await loansManager.issuedLoanIds(loanId)).to.be.true
  })
})
