import { expect } from 'chai'
import { constants } from 'ethers'
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

  it('cannot be zero address', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.setManagerFeeBeneficiary(constants.AddressZero)).to.be.revertedWith('TV: Cannot be zero address')
  })

  it('sets new manager beneficiary', async () => {
    const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.setManagerFeeBeneficiary(other.address)
    expect(await seniorTranche.managerFeeBeneficiary()).to.eq(other.address)
  })

  it('transfers pending fee to the new beneficiary', async () => {
    const { startPortfolioAndEnableLiveActions, seniorTranche, other, depositToTranche, parseTokenUnits, withInterest, token } = await loadFixture(structuredPortfolioFixture)
    const managerFeeRate = 500
    await seniorTranche.setManagerFeeRate(managerFeeRate)

    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)

    const startTx = await startPortfolioAndEnableLiveActions()
    await timeTravel(YEAR)

    const otherBalanceBefore = await token.balanceOf(other.address)
    const setBeneficiaryTx = await seniorTranche.setManagerFeeBeneficiary(other.address)

    const timePassed = await getTxTimestamp(setBeneficiaryTx) - await getTxTimestamp(startTx)
    const expectedFee = withInterest(depositAmount, managerFeeRate, timePassed).sub(depositAmount)
    expect(await token.balanceOf(other.address)).to.eq(otherBalanceBefore.add(expectedFee))
  })

  it('emits event', async () => {
    const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
    await expect(seniorTranche.setManagerFeeBeneficiary(other.address)).to.emit(seniorTranche, 'ManagerFeeBeneficiaryChanged').withArgs(other.address)
  })

  it('can update managerFeeBeneficiary if transfer to current one fails', async () => {
    const {
      seniorTranche,
      depositToTranche,
      parseTokenUnits,
      token,
      other,
      startPortfolioAndEnableLiveActions,
    } = await loadFixture(structuredPortfolioFixture)

    const managerFeeRate = 500
    await seniorTranche.setManagerFeeRate(managerFeeRate)

    await startPortfolioAndEnableLiveActions()

    await depositToTranche(seniorTranche, parseTokenUnits(1000))
    await timeTravel(YEAR)

    const managerFeeBeneficiary = await seniorTranche.managerFeeBeneficiary()
    await token.failTransfers(managerFeeBeneficiary, true)

    await seniorTranche.setManagerFeeBeneficiary(other.address)

    expect(await seniorTranche.managerFeeBeneficiary()).to.eq(other.address)
  })
})
