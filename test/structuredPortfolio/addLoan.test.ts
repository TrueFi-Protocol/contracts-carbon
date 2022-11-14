import { expect } from 'chai'
import { Wallet, BigNumber } from 'ethers'
import { Loan } from 'fixtures/setupLoansManagerHelpers'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('StructuredPortfolio.addLoan', () => {
  const loadFixture = setupFixtureLoader()

  const loan: Loan = {
    principal: BigNumber.from(100),
    periodCount: 100,
    periodPayment: BigNumber.from(100),
    periodDuration: 100,
    recipient: Wallet.createRandom().address,
    gracePeriod: 100,
    canBeRepaidAfterDefault: false,
  }

  it('only manager', async () => {
    const { structuredPortfolio, other } = await loadFixture(structuredPortfolioFixture)
    await expect(structuredPortfolio.connect(other).addLoan(loan)).to.be.revertedWith('SP: Only manager')
  })

  it('only in Live status', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await expect(structuredPortfolio.addLoan(loan)).to.be.revertedWith('SP: Portfolio is not live')
  })

  it('reverts when portfolio is paused', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.pause()

    await expect(structuredPortfolio.addLoan(loan))
      .to.be.revertedWith('Pausable: paused')
  })
})
