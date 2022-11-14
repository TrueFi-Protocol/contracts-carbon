import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { timeTravel } from 'utils/timeTravel'
import { YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'

describe('TrancheVault.setManagerFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('sets new fee rate', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.setManagerFeeRate(25)
    expect(await seniorTranche.managerFeeRate()).to.eq(25)
  })

  it('can only be called by manager', async () => {
    const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
    await expect(seniorTranche.connect(other).setManagerFeeRate(25)).to.be.revertedWith('TV: Only manager')
  })

  it('emits event', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(seniorTranche.setManagerFeeRate(25)).to.emit(seniorTranche, 'ManagerFeeRateChanged').withArgs(25)
  })

  it('distributes fees and updates checkpoint', async () => {
    const {
      structuredPortfolio,
      seniorTranche,
      depositToTranche,
      parseTokenUnits,
      token,
      startPortfolioAndEnableLiveActions,
      wallet,
    } = await loadFixture(structuredPortfolioFixture)
    await startPortfolioAndEnableLiveActions()

    const managerFee = 500
    await seniorTranche.setManagerFeeRate(managerFee)

    await depositToTranche(seniorTranche, parseTokenUnits(1000))
    await timeTravel(YEAR)

    const portfolioBalanceBefore = await token.balanceOf(structuredPortfolio.address)
    const managerBalanceBefore = await token.balanceOf(wallet.address)

    const tx = await seniorTranche.setManagerFeeRate(25)

    const delta = parseTokenUnits(0.1)
    const expectedFeeAmount = parseTokenUnits(50)
    expect(await token.balanceOf(structuredPortfolio.address)).to.be.closeTo(portfolioBalanceBefore.sub(expectedFeeAmount), delta)
    expect(await token.balanceOf(wallet.address)).to.be.closeTo(managerBalanceBefore.add(expectedFeeAmount), delta)

    const checkpoint = await seniorTranche.getCheckpoint()
    expect(checkpoint.timestamp).to.equal(await getTxTimestamp(tx))
  })

  it('does not update checkpoint in capital formation', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.setManagerFeeRate(500)
    expect((await seniorTranche.getCheckpoint()).timestamp).to.eq(0)
  })
})
