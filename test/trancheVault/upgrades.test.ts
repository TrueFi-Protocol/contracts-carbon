import { setupFixtureLoader } from 'test/setup'
import { TrancheVault__factory } from 'contracts'
import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'

describe('TrancheVault.upgrades', () => {
  const loadFixture = setupFixtureLoader()

  it('upgrades to the new implementation', async () => {
    const { equityTranche, provider, wallet } = await loadFixture(structuredPortfolioFixture)
    const newImplementation = await new TrancheVault__factory(wallet).deploy()
    await equityTranche.upgradeTo(newImplementation.address)
    const implementationSlot = await newImplementation.proxiableUUID()
    const expectedImplementationStorageValue = `0x${newImplementation.address.toLowerCase().slice(2).padStart(64, '0')}`
    expect(await provider.getStorageAt(equityTranche.address, implementationSlot)).to.eq(expectedImplementationStorageValue)
  })

  it('fails to upgrade if not called by portfolio UPGRADER', async () => {
    const { equityTranche, wallet, another } = await loadFixture(structuredPortfolioFixture)
    const newImplementation = await new TrancheVault__factory(wallet).deploy()
    const revertMessage = `AccessControl: account ${another.address.toLowerCase()} is missing role ${await equityTranche.DEFAULT_ADMIN_ROLE()}`
    await expect(equityTranche.connect(another).upgradeTo(newImplementation.address)).to.be.revertedWith(revertMessage)
  })
})
