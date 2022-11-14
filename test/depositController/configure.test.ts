import { expect } from 'chai'
import { Wallet } from 'ethers'
import { depositControllerFixture } from 'fixtures/depositControllerFixture'
import { PortfolioStatus } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('DepositController.configure', () => {
  const loadFixture = setupFixtureLoader()

  it('changes multiple values', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    const status = PortfolioStatus.Live
    const ceiling = 400
    const depositAllowed = false
    const depositFeeRate = 100
    const lenderVerifierAddress = Wallet.createRandom().address

    await depositController.configure(ceiling, depositFeeRate, lenderVerifierAddress, { status, value: depositAllowed })

    expect(await depositController.depositAllowed(status)).to.eq(depositAllowed)
    expect(await depositController.ceiling()).to.eq(ceiling)
    expect(await depositController.depositFeeRate()).to.eq(depositFeeRate)
    expect(await depositController.lenderVerifier()).to.eq(lenderVerifierAddress)
  })

  it('can be used in closed if deposit allowed doesn\'t change', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    const status = PortfolioStatus.Closed
    const ceiling = 400
    const depositFeeRate = 100
    const lenderVerifierAddress = Wallet.createRandom().address
    const depositAllowed = await depositController.depositAllowed(status)

    await depositController.configure(ceiling, depositFeeRate, lenderVerifierAddress, { status, value: depositAllowed })

    expect(await depositController.depositAllowed(status)).to.eq(depositAllowed)
    expect(await depositController.ceiling()).to.eq(ceiling)
    expect(await depositController.depositFeeRate()).to.eq(depositFeeRate)
    expect(await depositController.lenderVerifier()).to.eq(lenderVerifierAddress)
  })
})
