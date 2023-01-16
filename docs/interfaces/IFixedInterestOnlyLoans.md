# interfaces/IFixedInterestOnlyLoans API

## FixedInterestOnlyLoanStatus

<br />

```solidity
enum FixedInterestOnlyLoanStatus {
  Created,
  Accepted,
  Started,
  Repaid,
  Canceled,
  Defaulted
}
```
## IFixedInterestOnlyLoans

<br />

### LoanMetadata

<br />

```solidity
struct LoanMetadata {
  uint256 principal;
  uint256 periodPayment;
  enum FixedInterestOnlyLoanStatus status;
  uint16 periodCount;
  uint32 periodDuration;
  uint40 currentPeriodEndDate;
  address recipient;
  bool canBeRepaidAfterDefault;
  uint16 periodsRepaid;
  uint32 gracePeriod;
  uint40 endDate;
  contract IERC20WithDecimals asset;
}
```

### issueLoan

```solidity
function issueLoan(contract IERC20WithDecimals _asset, uint256 _principal, uint16 _periodCount, uint256 _periodPayment, uint32 _periodDuration, address _recipient, uint32 _gracePeriod, bool _canBeRepaidAfterDefault) external returns (uint256)
```

<br />

### loanData

```solidity
function loanData(uint256 instrumentId) external view returns (struct IFixedInterestOnlyLoans.LoanMetadata)
```

<br />

### updateInstrument

```solidity
function updateInstrument(uint256 _instrumentId, uint32 _gracePeriod) external
```

<br />

### status

```solidity
function status(uint256 instrumentId) external view returns (enum FixedInterestOnlyLoanStatus)
```

<br />

### expectedRepaymentAmount

```solidity
function expectedRepaymentAmount(uint256 instrumentId) external view returns (uint256)
```

<br />

