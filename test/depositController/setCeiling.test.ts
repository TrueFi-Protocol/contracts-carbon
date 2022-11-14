import { expect } from 'chai'
import { depositControllerFixture } from 'fixtures/depositControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('DepositController.setCeiling', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { depositController, other } = await loadFixture(depositControllerFixture)
    await expect(depositController.connect(other).setCeiling(1000)).to.be.revertedWith('DC: Only manager')
  })

  it('sets new value', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    const ceiling = 1000
    await depositController.setCeiling(ceiling)
    expect(await depositController.ceiling()).to.eq(ceiling)
  })

  it('emits event', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    const ceiling = 1000
    await expect(depositController.setCeiling(ceiling)).to.emit(depositController, 'CeilingChanged').withArgs(ceiling)
  })
})
