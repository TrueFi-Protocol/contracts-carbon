import { expect } from 'chai'
import { withdrawControllerFixture } from 'fixtures/withdrawControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('WithdrawController.setWithdrawFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { withdrawController, other } = await loadFixture(withdrawControllerFixture)
    await expect(withdrawController.connect(other).setWithdrawFeeRate(100)).to.be.revertedWith('WC: Only manager')
  })

  it('sets new withdraw fee rate', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const withdrawFeeRate = 100
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    expect(await withdrawController.withdrawFeeRate()).to.eq(withdrawFeeRate)
  })

  it('emits event', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const withdrawFeeRate = 100
    await expect(withdrawController.setWithdrawFeeRate(withdrawFeeRate)).to.emit(withdrawController, 'WithdrawFeeRateChanged').withArgs(withdrawFeeRate)
  })
})
