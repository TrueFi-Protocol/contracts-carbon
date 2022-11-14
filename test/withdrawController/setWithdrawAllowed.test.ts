import { expect } from 'chai'
import { PortfolioStatus } from 'fixtures/structuredPortfolioFixture'
import { withdrawControllerFixture } from 'fixtures/withdrawControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('WithdrawController.setWithdrawAllowed', () => {
  const loadFixture = setupFixtureLoader()

  it('emits event', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const newValue = true
    const status = PortfolioStatus.CapitalFormation
    await expect(withdrawController.setWithdrawAllowed(newValue, status)).to.emit(withdrawController, 'WithdrawAllowedChanged').withArgs(newValue, status)
  })

  it('only manager', async () => {
    const { withdrawController, other } = await loadFixture(withdrawControllerFixture)
    await expect(withdrawController.connect(other).setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)).to.be.revertedWith('WC: Only manager')
  })

  it('no custom value in closed', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    await expect(withdrawController.setWithdrawAllowed(true, PortfolioStatus.Closed)).to.be.revertedWith('WC: No custom value in Closed')
  })

  it('changes value', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const newValue = true
    const status = PortfolioStatus.Live

    await withdrawController.setWithdrawAllowed(newValue, status)

    const withdrawAllowed = await withdrawController.withdrawAllowed(status)

    expect(withdrawAllowed).to.eq(newValue)
  })
})
