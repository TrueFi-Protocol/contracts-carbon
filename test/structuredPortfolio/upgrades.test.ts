import { setupFixtureLoader } from 'test/setup'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { StructuredPortfolio__factory } from 'contracts'
import { expect } from 'chai'

describe('StructuredPortfolio.upgrades', () => {
  const loadFixture = setupFixtureLoader()

  it('sets UPGRADER role to the manager', async () => {
    const { structuredPortfolio, wallet } = await loadFixture(structuredPortfolioFixture)
    const defaultAdminRole = await structuredPortfolio.DEFAULT_ADMIN_ROLE()
    expect(await structuredPortfolio.hasRole(defaultAdminRole, wallet.address)).to.be.true
  })

  it('upgrades to the new implementation', async () => {
    const { structuredPortfolio, wallet, provider } = await loadFixture(structuredPortfolioFixture)
    const newImplementation = await new StructuredPortfolio__factory(wallet).deploy()
    await structuredPortfolio.upgradeTo(newImplementation.address)
    const implementationSlot = await newImplementation.proxiableUUID()
    const expectedImplementationStorageValue = `0x${newImplementation.address.toLowerCase().slice(2).padStart(64, '0')}`
    expect(await provider.getStorageAt(structuredPortfolio.address, implementationSlot)).to.eq(expectedImplementationStorageValue)
  })

  it('fails to upgrade if not called by UPGRADER', async () => {
    const { structuredPortfolio, wallet, another } = await loadFixture(structuredPortfolioFixture)
    const newImplementation = await new StructuredPortfolio__factory(wallet).deploy()
    const defaultAdminRole = await structuredPortfolio.DEFAULT_ADMIN_ROLE()
    const reason = `AccessControl: account ${another.address.toLowerCase()} is missing role ${defaultAdminRole}`
    await expect(structuredPortfolio.connect(another).upgradeTo(newImplementation.address)).to.be.revertedWith(reason)
  })
})
