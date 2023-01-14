import { Loan } from 'fixtures/setupLoansManagerHelpers'
import { echidnaStructuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY } from 'utils/constants'

describe('structuredPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('single defaulted loan', async () => {
    const { structuredPortfolio, parseTokenUnits, depositToTranche, seniorTranche, juniorTranche, equityTranche, addAndFundLoan, wallet, other, token } = await loadFixture(echidnaStructuredPortfolioFixture)

    const loan1: Loan = {
      principal: parseTokenUnits(100_000),
      periodCount: 3,
      periodPayment: parseTokenUnits(2_000),
      periodDuration: DAY,
      recipient: other.address,
      gracePeriod: DAY,
      canBeRepaidAfterDefault: true,
    }

    const loan2: Loan = {
      principal: parseTokenUnits(80_000),
      periodCount: 10,
      periodPayment: parseTokenUnits(2_000),
      periodDuration: DAY,
      recipient: other.address,
      gracePeriod: DAY,
      canBeRepaidAfterDefault: true,
    }

    await token.connect(other).approve(structuredPortfolio.address, parseTokenUnits(300_000))

    const amount = parseTokenUnits(75_000)
    await depositToTranche(seniorTranche, amount)
    await depositToTranche(juniorTranche, amount)
    await depositToTranche(equityTranche, amount)

    await structuredPortfolio.start()

    const loanId1 = await addAndFundLoan(loan1)
    const loanId2 = await addAndFundLoan(loan2)

    await structuredPortfolio.connect(other).repayLoan(loanId1)

    console.log('(loanId1, loanId2): ' + loanId1 + ' ' + loanId2)
    console.log('token: ' + token.address)
    console.log('tranches: ' + [equityTranche.address, juniorTranche.address, seniorTranche.address])
    console.log('structured portfolio: ' + structuredPortfolio.address)
    console.log('wallet: ' + wallet.address)
    console.log('other: ' + other.address)
    console.log('equity tranche')
    console.log(' depositController: ' + await equityTranche.depositController())
    console.log(' withdrawController: ' + await equityTranche.withdrawController())
    console.log('junior tranche')
    console.log(' depositController: ' + await juniorTranche.depositController())
    console.log(' withdrawController: ' + await juniorTranche.withdrawController())
    console.log('senior tranche')
    console.log(' depositController: ' + await seniorTranche.depositController())
    console.log(' withdrawController: ' + await seniorTranche.withdrawController())
  })
})
