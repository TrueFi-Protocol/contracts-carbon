import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY } from 'utils/constants'
import { timeTravel, timeTravelAndMine } from 'utils/timeTravel'

describe('StructuredPortfolio.loansValue', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when no FIOLs are in the portfolio', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)

    expect(await structuredPortfolio.loansValue()).to.equal(0)
  })

  it('returns principal for one loan upon funding', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)

    const loan = getLoan({ principal, periodPayment, periodCount: 1 })
    await addAndFundLoan(loan)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principal, parseUSDC(0.01))
  })

  it('includes part of interest payment over time', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)

    const loan = getLoan({ principal, periodPayment, periodCount: 1 })
    await addAndFundLoan(loan)

    const partialInterest = periodPayment.div(4)
    await timeTravelAndMine(DAY / 4)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principal.add(partialInterest), parseUSDC(0.01))
  })

  it('returns principal plus owed interest after end date has elapsed and one repayment has been made', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const loan = getLoan({ principal, periodPayment, periodCount: 3 })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(loanId)
    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(loanId)
    await timeTravelAndMine(DAY * 2)

    expect(await structuredPortfolio.loansValue())
      .to.equal(principal.add(periodPayment))
  })

  it('includes previous interest payment when the borrower is late', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const loan = getLoan({ principal, periodPayment, periodCount: 2 })
    await addAndFundLoan(loan)

    const partialInterest = periodPayment.div(4)
    await timeTravelAndMine(DAY + DAY / 4)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principal.add(periodPayment).add(partialInterest), parseUSDC(0.01))
  })

  it('does not include previous interest payment, when borrower has repaid it', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const loan = getLoan({ principal, periodPayment, periodCount: 2 })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(loanId)

    const partialInterest = periodPayment.div(4)
    await timeTravelAndMine(DAY / 4)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principal.add(partialInterest), parseUSDC(0.01))
  })

  it('returns 0 value if early repayments exceed principal plus estimated interest', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(10)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const loan = getLoan({ principal, periodPayment, periodCount: 3 })
    const loanId = await addAndFundLoan(loan)

    await structuredPortfolio.connect(other).repayLoan(loanId)
    await structuredPortfolio.connect(other).repayLoan(loanId)

    expect(await structuredPortfolio.loansValue())
      .to.equal(0)
  })

  it('returns 0 value if repaid amount exceeds principal plus estimated interest', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(5)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const loan = getLoan({ principal, periodPayment, periodCount: 2 })
    const loanId = await addAndFundLoan(loan)

    await structuredPortfolio.connect(other).repayLoan(loanId)

    expect(await structuredPortfolio.loansValue())
      .to.equal(0)
  })

  it('returns principal plus one interest payment when the loan end date is elapsed but not fully repaid', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)

    const loan = getLoan({ principal, periodPayment, periodCount: 1 })
    await addAndFundLoan(loan)
    await timeTravelAndMine(loan.periodDuration * loan.periodCount + loan.gracePeriod + 1)

    expect(await structuredPortfolio.loansValue())
      .to.equal(principal.add(periodPayment))
  })

  it('returns 0 after the loan is fully repaid', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const loan = getLoan({ principal, periodPayment, periodCount: 1 })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(loanId)

    expect(await structuredPortfolio.loansValue())
      .to.equal(0)
  })

  it('works for 2 loans in progress', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principalFirst = parseUSDC(50)
    const periodPaymentFirst = parseUSDC(10)
    const principalSecond = parseUSDC(20)
    const periodPaymentSecond = parseUSDC(5)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const firstLoan = getLoan({ principal: principalFirst, periodPayment: periodPaymentFirst, periodCount: 2 })
    const firstLoanId = await addAndFundLoan(firstLoan)
    const secondLoan = getLoan({ principal: principalSecond, periodPayment: periodPaymentSecond, periodCount: 1, periodDuration: 2 * DAY })
    await addAndFundLoan(secondLoan)

    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(firstLoanId)
    await timeTravelAndMine(DAY / 4)

    const unpaidInterestFirst = periodPaymentFirst.div(4)
    const unpaidInterestSecond = periodPaymentSecond.mul(5).div(8)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principalFirst.add(principalSecond).add(unpaidInterestFirst).add(unpaidInterestSecond), parseUSDC(0.01))
  })

  it('works for 1 loan completed and 1 in progress', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principalFirst = parseUSDC(50)
    const periodPaymentFirst = parseUSDC(10)
    const principalSecond = parseUSDC(20)
    const periodPaymentSecond = parseUSDC(5)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const firstLoan = getLoan({ principal: principalFirst, periodPayment: periodPaymentFirst, periodCount: 2 })
    const firstLoanId = await addAndFundLoan(firstLoan)
    const secondLoan = getLoan({ principal: principalSecond, periodPayment: periodPaymentSecond, periodCount: 2, periodDuration: 2 * DAY })
    const secondLoanId = await addAndFundLoan(secondLoan)

    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(firstLoanId)
    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(secondLoanId)
    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(firstLoanId)
    await timeTravelAndMine(DAY / 4)

    const unpaidInterestSecond = periodPaymentSecond.mul(5).div(8)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principalSecond.add(unpaidInterestSecond), parseUSDC(0.01))
  })

  it('works for 1 loan repaid early and 1 in progress', async () => {
    const { structuredPortfolio, addAndFundLoan, other, token, getLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const principalFirst = parseUSDC(50)
    const periodPaymentFirst = parseUSDC(10)
    const principalSecond = parseUSDC(20)
    const periodPaymentSecond = parseUSDC(5)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)

    const firstLoan = getLoan({ principal: principalFirst, periodPayment: periodPaymentFirst, periodCount: 2 })
    const firstLoanId = await addAndFundLoan(firstLoan)
    const secondLoan = getLoan({ principal: principalSecond, periodPayment: periodPaymentSecond, periodCount: 2, periodDuration: 2 * DAY })
    await addAndFundLoan(secondLoan)

    await timeTravel(DAY)
    await structuredPortfolio.connect(other).repayLoan(firstLoanId)
    await structuredPortfolio.connect(other).repayLoan(firstLoanId)
    await timeTravelAndMine(DAY / 4)

    const unpaidInterestSecond = periodPaymentSecond.mul(5).div(8)

    expect(await structuredPortfolio.loansValue())
      .to.be.closeTo(principalSecond.add(unpaidInterestSecond), parseUSDC(0.01))
  })

  it('returns 0 for defaulted loan', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan, other, token } = await loadFixture(structuredPortfolioLiveFixture)
    const principal = parseUSDC(100)
    const periodPayment = parseUSDC(10)
    await token.connect(other).approve(structuredPortfolio.address, 1e10)
    const loan = getLoan({
      principal,
      periodPayment,
    })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(loan.periodDuration + loan.gracePeriod + 1)
    await structuredPortfolio.markLoanAsDefaulted(loanId)

    expect(await structuredPortfolio.loansValue())
      .to.equal(0)
  })
})
