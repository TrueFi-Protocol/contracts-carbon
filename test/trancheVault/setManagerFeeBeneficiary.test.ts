import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.setManagerFeeBeneficiary', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
    await expect(seniorTranche.connect(other).setManagerFeeBeneficiary(other.address)).to.be.revertedWith('TV: Only manager')
  })

  it('sets new manager beneficiary', async () => {
    const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.setManagerFeeBeneficiary(other.address)
    expect(await seniorTranche.managerFeeBeneficiary()).to.eq(other.address)
  })

  it('transfers pending fee to old beneficiary', async () => {
    const { startPortfolioAndEnableLiveActions, seniorTranche, other, depositToTranche, parseTokenUnits, withInterest, token, wallet } = await loadFixture(structuredPortfolioFixture)
    const managerFeeRate = 500
    await seniorTranche.setManagerFeeRate(managerFeeRate)

    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)

    const startTx = await startPortfolioAndEnableLiveActions()
    await timeTravel(YEAR)

    const walletBalanceBefore = await token.balanceOf(wallet.address)
    const setBeneficiaryTx = await seniorTranche.setManagerFeeBeneficiary(other.address)

    const timePassed = await getTxTimestamp(setBeneficiaryTx) - await getTxTimestamp(startTx)
    const expectedFee = withInterest(depositAmount, managerFeeRate, timePassed).sub(depositAmount)
    expect(await token.balanceOf(wallet.address)).to.eq(walletBalanceBefore.add(expectedFee))
  })

  it('emits event', async () => {
    const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
    await expect(seniorTranche.setManagerFeeBeneficiary(other.address)).to.emit(seniorTranche, 'ManagerFeeBeneficiaryChanged').withArgs(other.address)
  })
})
