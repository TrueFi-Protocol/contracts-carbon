import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { Wallet } from 'ethers'

describe('TrancheVault.setDepositController', () => {
  const loadFixture = setupFixtureLoader()

  const depositControllerAddress = Wallet.createRandom().address

  it('only tranche controller owner', async () => {
    const { equityTranche, other } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.connect(other).setDepositController(depositControllerAddress)).to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('manager can renounce role', async () => {
    const { equityTranche, wallet } = await loadFixture(structuredPortfolioFixture)
    await equityTranche.renounceRole(await equityTranche.TRANCHE_CONTROLLER_OWNER_ROLE(), wallet.address)

    await expect(equityTranche.setDepositController(depositControllerAddress))
      .to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('sets controller', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await equityTranche.setDepositController(depositControllerAddress)
    expect(await equityTranche.depositController()).to.eq(depositControllerAddress)
  })

  it('emits event', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.setDepositController(depositControllerAddress)).to.emit(equityTranche, 'DepositControllerChanged').withArgs(depositControllerAddress)
  })
})
