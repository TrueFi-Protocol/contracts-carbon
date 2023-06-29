import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, YEAR } from 'utils/constants'
import { timeTravelAndMine } from 'utils/timeTravel'

describe('StructuredPortfolio.deposit', () => {
  const loadFixture = setupFixtureLoader()

  it('simple token transfer does not make any effect when updateCheckpoint is not called with existing deficit', async () => {
    const waterfalls = {}

    async function saveWaterfall(label = 'default') {
      waterfalls[label] = await structuredPortfolio.calculateWaterfall()
    }

    async function compareWaterfall(label = 'default') {
      const waterfall = await structuredPortfolio.calculateWaterfall()
      waterfall.forEach((w, i) => expect(w).to.be.closeTo(waterfalls[label][i], 10))
    }

    let { structuredPortfolio, token, tranches, depositToTranche, parseTokenUnits, addAndFundLoan, getLoan, repayLoanInFull, tranchesData } = await loadFixture(structuredPortfolioFixture)
    await token.transfer(structuredPortfolio.address, 1234)
    expect(await structuredPortfolio.liquidAssets()).to.eq(0)

    await depositToTranche(tranches[0], parseTokenUnits(100))
    await depositToTranche(tranches[1], parseTokenUnits(100))
    await depositToTranche(tranches[2], parseTokenUnits(100))

    await structuredPortfolio.start()
    let loanId = await addAndFundLoan(getLoan({ periodDuration: 1, principal: parseTokenUnits(180) }))
    await timeTravelAndMine(3 * DAY)

    await structuredPortfolio.markLoanAsDefaulted(loanId)

    await saveWaterfall()

    await timeTravelAndMine(YEAR)

    await saveWaterfall('before deposit')

    await tranchesData[1].depositController.setDepositAllowed(true, 1)
    await depositToTranche(tranches[1], parseTokenUnits(100))

    await saveWaterfall('after deposit')

    await repayLoanInFull(loanId)

    await saveWaterfall('after repayment')

    ;({ structuredPortfolio, token, tranches, depositToTranche, parseTokenUnits, addAndFundLoan, getLoan, repayLoanInFull, tranchesData } = await loadFixture(structuredPortfolioFixture))
    await token.transfer(structuredPortfolio.address, 1234)

    await depositToTranche(tranches[0], parseTokenUnits(100))
    await depositToTranche(tranches[1], parseTokenUnits(100))
    await depositToTranche(tranches[2], parseTokenUnits(100))

    await structuredPortfolio.start()
    loanId = await addAndFundLoan(getLoan({ periodDuration: 1, principal: parseTokenUnits(180) }))
    await timeTravelAndMine(3 * DAY)

    await structuredPortfolio.markLoanAsDefaulted(loanId)

    await compareWaterfall()

    await timeTravelAndMine(YEAR)

    await compareWaterfall('before deposit')

    await structuredPortfolio.updateCheckpoints() // The only difference between two flows
    await tranchesData[1].depositController.setDepositAllowed(true, 1)
    await depositToTranche(tranches[1], parseTokenUnits(100))

    await compareWaterfall('after deposit')

    await repayLoanInFull(loanId)

    await compareWaterfall('after repayment')
  })
})
