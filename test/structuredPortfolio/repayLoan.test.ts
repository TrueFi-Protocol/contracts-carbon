import { expect } from 'chai'
import { BigNumber, constants } from 'ethers'
import { Loan } from 'fixtures/setupLoansManagerHelpers'
import { structuredPortfolioLiveFixture, structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('StructuredPortfolio.repayLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts in capital formation', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await expect(structuredPortfolio.repayLoan(1)).to.be.revertedWith('SP: Cannot repay in capital formation')
  })

  it('repay defaulted loan in Live status', async () => {
    const {
      structuredPortfolio,
      addAndFundLoan,
      repayLoanInFull,
      parseTokenUnits,
      seniorTranche,
      juniorTranche,
      equityTranche,
      getLoan,
      withInterest,
      senior,
      junior,
      totalDeposit,
    } = await loadFixture(structuredPortfolioLiveFixture)

    const loan = getLoan({
      principal: parseTokenUnits(6e6),
      periodPayment: parseTokenUnits(1e4),
      periodCount: 1,
      periodDuration: DAY,
      gracePeriod: 0,
    })

    const delta = parseTokenUnits(1)

    const loanId = await addAndFundLoan(loan)
    await timeTravel(loan.periodDuration + loan.gracePeriod + 1)
    await structuredPortfolio.markLoanAsDefaulted(loanId)

    await repayLoanInFull(loanId)

    const totalAssetsAfterRepay = totalDeposit.add(loan.periodPayment)
    const seniorValueAfterRepay = withInterest(senior.initialDeposit, senior.targetApy, DAY)
    const juniorValueAfterRepay = withInterest(junior.initialDeposit, junior.targetApy, DAY)
    const equityValueAfterRepay = totalAssetsAfterRepay.sub(seniorValueAfterRepay).sub(juniorValueAfterRepay)

    const waterfall = await structuredPortfolio.calculateWaterfall()
    expect(waterfall[2]).to.be.closeTo(seniorValueAfterRepay, delta)
    expect(waterfall[1]).to.be.closeTo(juniorValueAfterRepay, delta)
    expect(waterfall[0]).to.be.closeTo(equityValueAfterRepay, delta)

    await timeTravel(YEAR)
    await structuredPortfolio.close()

    const seniorValueAfterYear = withInterest(seniorValueAfterRepay, senior.targetApy, YEAR)
    const juniorValueAfterYear = withInterest(juniorValueAfterRepay, junior.targetApy, YEAR)
    const equityValueAfterYear = totalAssetsAfterRepay.sub(seniorValueAfterYear).sub(juniorValueAfterYear)

    expect(await seniorTranche.totalAssets()).to.be.closeTo(seniorValueAfterYear, delta)
    expect(await juniorTranche.totalAssets()).to.be.closeTo(juniorValueAfterYear, delta)
    expect(await equityTranche.totalAssets()).to.be.closeTo(equityValueAfterYear, delta)
  })

  it('reverts when portfolio is paused', async () => {
    const { structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(structuredPortfolio.repayLoan(1)).to.be.revertedWith('Pausable: paused')
  })

  describe('repay during Closed status', () => {
    const DELTA = 1e5

    it('reverts if loan not issued by portfolio', async () => {
      const { structuredPortfolio, token, wallet, fixedInterestOnlyLoans, loan } = await loadFixture(structuredPortfolioLiveFixture)
      const { principal, periodDuration, periodPayment, periodCount, gracePeriod, canBeRepaidAfterDefault } = loan

      await token.approve(structuredPortfolio.address, constants.MaxUint256)
      await fixedInterestOnlyLoans.issueLoan(token.address, principal, periodCount, periodPayment, periodDuration, wallet.address, gracePeriod, canBeRepaidAfterDefault)
      const loanId = 0
      await fixedInterestOnlyLoans.acceptLoan(loanId)
      await fixedInterestOnlyLoans.start(loanId)
      await fixedInterestOnlyLoans.transferFrom(wallet.address, structuredPortfolio.address, loanId)

      await structuredPortfolio.close()

      await expect(structuredPortfolio.repayLoan(loanId)).to.be.revertedWith('LM: Not issued by this contract')
    })

    it('updates distributed assets', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        repayLoanInFull,
        tranches,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod
      const loan: Loan = {
        ...basicLoan,
        periodCount: 1,
        periodDuration: loanDuration,
      }
      const loanId = await addAndFundLoan(loan)
      await timeTravel(loanDuration + loan.gracePeriod + 1)
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      await structuredPortfolio.close()

      await repayLoanInFull(loanId)

      for (let i = 0; i < tranches.length; i++) {
        const { distributedAssets } = await structuredPortfolio.tranchesData(i)
        expect(distributedAssets).to.eq(await tranches[i].totalAssets())
      }
    })

    it('all to equity', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        equityTranche,
        repayLoanInFull,
        getFullRepayAmount,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod
      const loan: Loan = {
        ...basicLoan,
        periodCount: 1,
        periodDuration: loanDuration,
      }
      const loanId = await addAndFundLoan(loan)
      await timeTravel(loanDuration + loan.gracePeriod + 1)
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      await structuredPortfolio.close()

      const equityTotalAssetsBefore = await equityTranche.totalAssets()
      await repayLoanInFull(loanId)
      const repayAmount = getFullRepayAmount(loan)

      expect(await equityTranche.totalAssets()).to.be.closeTo(equityTotalAssetsBefore.add(repayAmount), DELTA)
    })

    it('to junior and equity', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        equityTranche,
        juniorTranche,
        repayLoanInFull,
        getFullRepayAmount,
        initialDeposits,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod
      const [equityDeposit] = initialDeposits
      const loan: Loan = {
        ...basicLoan,
        principal: equityDeposit,
        periodCount: 1,
        periodDuration: loanDuration,
      }
      const loanId = await addAndFundLoan(loan)
      await timeTravel(loanDuration + loan.gracePeriod + 1)

      await structuredPortfolio.markLoanAsDefaulted(loanId)
      await structuredPortfolio.close()

      const equityTotalAssetsBefore = await equityTranche.totalAssets()
      const juniorTotalAssetsBefore = await juniorTranche.totalAssets()

      const juniorTrancheTargetValue = (await structuredPortfolio.tranchesData(1)).maxValueOnClose
      expect(juniorTotalAssetsBefore.lt(juniorTrancheTargetValue)).to.be.true

      await repayLoanInFull(loanId)
      const repayAmount = getFullRepayAmount(loan)

      const juniorShare = juniorTrancheTargetValue.sub(juniorTotalAssetsBefore)
      const equityShare = repayAmount.sub(juniorShare)

      expect(await juniorTranche.totalAssets()).to.eq(juniorTrancheTargetValue)

      expect(await equityTranche.totalAssets()).to.be.closeTo(equityTotalAssetsBefore.add(equityShare), DELTA)
    })

    it('all to junior', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        equityTranche,
        juniorTranche,
        seniorTranche,
        repayLoanInFull,
        getFullRepayAmount,
        initialDeposits,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod
      const [equityDeposit, juniorDeposit] = initialDeposits
      const juniorDepositQuarter = juniorDeposit.div(4)

      const loanToRepay: Loan = {
        ...basicLoan,
        principal: juniorDepositQuarter,
        periodCount: 1,
        periodDuration: loanDuration,
      }

      const loanToDefault: Loan = {
        ...loanToRepay,
        principal: equityDeposit.add(juniorDepositQuarter),
      }

      const loanToRepayId = await addAndFundLoan(loanToRepay)
      const loanToDefaultId = await addAndFundLoan(loanToDefault)
      await timeTravel(loanDuration + basicLoan.gracePeriod + 1)

      await structuredPortfolio.markLoanAsDefaulted(loanToRepayId)
      await structuredPortfolio.markLoanAsDefaulted(loanToDefaultId)
      await structuredPortfolio.close()

      const seniorTotalAssetsBefore = await seniorTranche.totalAssets()
      const juniorTotalAssetsBefore = await juniorTranche.totalAssets()

      await repayLoanInFull(loanToRepayId)
      const repayAmount = getFullRepayAmount(loanToRepay)

      expect(await seniorTranche.totalAssets()).to.eq(seniorTotalAssetsBefore)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(juniorTotalAssetsBefore.add(repayAmount), DELTA)
      expect(await equityTranche.totalAssets()).to.eq(0)
    })

    it('to senior and junior', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        equityTranche,
        juniorTranche,
        seniorTranche,
        repayLoanInFull,
        getFullRepayAmount,
        initialDeposits,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod
      const [equityDeposit, juniorDeposit] = initialDeposits
      const juniorDepositHalf = juniorDeposit.div(2)

      const loanToRepay: Loan = {
        ...basicLoan,
        principal: juniorDepositHalf,
        periodCount: 1,
        periodDuration: loanDuration,
      }

      const loanToDefault: Loan = {
        ...loanToRepay,
        principal: equityDeposit.add(juniorDepositHalf),
      }

      const loanToRepayId = await addAndFundLoan(loanToRepay)
      const loanToDefaultId = await addAndFundLoan(loanToDefault)
      await timeTravel(loanDuration + basicLoan.gracePeriod + 1)

      await structuredPortfolio.markLoanAsDefaulted(loanToRepayId)
      await structuredPortfolio.markLoanAsDefaulted(loanToDefaultId)
      await structuredPortfolio.close()

      const juniorTotalAssetsBefore = await juniorTranche.totalAssets()
      const seniorTotalAssetsBefore = await seniorTranche.totalAssets()

      const seniorTrancheTargetValue = (await structuredPortfolio.tranchesData(2)).maxValueOnClose
      expect(seniorTotalAssetsBefore.lt(seniorTrancheTargetValue)).to.be.true

      await repayLoanInFull(loanToRepayId)
      const repayAmount = getFullRepayAmount(loanToRepay)

      const seniorShare = seniorTrancheTargetValue.sub(seniorTotalAssetsBefore)
      const juniorShare = repayAmount.sub(seniorShare)

      expect(await seniorTranche.totalAssets()).to.eq(seniorTrancheTargetValue)
      expect(await juniorTranche.totalAssets()).to.eq(juniorTotalAssetsBefore.add(juniorShare))
      expect(await equityTranche.totalAssets()).to.eq(0)
    })

    it('all to senior', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        equityTranche,
        juniorTranche,
        seniorTranche,
        repayLoanInFull,
        getFullRepayAmount,
        initialDeposits,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod
      const [equityDeposit, juniorDeposit, seniorDeposit] = initialDeposits
      const seniorDepositQuarter = seniorDeposit.div(4)

      const loanToRepay: Loan = {
        ...basicLoan,
        principal: seniorDepositQuarter,
        periodCount: 1,
        periodDuration: loanDuration,
      }

      const loanToDefault: Loan = {
        ...loanToRepay,
        principal: equityDeposit.add(juniorDeposit).add(seniorDepositQuarter),
      }

      const loanToRepayId = await addAndFundLoan(loanToRepay)
      const loanToDefaultId = await addAndFundLoan(loanToDefault)
      await timeTravel(loanDuration + basicLoan.gracePeriod + 1)

      await structuredPortfolio.markLoanAsDefaulted(loanToRepayId)
      await structuredPortfolio.markLoanAsDefaulted(loanToDefaultId)
      await structuredPortfolio.close()

      const seniorTotalAssetsBefore = await seniorTranche.totalAssets()

      await repayLoanInFull(loanToRepayId)
      const repayAmount = getFullRepayAmount(loanToRepay)

      expect(await seniorTranche.totalAssets()).to.eq(seniorTotalAssetsBefore.add(repayAmount))
      expect(await juniorTranche.totalAssets()).to.eq(0)
      expect(await equityTranche.totalAssets()).to.eq(0)
    })

    it('to all tranches', async () => {
      const {
        structuredPortfolio,
        loan: basicLoan,
        addAndFundLoan,
        equityTranche,
        juniorTranche,
        seniorTranche,
        repayLoanInFull,
        getFullRepayAmount,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loanDuration = YEAR - basicLoan.gracePeriod

      const loanToRepay: Loan = {
        ...basicLoan,
        principal: await structuredPortfolio.totalAssets(),
        periodCount: 1,
        periodDuration: loanDuration,
      }

      const loanToRepayId = await addAndFundLoan(loanToRepay)
      await timeTravel(loanDuration + basicLoan.gracePeriod + 1)

      await structuredPortfolio.markLoanAsDefaulted(loanToRepayId)
      await structuredPortfolio.close()

      expect(await seniorTranche.totalAssets()).to.eq(0)
      expect(await juniorTranche.totalAssets()).to.eq(0)
      expect(await equityTranche.totalAssets()).to.eq(0)

      await repayLoanInFull(loanToRepayId)
      const repayAmount = getFullRepayAmount(loanToRepay)

      const seniorTrancheTargetValue = (await structuredPortfolio.tranchesData(2)).maxValueOnClose
      const juniorTrancheTargetValue = (await structuredPortfolio.tranchesData(1)).maxValueOnClose

      const equityShare = repayAmount.sub(seniorTrancheTargetValue).sub(juniorTrancheTargetValue)

      expect(await seniorTranche.totalAssets()).to.eq(seniorTrancheTargetValue)
      expect(await juniorTranche.totalAssets()).to.eq(juniorTrancheTargetValue)
      expect(await equityTranche.totalAssets()).to.eq(equityShare)
    })

    it('loan defaulted right after portfolio start', async () => {
      const {
        getLoan,
        parseTokenUnits,
        addAndFundLoan,
        structuredPortfolio,
        portfolioDuration,
        repayLoanInFull,
        withInterest,
        senior,
        junior,
        totalDeposit,
        seniorTranche,
        juniorTranche,
        equityTranche,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loan = getLoan({
        principal: parseTokenUnits(6e6),
        periodPayment: parseTokenUnits(1e6),
        gracePeriod: 0,
      })

      const loanId = await addAndFundLoan(loan)
      await timeTravel(loan.periodDuration + 1)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      await timeTravel(portfolioDuration - loan.periodDuration)
      await structuredPortfolio.close()
      await repayLoanInFull(loanId)

      const expectedSeniorValueAfterLoan = withInterest(senior.initialDeposit, senior.targetApy, loan.periodDuration)
      const expectedJuniorValueAfterLoan = withInterest(junior.initialDeposit, junior.targetApy, loan.periodDuration)
      const expectedSeniorValue = withInterest(expectedSeniorValueAfterLoan, senior.targetApy, portfolioDuration - loan.periodDuration)
      const expectedJuniorValue = withInterest(expectedJuniorValueAfterLoan, junior.targetApy, portfolioDuration - loan.periodDuration)
      const expectedEquityValue = totalDeposit.add(loan.periodPayment).sub(expectedSeniorValue).sub(expectedJuniorValue)

      expect(await seniorTranche.totalAssets()).to.be.closeTo(expectedSeniorValue, DELTA)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedJuniorValue, DELTA)
      expect(await equityTranche.totalAssets()).to.be.closeTo(expectedEquityValue, DELTA)
    })

    it('loan defaulted in the middle of portfolio duration', async () => {
      const {
        getLoan,
        parseTokenUnits,
        addAndFundLoan,
        structuredPortfolio,
        repayLoanInFull,
        withInterest,
        senior,
        junior,
        totalDeposit,
        seniorTranche,
        juniorTranche,
        equityTranche,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loan = getLoan({
        principal: parseTokenUnits(6e6),
        periodPayment: parseTokenUnits(1e6),
        gracePeriod: 0,
      })

      const loanId = await addAndFundLoan(loan)
      await timeTravel(YEAR)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      await timeTravel(YEAR)
      await structuredPortfolio.close()
      await repayLoanInFull(loanId)

      const expectedSeniorValueAfterYear = withInterest(senior.initialDeposit, senior.targetApy, YEAR)
      const expectedJuniorValueAfterYear = withInterest(junior.initialDeposit, junior.targetApy, YEAR)
      const expectedSeniorValue = withInterest(expectedSeniorValueAfterYear, senior.targetApy, YEAR)
      const expectedJuniorValue = withInterest(expectedJuniorValueAfterYear, junior.targetApy, YEAR)
      const expectedEquityValue = totalDeposit.add(loan.periodPayment).sub(expectedSeniorValue).sub(expectedJuniorValue)

      expect(await seniorTranche.totalAssets()).to.be.closeTo(expectedSeniorValue, DELTA)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedJuniorValue, DELTA)
      expect(await equityTranche.totalAssets()).to.be.closeTo(expectedEquityValue, DELTA)
    })

    it('loan defaulted after portfolio duration', async () => {
      const {
        getLoan,
        parseTokenUnits,
        addAndFundLoan,
        structuredPortfolio,
        repayLoanInFull,
        withInterest,
        senior,
        junior,
        totalDeposit,
        seniorTranche,
        juniorTranche,
        equityTranche,
        portfolioDuration,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const loan = getLoan({
        principal: parseTokenUnits(6e6),
        periodPayment: parseTokenUnits(1e6),
        gracePeriod: 0,
      })

      const loanId = await addAndFundLoan(loan)
      await timeTravel(portfolioDuration)

      await structuredPortfolio.close()
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      await repayLoanInFull(loanId)

      const expectedSeniorValue = withInterest(senior.initialDeposit, senior.targetApy, portfolioDuration)
      const expectedJuniorValue = withInterest(junior.initialDeposit, junior.targetApy, portfolioDuration)
      const expectedEquityValue = totalDeposit.add(loan.periodPayment).sub(expectedSeniorValue).sub(expectedJuniorValue)

      expect(await seniorTranche.totalAssets()).to.be.closeTo(expectedSeniorValue, DELTA)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedJuniorValue, DELTA)
      expect(await equityTranche.totalAssets()).to.be.closeTo(expectedEquityValue, DELTA)
    })

    it('multiple repayments', async () => {
      const {
        structuredPortfolio,
        getLoan,
        addAndFundLoan,
        repayLoanInFull,
        equityTranche,
        juniorTranche,
        seniorTranche,
        senior,
        junior,
        parseTokenUnits,
        portfolioDuration,
        token,
        withInterest,
        totalDeposit,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const periodPayment = parseTokenUnits(1e5)
      const gracePeriod = 0
      const loans = [
        getLoan({ principal: parseTokenUnits(1e6), periodPayment, gracePeriod }),
        getLoan({ principal: parseTokenUnits(2e6), periodPayment, gracePeriod }),
        getLoan({ principal: parseTokenUnits(3e6), periodPayment, gracePeriod }),
      ]

      const loansInterest = periodPayment.mul(loans.length)

      const loanIds: BigNumber[] = []
      for (const loan of loans) {
        loanIds.push(await addAndFundLoan(loan))
      }

      await timeTravel(DAY + 1)

      for (const loanId of loanIds) {
        await structuredPortfolio.markLoanAsDefaulted(loanId)
      }

      await timeTravel(portfolioDuration)

      await structuredPortfolio.close()

      for (const loanId of loanIds) {
        await repayLoanInFull(loanId)
      }

      const expectedSeniorValue = withInterest(senior.initialDeposit, senior.targetApy, portfolioDuration)
      const expectedJuniorValue = withInterest(junior.initialDeposit, junior.targetApy, portfolioDuration)
      const expectedEquityValue = totalDeposit.add(loansInterest).sub(expectedSeniorValue).sub(expectedJuniorValue)

      const delta = parseTokenUnits(100)
      expect(await token.balanceOf(seniorTranche.address)).to.be.closeTo(expectedSeniorValue, delta)
      expect(await token.balanceOf(juniorTranche.address)).to.be.closeTo(expectedJuniorValue, delta)
      expect(await token.balanceOf(equityTranche.address)).to.be.closeTo(expectedEquityValue, delta)
    })

    it('redeem amount is correct after repaying defaulted loan', async () => {
      const {
        structuredPortfolio,
        repayLoanInFull,
        addAndFundLoan,
        getLoan,
        parseTokenUnits,
        other,
        wallet,
        depositToTranche,
        redeemFromTranche,
        equityTranche,
        token,
        equity,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const depositAmount = parseTokenUnits(1e6)
      await depositToTranche(equityTranche, depositAmount, other.address)
      let expectedTotalShares = equity.initialDeposit.add(depositAmount)

      const loan = getLoan({
        principal: parseTokenUnits(1e6),
        periodPayment: parseTokenUnits(1e5),
        gracePeriod: 0,
      })

      const loanId = await addAndFundLoan(loan)
      await timeTravel(loan.periodDuration + 1)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      await timeTravel(YEAR)

      await structuredPortfolio.close()

      let expectedEquityValue = parseTokenUnits(1_700_000)

      const walletBalanceBefore = await token.balanceOf(wallet.address)
      const redeemAmount = expectedTotalShares.div(3)
      await redeemFromTranche(equityTranche, redeemAmount)

      const expectedWithdrawAmount = expectedEquityValue.div(3)
      expectedEquityValue = expectedEquityValue.sub(expectedWithdrawAmount)
      expectedTotalShares = expectedTotalShares.sub(redeemAmount)

      const delta = parseTokenUnits(500)
      expect(await token.balanceOf(wallet.address)).to.be.closeTo(walletBalanceBefore.add(expectedWithdrawAmount), delta)

      await repayLoanInFull(loanId)

      expectedEquityValue = expectedEquityValue.add(loan.principal).add(loan.periodPayment)

      const otherBalanceBefore = await token.balanceOf(other.address)
      await equityTranche.connect(other).redeem(expectedTotalShares.div(2), other.address, other.address)
      expect(await token.balanceOf(other.address)).to.be.closeTo(otherBalanceBefore.add(expectedEquityValue.div(2)), delta)
    })
  })
})
