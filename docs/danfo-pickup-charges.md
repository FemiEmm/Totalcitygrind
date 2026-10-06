# Danfo pickup charges

Danfo income comes from passenger fares. There is no route-completion bonus. BRT salary is unchanged.

When at least one passenger boards, the first pickup of the game day costs 1,000 naira (owo ticket). Each subsequent pickup stop that day costs 300 naira (owo loading), regardless of the number boarding. Drop-off-only stops incur no charge. The ticket replaces the first loading fee. The paid day lives in economyState and travels with saves and cross-map snapshots.

The charge uses the existing mandatory expense behavior, which can take cash below zero. Each charge is recorded in the wallet ledger. A dedicated rectangular toast displays Paid agbero, the amount and the reason for 3.4 seconds, with 260ms entry/exit fades. It does not block controls. Consecutive notices queue and timers are cleared on unmount. Reduced-motion preferences suppress movement.

No tests or builds run, per user request.
