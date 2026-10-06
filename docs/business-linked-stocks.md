# Business-linked stocks

This is the local, saved-game implementation. It does not aggregate multiplayer transactions yet. A shared server must validate receipts and settle a single market before multiplayer launch.

## Company ownership

- MegaPay: collected loan interest, simulated lending income from retained savings; savings interest is a cost. Loan principal, deposits and withdrawals are not revenue.
- Seventomi Real Estate: property purchases, deposits, mortgage payments and weekly home rent. Player landlords receive 95% of collected rental income; the 5% management fee is agency revenue.
- Technopack PLC: Starting Residential and Work Hub fuel stations; General Hospital.
- Gidi Investments: Wealthy Residential, Nightlife and Coast City fuel; Private Clinic, mobile doctor and roadside fuel delivery.
- Kilobeat Enterprises: supermarket purchases only. The neighbourhood food shop is excluded.
- Cquence Studios: all restaurant purchases.

## Settlement and accounting

Each successful payment records one unique receipt. No historical ledger replay. Cash and savings portions of property payments are separate receipts, each counting only the amount actually paid. Loan repayments allocate remaining interest proportionally; splitting repayment does not create extra profit. Existing loans without recorded interest start with zero tracked interest rather than counting old principal as profit.

Revenue less a configurable operating cost ratio and daily overhead produces daily profit. Smoothed profit retains 65% of the prior result and adds 35% of today's profit. Price movement combines profit level (3.5%) and improvement (1.5%), using bounded tanh curves; prices cannot move more than 5% per game day. Prices use whole naira with a minimum of 25. A quiet day can lower prices through overhead costs. Share gains are not paid automatically; selling realizes current market value.

MegaPay's simulated loan-book income is 0.4% of the time-weighted savings balance per game day. Depositing and immediately withdrawing adds no retained funding. Actual collected loan interest is counted separately. Weekly savings interest reduces profit. There is no loan-default event in the current game; no fictional default loss is generated.

Refund support requires the original receipt and caps reversals at its remaining value. Receipts are retained for 30 game days; no current gameplay refund action was added. This local ledger is not a substitute for server-side anti-cheat protection.

Daily settlement runs during normal day changes, sleep, and saved-game restoration. Shares, costs, receipts, adviser history, savings and loan balances persist in saves and travel snapshots. Legacy holdings and cost basis remain; Gidi is added with no owned shares. Previously paid legacy gains are not clawed back.

## Adviser

Available in Messages > Stock Adviser: 1,000 naira for seven game days, renewed automatically until cancelled. Cancellation preserves the paid period. Failed renewal pauses updates and retries daily without overdrawing cash; players can cancel retry attempts. Sends company-specific messages after daily price changes of at least 0.5%, suggesting buying on a rise or considering a sale on a fall. Tips are based on recent performance, not guaranteed forecasts. Successful renewals, payment failures, cancellation and expiry send messages. Messages has a Stock Adviser conversation and unread badge; the last 60 messages are kept. Reading messages clears its unread indicator.

## Validation

Source reviewed only. No tests, builds, browser sessions or services run, as requested by the user.
