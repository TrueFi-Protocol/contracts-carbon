import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { constants, Wallet } from 'ethers'

describe('TrancheVault.setWithdrawController', () => {
  const loadFixture = setupFixtureLoader()

  const withdrawControllerAddress = Wallet.createRandom().address

  it('cannot be zero address', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.setWithdrawController(constants.AddressZero)).to.be.revertedWith('TV: Cannot be zero address')
  })

  it('only tranche controller owner', async () => {
    const { equityTranche, other } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.connect(other).setWithdrawController(withdrawControllerAddress))
      .to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('manager can renounce role', async () => {
    const { equityTranche, wallet } = await loadFixture(structuredPortfolioFixture)
    await equityTranche.renounceRole(await equityTranche.TRANCHE_CONTROLLER_OWNER_ROLE(), wallet.address)

    await expect(equityTranche.setWithdrawController(withdrawControllerAddress))
      .to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('sets withdraw controller', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await equityTranche.setWithdrawController(withdrawControllerAddress)
    expect(await equityTranche.withdrawController()).to.eq(withdrawControllerAddress)
  })

  it('emits event', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.setWithdrawController(withdrawControllerAddress))
      .to.emit(equityTranche, 'WithdrawControllerChanged').withArgs(withdrawControllerAddress)
  })
})
