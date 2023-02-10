import { expect } from 'chai'
import { constants } from 'ethers'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { MONTH, YEAR } from 'utils/constants'
import { timeTravel, timeTravelFrom } from 'utils/timeTravel'

describe('StructuredPortfolio: loans integration tests', () => {
  const loadFixture = setupFixtureLoader()

  async function fixture() {
    const fixtureResult = await loadFixture(structuredPortfolioFixture)
    const { provider, protocolConfig, parseTokenUnits, tranches, depositToTranche } = fixtureResult

    const [,,, lenderA, lenderB, managerFeeBeneficiary] = provider.getWallets()

    const protocolFeeRate = 20
    const managerFeeRate = 30

    async function enableFees() {
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      for (const tranche of tranches) {
        await tranche.setManagerFeeBeneficiary(managerFeeBeneficiary.address)
        await tranche.setManagerFeeRate(managerFeeRate)
      }
    }

    const depositAmount = parseTokenUnits(1e6)

    async function depositToTranches() {
      for (const tranche of tranches) {
        await depositToTranche(tranche, depositAmount, lenderA.address)
        await depositToTranche(tranche, depositAmount, lenderB.address)
      }
      const totalDeposited = depositAmount.mul(2).mul(tranches.length)
      return totalDeposited
    }

    return { ...fixtureResult, lenderA, lenderB, managerFeeBeneficiary, depositAmount, protocolFeeRate, managerFeeRate, depositToTranches, enableFees }
  }

  it('2 loans resolved after close: defaulted and repaid', async () => {
    const {
      wallet,
      lenderA,
      lenderB,
      managerFeeBeneficiary,
      depositAmount,
      protocolFeeRate,
      managerFeeRate,
      parseTokenUnits,
      redeemFromTranche,
      getLoan,
      portfolioDuration,
      addAndFundLoan,
      structuredPortfolio,
      repayLoanInFull,
      tranches,
      seniorTranche,
      juniorTranche,
      equityTranche,
      token,
      withInterest,
      protocolConfigParams: { protocolTreasury },
      enableFees,
      depositToTranches,
      startPortfolioAndEnableLiveActions,
    } = await fixture()

    await enableFees()
    const totalDeposited = await depositToTranches()
    const startTx = await startPortfolioAndEnableLiveActions()

    const loan = getLoan({
      principal: depositAmount.mul(2),
      periodPayment: depositAmount,
      periodCount: 1,
      periodDuration: YEAR,
      gracePeriod: 0,
    })

    const loanToDefaultId = await addAndFundLoan(loan)
    const loanToRepayId = await addAndFundLoan(loan)

    await timeTravelFrom(startTx, portfolioDuration + 1)
    await structuredPortfolio.close()

    await structuredPortfolio.markLoanAsDefaulted(loanToDefaultId)
    await repayLoanInFull(loanToRepayId)

    for (const tranche of tranches) {
      await tranche.connect(lenderA).approve(wallet.address, constants.MaxUint256)
      await redeemFromTranche(tranche, await tranche.balanceOf(lenderA.address), lenderA.address, lenderA.address)

      await tranche.connect(lenderB).approve(wallet.address, constants.MaxUint256)
      await redeemFromTranche(tranche, await tranche.balanceOf(lenderB.address), lenderB.address, lenderB.address)
    }

    const finalPortfolioAmount = totalDeposited.sub(loan.principal).add(loan.periodPayment)
    const finalPortfolioVirtualAmount = totalDeposited.add(loan.periodPayment.mul(2))

    const delta = parseTokenUnits('0.01')

    const expectedProtocolFee = withInterest(finalPortfolioVirtualAmount, protocolFeeRate, portfolioDuration).sub(finalPortfolioVirtualAmount)
    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(expectedProtocolFee, delta)

    const expectedManagerFee = withInterest(finalPortfolioVirtualAmount, managerFeeRate, portfolioDuration).sub(finalPortfolioVirtualAmount)
    expect(await token.balanceOf(managerFeeBeneficiary.address)).to.be.closeTo(expectedManagerFee, delta)

    const expectedLenderBalance = finalPortfolioAmount.sub(expectedProtocolFee).sub(expectedManagerFee).div(2)
    expect(await token.balanceOf(lenderA.address)).to.be.closeTo(expectedLenderBalance, delta)
    expect(await token.balanceOf(lenderB.address)).to.be.closeTo(expectedLenderBalance, delta)

    expect(await token.balanceOf(seniorTranche.address)).to.eq(0)
    expect(await token.balanceOf(juniorTranche.address)).to.eq(0)
    expect(await token.balanceOf(equityTranche.address)).to.eq(0)
  })

  it('2 loans resolved just before close: defaulted and repaid', async () => {
    const {
      wallet,
      lenderA,
      lenderB,
      managerFeeBeneficiary,
      depositAmount,
      protocolFeeRate,
      managerFeeRate,
      parseTokenUnits,
      redeemFromTranche,
      getLoan,
      portfolioDuration,
      addAndFundLoan,
      structuredPortfolio,
      repayLoanInFull,
      tranches,
      seniorTranche,
      juniorTranche,
      equityTranche,
      token,
      withInterest,
      protocolConfigParams: { protocolTreasury },
      enableFees,
      depositToTranches,
      startPortfolioAndEnableLiveActions,
    } = await fixture()

    await enableFees()
    const totalDeposited = await depositToTranches()
    await startPortfolioAndEnableLiveActions()

    const loan = getLoan({
      principal: depositAmount.mul(2),
      periodPayment: depositAmount,
      periodCount: 1,
      periodDuration: portfolioDuration,
      gracePeriod: 0,
    })

    const loanToDefaultId = await addAndFundLoan(loan)
    const loanToRepayId = await addAndFundLoan(loan)

    await timeTravel(loan.periodDuration + loan.gracePeriod + 1)

    await structuredPortfolio.markLoanAsDefaulted(loanToDefaultId)
    await repayLoanInFull(loanToRepayId)

    await structuredPortfolio.close()

    for (const tranche of tranches) {
      await tranche.connect(lenderA).approve(wallet.address, constants.MaxUint256)
      await redeemFromTranche(tranche, await tranche.balanceOf(lenderA.address), lenderA.address, lenderA.address)

      await tranche.connect(lenderB).approve(wallet.address, constants.MaxUint256)
      await redeemFromTranche(tranche, await tranche.balanceOf(lenderB.address), lenderB.address, lenderB.address)
    }

    const finalPortfolioAmount = totalDeposited.sub(loan.principal).add(loan.periodPayment)
    const finalPortfolioVirtualAmount = totalDeposited.add(loan.periodPayment.mul(2))

    const delta = parseTokenUnits('0.02')

    const expectedProtocolFee = withInterest(finalPortfolioVirtualAmount, protocolFeeRate, portfolioDuration).sub(finalPortfolioVirtualAmount)
    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(expectedProtocolFee, delta)

    const expectedManagerFee = withInterest(finalPortfolioVirtualAmount, managerFeeRate, portfolioDuration).sub(finalPortfolioVirtualAmount)
    expect(await token.balanceOf(managerFeeBeneficiary.address)).to.be.closeTo(expectedManagerFee, delta)

    const expectedLenderBalance = finalPortfolioAmount.sub(expectedProtocolFee).sub(expectedManagerFee).div(2)
    expect(await token.balanceOf(lenderA.address)).to.be.closeTo(expectedLenderBalance, delta)
    expect(await token.balanceOf(lenderB.address)).to.be.closeTo(expectedLenderBalance, delta)

    expect(await token.balanceOf(seniorTranche.address)).to.eq(0)
    expect(await token.balanceOf(juniorTranche.address)).to.eq(0)
    expect(await token.balanceOf(equityTranche.address)).to.eq(0)
  })

  it('1 loan defaulted before and 1 after portfolio close', async () => {
    const {
      getLoan,
      depositAmount,
      portfolioDuration,
      addAndFundLoan,
      structuredPortfolio,
      wallet,
      lenderA,
      lenderB,
      redeemFromTranche,
      seniorTranche,
      withInterest,
      parseTokenUnits,
      protocolFeeRate,
      managerFeeRate,
      token,
      protocolConfigParams: { protocolTreasury },
      managerFeeBeneficiary,
      enableFees,
      depositToTranches,
      startPortfolioAndEnableLiveActions,
    } = await fixture()

    await enableFees()
    const totalDeposited = await depositToTranches()
    const startTx = await startPortfolioAndEnableLiveActions()

    const loan = getLoan({
      principal: depositAmount.mul(2),
      periodPayment: depositAmount,
      periodCount: 1,
      periodDuration: MONTH,
      gracePeriod: 0,
    })

    const earlyLoanId = await addAndFundLoan(loan)

    await timeTravelFrom(startTx, portfolioDuration)

    const lateLoanId = await addAndFundLoan(loan)
    await structuredPortfolio.markLoanAsDefaulted(earlyLoanId)
    await structuredPortfolio.close()

    await timeTravel(MONTH)
    await structuredPortfolio.markLoanAsDefaulted(lateLoanId)

    await seniorTranche.connect(lenderA).approve(wallet.address, constants.MaxUint256)
    await redeemFromTranche(seniorTranche, await seniorTranche.balanceOf(lenderA.address), lenderA.address, lenderA.address)

    await seniorTranche.connect(lenderB).approve(wallet.address, constants.MaxUint256)
    await redeemFromTranche(seniorTranche, await seniorTranche.balanceOf(lenderB.address), lenderB.address, lenderB.address)

    const finalPortfolioAmount = totalDeposited.sub(loan.principal.mul(2))
    const finalPortfolioVirtualAmount = totalDeposited.add(loan.periodPayment)

    const protocolFeeUntilClose = withInterest(finalPortfolioVirtualAmount, protocolFeeRate, portfolioDuration).sub(finalPortfolioVirtualAmount)
    const managerFeeUntilClose = withInterest(finalPortfolioVirtualAmount, managerFeeRate, portfolioDuration).sub(finalPortfolioVirtualAmount)

    const portfolioAmountOnClose = finalPortfolioAmount.sub(protocolFeeUntilClose).sub(managerFeeUntilClose)
    const protocolFeeAfterClose = withInterest(portfolioAmountOnClose, protocolFeeRate, MONTH).sub(portfolioAmountOnClose)
    const expectedProtocolFee = protocolFeeUntilClose.add(protocolFeeAfterClose)

    const delta = parseTokenUnits('0.01')

    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(expectedProtocolFee, delta)
    expect(await token.balanceOf(managerFeeBeneficiary.address)).to.be.closeTo(managerFeeUntilClose, delta)

    const expectedLenderBalance = portfolioAmountOnClose.sub(protocolFeeAfterClose).div(2)
    expect(await token.balanceOf(lenderA.address)).to.be.closeTo(expectedLenderBalance, delta)
    expect(await token.balanceOf(lenderB.address)).to.be.closeTo(expectedLenderBalance, delta)

    expect(await token.balanceOf(seniorTranche.address)).to.eq(0)
  })

  it('loan draining portfolio', async () => {
    const {
      tranches,
      seniorTranche,
      juniorTranche,
      equityTranche,
      depositToTranche,
      startPortfolioAndEnableLiveActions,
      getLoan,
      structuredPortfolio,
      token,
      addAndFundLoan,
      enableFees,
      depositToTranches,
      depositAmount,
    } = await fixture()

    await depositToTranches()
    await startPortfolioAndEnableLiveActions()

    const loan = getLoan({ principal: await token.balanceOf(structuredPortfolio.address) })
    await addAndFundLoan(loan)

    await enableFees()

    // wait for fees to accrue
    await timeTravel(YEAR)
    await structuredPortfolio.updateCheckpoints()
    for (const tranche of tranches) {
      expect(await tranche.unpaidManagerFee()).to.be.gt(0)
      expect(await tranche.unpaidProtocolFee()).to.be.gt(0)
    }

    await depositToTranche(seniorTranche, depositAmount)
    expect(await seniorTranche.unpaidManagerFee()).to.be.gt(0)
    expect(await seniorTranche.unpaidProtocolFee()).to.be.gt(0)

    await depositToTranche(juniorTranche, depositAmount)
    expect(await juniorTranche.unpaidManagerFee()).to.eq(0)
    expect(await juniorTranche.unpaidProtocolFee()).to.eq(0)

    await depositToTranche(equityTranche, depositAmount)
    expect(await equityTranche.unpaidManagerFee()).to.eq(0)
    expect(await equityTranche.unpaidProtocolFee()).to.eq(0)

    await structuredPortfolio.updateCheckpoints()
    expect(await seniorTranche.unpaidManagerFee()).to.eq(0)
    expect(await seniorTranche.unpaidProtocolFee()).to.eq(0)
  })

  it('loan draining portfolio, repay after close', async () => {
    const {
      getLoan,
      token,
      addAndFundLoan,
      structuredPortfolio,
      startPortfolioAndEnableLiveActions,
      depositToTranches,
      enableFees,
      portfolioDuration,
      tranches,
      repayLoanInFull,
      wallet,
      lenderA,
      lenderB,
      redeemFromTranche,
    } = await fixture()

    await depositToTranches()
    const startTx = await startPortfolioAndEnableLiveActions()

    const loan = getLoan({ principal: await token.balanceOf(structuredPortfolio.address) })
    const loanId = await addAndFundLoan(loan)

    await enableFees()

    await timeTravelFrom(startTx, portfolioDuration + 1)
    await structuredPortfolio.close()

    for (const tranche of tranches) {
      expect(await tranche.unpaidManagerFee()).to.be.gt(0)
      expect(await tranche.unpaidProtocolFee()).to.be.gt(0)
    }

    await repayLoanInFull(loanId)

    for (const tranche of tranches) {
      expect(await tranche.unpaidManagerFee()).to.eq(0)
      expect(await tranche.unpaidProtocolFee()).to.eq(0)
    }

    for (const tranche of tranches) {
      await tranche.connect(lenderA).approve(wallet.address, constants.MaxUint256)
      await redeemFromTranche(tranche, await tranche.balanceOf(lenderA.address), lenderA.address, lenderA.address)

      await tranche.connect(lenderB).approve(wallet.address, constants.MaxUint256)
      await redeemFromTranche(tranche, await tranche.balanceOf(lenderB.address), lenderB.address, lenderB.address)

      expect(await token.balanceOf(tranche.address)).to.eq(0)
    }
  })
})
