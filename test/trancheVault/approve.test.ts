import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'

describe('TrancheVault: approve', () => {
  const loadFixture = setupFixtureLoader()

  it('approve reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.approve(wallet.address, 100))
      .to.be.revertedWith('TV: Portfolio is paused')
  })

  it('increaseAllowance reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.increaseAllowance(wallet.address, 100))
      .to.be.revertedWith('TV: Portfolio is paused')
  })

  it('decreaseAllowance reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await equityTranche.increaseAllowance(wallet.address, 100)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.decreaseAllowance(wallet.address, 100))
      .to.be.revertedWith('TV: Portfolio is paused')
  })
})
