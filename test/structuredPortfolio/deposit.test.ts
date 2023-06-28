import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, YEAR } from 'utils/constants'
import { timeTravelAndMine } from 'utils/timeTravel'

describe('StructuredPortfolio.deposit', () => {
  const loadFixture = setupFixtureLoader()

  it('simple token transfer does not make any effect', async () => {
    const { structuredPortfolio, token, tranches, depositToTranche, parseTokenUnits, addAndFundLoan, getLoan, repayLoanInFull, tranchesData } = await loadFixture(structuredPortfolioFixture)
    await token.transfer(structuredPortfolio.address, 1234)
    expect(await structuredPortfolio.liquidAssets()).to.eq(0)

    async function printWaterfall(label?: string) {
      const waterfall = await structuredPortfolio.calculateWaterfall()
      console.log(label || '')
      console.log('Waterfall:')
      console.log(waterfall.map((w) => w.toString()).join('\n'))
      console.log('Deficits:')
      console.log((await tranches[1].getCheckpoint()).deficit.toString())
      console.log('\n')
    }

    await depositToTranche(tranches[0], parseTokenUnits(100))
    await depositToTranche(tranches[1], parseTokenUnits(100))
    await depositToTranche(tranches[2], parseTokenUnits(100))

    await structuredPortfolio.start()
    const loanId = await addAndFundLoan(getLoan({ periodDuration: 1, principal: parseTokenUnits(180) }))
    await timeTravelAndMine(3 * DAY)

    await structuredPortfolio.markLoanAsDefaulted(loanId)

    await printWaterfall()

    await timeTravelAndMine(YEAR)

    await printWaterfall('before deposit')

    // await structuredPortfolio.updateCheckpoints()
    await tranchesData[1].depositController.setDepositAllowed(true, 1)
    await depositToTranche(tranches[1], parseTokenUnits(100))

    await printWaterfall('after deposit')

    await repayLoanInFull(loanId)

    await printWaterfall()
  })
})
