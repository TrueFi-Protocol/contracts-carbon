import { expect } from 'chai'
import { PortfolioStatus } from 'fixtures/structuredPortfolioFixture'
import { withdrawControllerFixture } from 'fixtures/withdrawControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('WithdrawController.configure', () => {
  const loadFixture = setupFixtureLoader()

  it('changes multiple values', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const status = PortfolioStatus.Live
    const floor = 400
    const withdrawAllowed = false
    const withdrawFeeRate = 100

    await withdrawController.configure(floor, withdrawFeeRate, { status, value: withdrawAllowed })

    expect(await withdrawController.withdrawAllowed(status)).to.eq(withdrawAllowed)
    expect(await withdrawController.withdrawFeeRate()).to.eq(withdrawFeeRate)
    expect(await withdrawController.floor()).to.eq(floor)
  })

  it('can be used in closed if withdraw allowed doesn\'t change', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    const status = PortfolioStatus.Closed
    const floor = 400
    const withdrawAllowed = await withdrawController.withdrawAllowed(status)
    const withdrawFeeRate = 100

    await withdrawController.configure(floor, withdrawFeeRate, { status, value: withdrawAllowed })

    expect(await withdrawController.withdrawAllowed(status)).to.eq(withdrawAllowed)
    expect(await withdrawController.withdrawFeeRate()).to.eq(withdrawFeeRate)
    expect(await withdrawController.floor()).to.eq(floor)
  })
})
