import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { WEEK } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.updateCheckpoint', () => {
  const loadFixture = setupFixtureLoader()

  it('only in Closed portfolio status', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(seniorTranche.updateCheckpoint()).to.be.revertedWith('TV: Only in Closed status')
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
})
