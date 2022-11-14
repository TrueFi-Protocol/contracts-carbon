import { expect } from 'chai'
import { depositControllerFixture } from 'fixtures/depositControllerFixture'
import { PortfolioStatus } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('DepositController.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('grants manager role', async () => {
    const { depositController, wallet } = await loadFixture(depositControllerFixture)
    const managerRole = await depositController.MANAGER_ROLE()
    expect(await depositController.hasRole(managerRole, wallet.address)).to.be.true
  })

  it('sets deposit fee rate', async () => {
    const { depositController, depositFeeRate } = await loadFixture(depositControllerFixture)
    expect(await depositController.depositFeeRate()).to.eq(depositFeeRate)
  })

  it('sets lender verifier', async () => {
    const { depositController, lenderVerifier } = await loadFixture(depositControllerFixture)
    expect(await depositController.lenderVerifier()).to.eq(lenderVerifier.address)
  })

  it('sets default deposit allowed', async () => {
    const TEST_DATA = [
      {
        status: PortfolioStatus.CapitalFormation,
        defaultValue: true,
      },
      {
        status: PortfolioStatus.Live,
        defaultValue: false,
      },
      {
        status: PortfolioStatus.Closed,
        defaultValue: false,
      },
    ]

    const { depositController } = await loadFixture(depositControllerFixture)

    for (const { status, defaultValue } of TEST_DATA) {
      expect(await depositController.depositAllowed(status)).to.deep.eq(defaultValue)
    }
  })
})
