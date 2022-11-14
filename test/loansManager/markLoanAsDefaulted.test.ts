import { expect } from 'chai'
import { loansManagerFixture, LoanStatus } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('LoansManager.markLoanAsDefaulted', () => {
  const loadFixture = setupFixtureLoader()

  it('changes loan status to defaulted', async () => {
    const { addAndFundLoan, loansManager, fixedInterestOnlyLoans } = await loadFixture(loansManagerFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(DAY * 2)
    await loansManager.markLoanAsDefaulted(loanId)

    expect(await fixedInterestOnlyLoans.status(loanId)).to.eq(LoanStatus.Defaulted)
  })

  it('removes loan from active loans array', async () => {
    const { addAndFundLoan, loansManager } = await loadFixture(loansManagerFixture)

    const loanIds = [await addAndFundLoan(), await addAndFundLoan(), await addAndFundLoan()]
    await timeTravel(DAY * 2)
    await loansManager.markLoanAsDefaulted(loanIds[1])

    expect(await loansManager.getActiveLoans()).to.deep.equal([loanIds[0], loanIds[2]])
  })

  it('reverts if already defaulted', async () => {
    const { addAndFundLoan, loansManager } = await loadFixture(loansManagerFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(DAY * 2)
    await loansManager.markLoanAsDefaulted(loanId)

    await expect(loansManager.markLoanAsDefaulted(loanId)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
  })

  it('emits event', async () => {
    const { addAndFundLoan, loansManager } = await loadFixture(loansManagerFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(DAY * 2)

    await expect(loansManager.markLoanAsDefaulted(loanId)).to.emit(loansManager, 'LoanDefaulted').withArgs(loanId)
  })
})
