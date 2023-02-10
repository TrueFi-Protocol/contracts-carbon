import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { WEEK, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel, timeTravelTo, timeTravelToAndMine } from 'utils/timeTravel'
import { parseUSDC } from 'utils/parseUSDC'

describe('TrancheVault.updateCheckpoint', () => {
  const loadFixture = setupFixtureLoader()

  it('only in Closed portfolio status', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(seniorTranche.updateCheckpoint()).to.be.revertedWith('TV: Only in Closed status')
  })

  it('reverts if protocolTreasury is TrancheVault', async () => {
    const { seniorTranche, protocolConfig, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await protocolConfig.setProtocolTreasury(seniorTranche.address)
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await structuredPortfolio.close()
    await timeTravel(WEEK)

    await expect(seniorTranche.updateCheckpoint()).to.be.revertedWith('TV: Token transfer to TV')
  })

  it('reverts if protocolTreasury is StructuredPortfolio', async () => {
    const { seniorTranche, protocolConfig, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await protocolConfig.setProtocolTreasury(structuredPortfolio.address)
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await structuredPortfolio.close()
    await timeTravel(WEEK)

    await expect(seniorTranche.updateCheckpoint()).to.be.revertedWith('TV: Token transfer to SP')
  })

  it('updates checkpoint', async () => {
    const { seniorTranche, protocolConfig, token, structuredPortfolio, withInterest } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    const closeTx = await structuredPortfolio.close()

    await timeTravel(WEEK)

    const newProtocolFeeRate = 300
    await protocolConfig.setDefaultProtocolFeeRate(newProtocolFeeRate)
    const seniorBalance = await token.balanceOf(seniorTranche.address)

    const updateCheckpointTx = await seniorTranche.updateCheckpoint()

    const timePassed = await getTxTimestamp(updateCheckpointTx) - await getTxTimestamp(closeTx)
    const pendingFee = withInterest(seniorBalance, protocolFeeRate, timePassed).sub(seniorBalance)
    const [totalAssets, checkpointProtocolFeeRate, timestamp] = await seniorTranche.getCheckpoint()

    expect(totalAssets).to.eq(seniorBalance.sub(pendingFee))
    expect(checkpointProtocolFeeRate).to.eq(newProtocolFeeRate)
    expect(timestamp).to.eq(await getTxTimestamp(updateCheckpointTx))
  })

  it('emits event', async () => {
    const { seniorTranche, protocolConfig, token, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.close()
    await timeTravel(WEEK)

    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    const seniorBalance = await token.balanceOf(seniorTranche.address)

    const tx = await seniorTranche.updateCheckpoint()

    await expect(tx).to.emit(seniorTranche, 'CheckpointUpdated').withArgs(seniorBalance, protocolFeeRate)
  })

  it('correctly handles unpaid protocol fees', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan, protocolConfig, depositToTranche, juniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 50
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    const timestamp = await getTxTimestamp(await structuredPortfolio.updateCheckpoints())

    const maxLoanValue = (await structuredPortfolio.liquidAssets()).sub(parseUSDC(1))
    const loan = getLoan({ principal: maxLoanValue })
    await addAndFundLoan(loan)
    await protocolConfig.setDefaultProtocolFeeRate(0)
    await timeTravelToAndMine(timestamp + YEAR)
    expect(await juniorTranche.unpaidProtocolFee()).to.equal(0)
    await depositToTranche(juniorTranche, 5)
    const unpaidFees = await juniorTranche.unpaidProtocolFee()
    expect(unpaidFees).to.be.gt(0)

    for (let i = 1; i <= 5; i++) {
      await depositToTranche(juniorTranche, 5)
      expect(await juniorTranche.unpaidProtocolFee()).to.equal(unpaidFees.sub(i * 5))
    }
  })

  it('correctly handles unpaid manager fees', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan, depositToTranche, juniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
    const managerFeeRate = 50
    await juniorTranche.setManagerFeeRate(managerFeeRate)
    const timestamp = await getTxTimestamp(await structuredPortfolio.updateCheckpoints())

    const maxLoanValue = (await structuredPortfolio.liquidAssets()).sub(parseUSDC(1))
    const loan = getLoan({ principal: maxLoanValue })
    await addAndFundLoan(loan)
    await timeTravelTo(timestamp + YEAR)
    await juniorTranche.setManagerFeeRate(0)
    await depositToTranche(juniorTranche, 5)
    const unpaidFees = await juniorTranche.unpaidManagerFee()
    expect(unpaidFees).to.be.gt(0)

    for (let i = 1; i <= 5; i++) {
      await depositToTranche(juniorTranche, 5)
      expect(await juniorTranche.unpaidManagerFee()).to.equal(unpaidFees.sub(i * 5))
    }
  })
})
