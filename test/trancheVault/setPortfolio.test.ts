import { expect } from 'chai'
import { Wallet } from 'ethers'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'

describe('TrancheVault.setPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('sets portfolio address', async () => {
    const { tranche, portfolio } = await loadFixture(trancheVaultFixture)
    expect(await tranche.portfolio()).to.eq(portfolio.address)
  })

  it('only once', async () => {
    const { tranche } = await loadFixture(trancheVaultFixture)
    const portfolioAddress = Wallet.createRandom().address
    await expect(tranche.setPortfolio(portfolioAddress)).to.be.revertedWith('TV: Portfolio already set')
  })
})
