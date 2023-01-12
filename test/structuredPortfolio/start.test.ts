import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { scaleToPercentage } from 'utils/scaleToPercentage'
import { parseUSDC } from 'utils/parseUSDC'

describe('StructuredPortfolio.start', () => {
  const loadFixture = setupFixtureLoader()

  it('changes status', async () => {
    const { structuredPortfolio, PortfolioStatus } = await loadFixture(structuredPortfolioFixture)
    expect(await structuredPortfolio.status()).to.eq(PortfolioStatus.CapitalFormation)
    await structuredPortfolio.start()
    expect(await structuredPortfolio.status()).to.eq(PortfolioStatus.Live)
  })

  it('only in capital formation', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.start()
    await expect(structuredPortfolio.start()).to.be.revertedWith('SP: Portfolio is not in capital formation')
  })

  it('only manager', async () => {
    const { structuredPortfolio, other } = await loadFixture(structuredPortfolioFixture)
    await expect(structuredPortfolio.connect(other).start())
      .to.be.revertedWith('SP: Only manager')
  })

  it('incorrect senior to subordinate tranches ratio', async () => {
    const seniorMinSubordinateRatio = 2000
    const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, seniorMinSubordinateRatio)

    const seniorDeposit = parseTokenUnits(1000)
    const expectedSubordinateDeposit = scaleToPercentage(seniorDeposit, seniorMinSubordinateRatio)
    const subordinateDeposit = expectedSubordinateDeposit.sub(2)

    const equityDeposit = subordinateDeposit.div(2)
    await depositToTranche(equityTranche, equityDeposit)

    const juniorDeposit = subordinateDeposit.div(2)
    await depositToTranche(juniorTranche, juniorDeposit)

    await depositToTranche(seniorTranche, seniorDeposit)

    await expect(structuredPortfolio.start()).to.be.revertedWith('SP: Tranche min ratio not met')
  })

  it('incorrect junior to equity ratio', async () => {
    const juniorMinSubordinateRatio = 2000
    const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(1, juniorMinSubordinateRatio)

    const juniorDeposit = parseTokenUnits(1000)
    const expectedSubordinateValue = scaleToPercentage(juniorDeposit, juniorMinSubordinateRatio)
    const equityDeposit = expectedSubordinateValue.sub(1)

    await depositToTranche(equityTranche, equityDeposit)
    await depositToTranche(juniorTranche, juniorDeposit)

    await expect(structuredPortfolio.start()).to.be.revertedWith('SP: Tranche min ratio not met')
  })

  it('pulls funds from vaults to portfolio', async () => {
    const { structuredPortfolio, tranches, token, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const initialStructuredPortfolioBalance = await token.balanceOf(structuredPortfolio.address)

    const depositAmount = 100

    for (const tranche of tranches) {
      await depositToTranche(tranche, depositAmount)
    }

    await structuredPortfolio.start()

    for (const tranche of tranches) {
      expect(await token.balanceOf(tranche.address)).to.eq(0)
    }
    expect(await token.balanceOf(structuredPortfolio.address)).to.eq(initialStructuredPortfolioBalance.add(depositAmount * tranches.length))
  })

  it('updates checkpoint', async () => {
    const { structuredPortfolio, tranches, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const values = [100, 150, 200]

    for (let i = 0; i < tranches.length; i++) {
      await depositToTranche(tranches[i], values[i])
    }

    const tx = await structuredPortfolio.start()
    const txTimestamp = await getTxTimestamp(tx)

    for (let i = 0; i < values.length; i++) {
      const { totalAssets, timestamp } = await tranches[i].getCheckpoint()
      expect(totalAssets).to.eq(values[i])
      expect(timestamp).to.eq(txTimestamp)
    }
  })

  it('sets portfolio start date', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    const tx = await structuredPortfolio.start()
    expect(await structuredPortfolio.startDate()).to.eq(await getTxTimestamp(tx))
  })

  it('sets portfolio end date', async () => {
    const { structuredPortfolio, portfolioDuration } = await loadFixture(structuredPortfolioFixture)
    const tx = await structuredPortfolio.start()
    const txTimestamp = await getTxTimestamp(tx)
    expect(await structuredPortfolio.endDate()).to.eq(txTimestamp + portfolioDuration)
  })

  it('emits event', async () => {
    const { structuredPortfolio, PortfolioStatus } = await loadFixture(structuredPortfolioFixture)
    await expect(structuredPortfolio.start()).to.emit(structuredPortfolio, 'PortfolioStatusChanged').withArgs(PortfolioStatus.Live)
  })

  it('reverts if minimum tranche size on any tranche is not met', async () => {
    const { structuredPortfolio, tranches, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = 100
    await structuredPortfolio.setMinimumSize(depositAmount)

    await expect(structuredPortfolio.start()).to.be.revertedWith('SP: Portfolio minimum size not reached')
    await depositToTranche(tranches[0], depositAmount)
    await expect(structuredPortfolio.start()).to.be.not.reverted
  })

  it('reverts when portfolio is paused', async () => {
    const { structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(structuredPortfolio.start()).to.be.revertedWith('Pausable: paused')
  })

  it('does not allow share value manipulation', async () => {
    const { structuredPortfolio, token, wallet, other, equityTranche, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)

    const amount = parseUSDC(1_000)
    const singleWei = 1
    const malicious = wallet
    const victim = other

    // Frontrunning
    await token.connect(malicious).approve(equityTranche.address, singleWei)
    await equityTranche.connect(malicious).deposit(singleWei, malicious.address)
    await token.connect(malicious).transfer(structuredPortfolio.address, amount)

    await startPortfolioAndEnableLiveActions()

    await token.connect(victim).approve(equityTranche.address, amount.div(2))
    await equityTranche.connect(victim).deposit(amount.div(2), victim.address)

    // The victim tokens are taken over by malicious address
    expect(await equityTranche.maxWithdraw(victim.address)).gt(0)
  })
})
