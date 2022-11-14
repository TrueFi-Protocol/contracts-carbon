import { expect } from 'chai'
import { withdrawControllerFixture } from 'fixtures/withdrawControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('WithdrawController.setFloor', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { withdrawController, other } = await loadFixture(withdrawControllerFixture)
    await expect(withdrawController.connect(other).setFloor(1000)).to.be.revertedWith('WC: Only manager')
  })

  it('sets new value', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const floor = 1000
    await withdrawController.setFloor(floor)
    expect(await withdrawController.floor()).to.eq(floor)
  })

  it('emits event', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const floor = 1000
    await expect(withdrawController.setFloor(floor)).to.emit(withdrawController, 'FloorChanged').withArgs(floor)
  })
})
