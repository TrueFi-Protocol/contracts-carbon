import { expect } from 'chai'
import { PortfolioStatus } from 'fixtures/structuredPortfolioFixture'
import { withdrawControllerFixture } from 'fixtures/withdrawControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('WithdrawController.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('grants manager role', async () => {
    const { withdrawController, wallet } = await loadFixture(withdrawControllerFixture)
    const managerRole = await withdrawController.MANAGER_ROLE()
    expect(await withdrawController.hasRole(managerRole, wallet.address)).to.be.true
  })

  it('sets withdraw fee rate', async () => {
    const { withdrawController, withdrawFeeRate } = await loadFixture(withdrawControllerFixture)
    expect(await withdrawController.withdrawFeeRate()).to.eq(withdrawFeeRate)
  })

  it('sets default withdraw allowed', async () => {
    const TEST_DATA = [
      {
        status: PortfolioStatus.CapitalFormation,
        defaultValue: false,
      },
      {
        status: PortfolioStatus.Live,
        defaultValue: false,
      },
      {
        status: PortfolioStatus.Closed,
        defaultValue: true,
      },
    ]

    const { withdrawController } = await loadFixture(withdrawControllerFixture)

    for (const { status, defaultValue } of TEST_DATA) {
      expect(await withdrawController.withdrawAllowed(status)).to.deep.eq(defaultValue)
    }
  })
})
