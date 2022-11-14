import { expect } from 'chai'
import {
  structuredPortfolioFixture,
  structuredPortfolioLiveFixture,
} from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('StructuredPortfolio.calculateWaterfallForTranche', () => {
  const loadFixture = setupFixtureLoader()

  it('capital formation, returns 0', async () => {
    const { structuredPortfolio, tranches } = await loadFixture(structuredPortfolioFixture)

    for (let i = 0; i < tranches.length; i++) {
      expect(await structuredPortfolio.calculateWaterfallForTranche(i)).to.eq(0)
    }
  })

  it('portfolio status Closed, returns 0', async () => {
    const { structuredPortfolio, tranches, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)
    await startAndClosePortfolio()

    for (let i = 0; i < tranches.length; i++) {
      expect(await structuredPortfolio.calculateWaterfallForTranche(i)).to.eq(0)
    }
  })

  it('index out of bounds', async () => {
    const { structuredPortfolio, tranches } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(structuredPortfolio.calculateWaterfallForTranche(tranches.length))
      .to.be.revertedWith('SP: Tranche index out of bounds')
  })

  it('returns correct values', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()
    for (let i = 0; i < waterfallValues.length; i++) {
      expect(await structuredPortfolio.calculateWaterfallForTranche(i)).to.eq(waterfallValues[i])
    }
  })
})
