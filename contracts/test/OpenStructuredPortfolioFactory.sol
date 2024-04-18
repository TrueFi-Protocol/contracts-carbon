// Change License: MIT
pragma solidity ^0.8.16;
import {StructuredPortfolioFactory, IProtocolConfig, IERC20WithDecimals, IFixedInterestOnlyLoans, PortfolioParams, TrancheData, ExpectedEquityRate} from "../StructuredPortfolioFactory.sol";

contract OpenStructuredPortfolioFactory is StructuredPortfolioFactory {
    constructor(
        address _portfolioImplementation,
        address _trancheImplementation,
        IProtocolConfig _protocolConfig
    ) StructuredPortfolioFactory(_portfolioImplementation, _trancheImplementation, _protocolConfig) {}

    function createPortfolio(
        IERC20WithDecimals underlyingToken,
        IFixedInterestOnlyLoans fixedInterestOnlyLoans,
        PortfolioParams calldata portfolioParams,
        TrancheData[] calldata tranchesData,
        ExpectedEquityRate calldata expectedEquityRate
    ) external override {
        _createPortfolio(underlyingToken, fixedInterestOnlyLoans, portfolioParams, tranchesData, expectedEquityRate);
    }
}
