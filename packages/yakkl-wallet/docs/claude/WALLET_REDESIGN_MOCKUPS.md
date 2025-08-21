# YAKKL Smart Wallet Redesign Mockups

## Design Principles
- **2-Click Maximum**: Any core action should be achievable in 2 clicks or less
- **Progressive Disclosure**: Show only what's needed, when it's needed
- **Clear Hierarchy**: Primary actions prominent, secondary actions accessible but not distracting
- **Modern Fintech**: Clean, trust-inspiring design with clear data visualization
- **Pro Differentiation**: Clear visual indicators for Pro features

---

## 1. Main Dashboard (Simplified)

### Desktop View
```
┌─────────────────────────────────────────────────────────────────┐
│ [≡]  YAKKL                                    [🔔] [👤]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Total Balance                                                  │
│  ┌───────────────────────────────────────┐                    │
│  │         $12,543.67                     │                    │
│  │         ▲ +2.34% ($287.43) today       │                    │
│  └───────────────────────────────────────┘                    │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │    Send     │  │   Receive   │  │    Swap     │           │
│  │     ↑       │  │     ↓       │  │     ⇄       │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                 │
│  Assets ────────────────────────────────────────               │
│  ┌─────────────────────────────────────────────┐              │
│  │ 🪙 ETH    2.34 ETH         $4,287.43  ▲2.1% │              │
│  ├─────────────────────────────────────────────┤              │
│  │ 💵 USDC   5,000 USDC       $5,000.00  →0.0% │              │
│  ├─────────────────────────────────────────────┤              │
│  │ 🔷 MATIC  3,200 MATIC      $3,256.24  ▼1.2% │              │
│  └─────────────────────────────────────────────┘              │
│                                                                 │
│  Recent Activity ─────────────────────────────                 │
│  ┌─────────────────────────────────────────────┐              │
│  │ ↓ Received 0.5 ETH from 0x1234...         2h │              │
│  │ ↑ Sent 100 USDC to alice.eth            12h │              │
│  │ ⇄ Swapped 1 ETH → 1,800 USDC           1d  │              │
│  └─────────────────────────────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile View
```
┌─────────────────────┐
│ ≡  YAKKL       🔔 👤│
├─────────────────────┤
│                     │
│ Total Balance       │
│ ┌─────────────────┐ │
│ │   $12,543.67    │ │
│ │   ▲ +2.34%      │ │
│ └─────────────────┘ │
│                     │
│ ┌───┐ ┌───┐ ┌───┐ │
│ │ ↑ │ │ ↓ │ │ ⇄ │ │
│ │Send││Recv││Swap│ │
│ └───┘ └───┘ └───┘ │
│                     │
│ Assets              │
│ ┌─────────────────┐ │
│ │ ETH    $4,287   │ │
│ │ 2.34   ▲2.1%    │ │
│ ├─────────────────┤ │
│ │ USDC   $5,000   │ │
│ │ 5,000  →0.0%    │ │
│ └─────────────────┘ │
│                     │
│ [View All Assets]   │
│                     │
└─────────────────────┘
```

### Key Features:
- **Single Balance View**: Total portfolio value at the top
- **3 Primary Actions**: Send, Receive, Swap (1 click to action)
- **Simplified Asset List**: Top assets visible, others accessible via scroll/expand
- **Recent Activity**: Last 3 transactions, full history one click away

---

## 2. Send Flow (2-Click Goal)

### Step 1: Click Send → Recipient Selection
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Send                                               [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  To: ┌─────────────────────────────────────┐                   │
│      │ 🔍 Search name, ENS, or address...  │                   │
│      └─────────────────────────────────────┘                   │
│                                                                 │
│  Recent Contacts ──────────────────────────                    │
│  ┌─────────────────────────────────────────┐                   │
│  │ 👤 alice.eth                          ⭐ │                   │
│  │ 👤 bob.wallet                         ⭐ │                   │
│  │ 👤 0x7890...abcd                        │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  [📋 Paste Address]  [📷 Scan QR]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Amount & Review (After selecting recipient)
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Send to alice.eth                                  [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Amount                                                         │
│  ┌─────────────────────────────────────────┐                   │
│  │              0.00                        │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   ETH    │  │   USDC   │  │  MATIC   │  │   DAI    │      │
│  │ 2.34 ETH │  │ 5,000    │  │ 3,200    │  │  500     │      │
│  │ $4,287   │  │ $5,000   │  │ $3,256   │  │  $500    │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│         ▲ Selected                                              │
│                                                                 │
│  [25%] [50%] [75%] [MAX]                                       │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ Network Fee: ~$2.34 (Fast)              │                   │
│  │ Total: 0.00 ETH + $2.34 fee             │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  [Review & Send →]                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Confirmation (Final Step)
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Confirm Transaction                                 [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │         Sending 0.5 ETH                  │                   │
│  │                                          │                   │
│  │    From: Your Wallet                     │                   │
│  │      To: alice.eth                       │                   │
│  │  Amount: 0.5 ETH ($917.50)              │                   │
│  │     Fee: ~$2.34                          │                   │
│  │   Total: $919.84                         │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│         [Cancel]  [Confirm & Send]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Receive Flow

### Single Screen (1-Click from Dashboard)
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Receive                                            [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your Address                                                   │
│  ┌─────────────────────────────────────────┐                   │
│  │          [QR CODE HERE]                  │                   │
│  │                                          │                   │
│  │      0x1234...5678abcd                  │                   │
│  │                                          │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  Network: Ethereum Mainnet [▼]                                  │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ 0x1234567890abcdef1234567890abcdef12... │ [📋 Copy]        │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  [Share Address]  [Request Payment] ᴾᴿᴼ                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Token Management

### Token List (Accessible from Dashboard "View All")
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Manage Tokens                                      [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🔍 Search tokens...]                          [+ Add Token]   │
│                                                                 │
│  Your Tokens ──────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 🪙 ETH     2.34 ETH      $4,287.43    ▲2.1% │ [⋮]          │
│  ├─────────────────────────────────────────────┤               │
│  │ 💵 USDC    5,000 USDC    $5,000.00    →0.0% │ [⋮]          │
│  ├─────────────────────────────────────────────┤               │
│  │ 🔷 MATIC   3,200 MATIC   $3,256.24    ▼1.2% │ [⋮]          │
│  ├─────────────────────────────────────────────┤               │
│  │ 🟡 DAI     500 DAI       $500.00      →0.0% │ [⋮]          │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Hidden Tokens (2) ────────────────────────────                │
│  [Show Hidden Tokens]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Settings/Profile

### Main Settings Screen
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Settings                                           [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Profile ──────────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 👤 Account 1                                │ >             │
│  │    0x1234...5678                            │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Security ─────────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 🔐 Password & Security                      │ >             │
│  ├─────────────────────────────────────────────┤               │
│  │ 🔑 Recovery Phrase                          │ >             │
│  ├─────────────────────────────────────────────┤               │
│  │ 🛡️ Emergency Kit ᴾᴿᴼ                         │ >             │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Preferences ──────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 🌐 Language & Region                        │ >             │
│  ├─────────────────────────────────────────────┤               │
│  │ 💱 Default Currency                         │ > USD         │
│  ├─────────────────────────────────────────────┤               │
│  │ 🌓 Theme                                    │ > Auto        │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Advanced ─────────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ ⚡ Network Settings                         │ >             │
│  ├─────────────────────────────────────────────┤               │
│  │ 👀 Watch Accounts ᴾᴿᴼ                       │ >             │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Transaction History

### History View (Accessible from Dashboard)
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Transaction History                                [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [All] [Sent] [Received] [Swapped]        [🔍] [📥 Export ᴾᴿᴼ] │
│                                                                 │
│  Today ────────────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ ↓ Received      0.5 ETH         +$917.50    │ >             │
│  │   From: 0x7890...abcd           2:34 PM     │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Yesterday ────────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ ↑ Sent          100 USDC        -$100.00    │ >             │
│  │   To: alice.eth                 4:22 PM     │               │
│  ├─────────────────────────────────────────────┤               │
│  │ ⇄ Swapped       1 ETH → 1,800 USDC          │ >             │
│  │   Via: Uniswap                  11:15 AM    │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  This Week ────────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ ↑ Sent          0.1 ETH         -$183.50    │ >             │
│  │   To: bob.wallet                Mon 3:45 PM │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  [Load More]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Transaction Detail (After clicking a transaction)
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Transaction Details                                [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Confirmed                                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────┐               │
│  │ Received 0.5 ETH                            │               │
│  │                                              │               │
│  │ From:    0x7890...abcd                      │ [📋]         │
│  │ To:      Your Wallet (0x1234...5678)        │ [📋]         │
│  │ Amount:  0.5 ETH ($917.50)                  │               │
│  │ Fee:     0.002 ETH ($3.67) - Paid by sender │               │
│  │ Time:    Oct 24, 2024, 2:34:22 PM           │               │
│  │ Block:   18,234,567                          │               │
│  │ Network: Ethereum Mainnet                    │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Transaction Hash                                               │
│  ┌─────────────────────────────────────────────┐               │
│  │ 0xabcd1234567890abcdef...                   │ [📋]         │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  [View on Etherscan ↗]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Watch Accounts (Pro Feature)

### Watch Account List
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Watch Accounts ᴾᴿᴼ                                 [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Monitor any wallet address without private keys                │
│                                                                 │
│  [+ Add Watch Account]                                          │
│                                                                 │
│  Your Watch List ──────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 👁️ vitalik.eth                              │ >             │
│  │    Balance: $45.2M                           │               │
│  │    Last Active: 2 hours ago                  │               │
│  ├─────────────────────────────────────────────┤               │
│  │ 👁️ Treasury Wallet                           │ >             │
│  │    0xAbC1...2345                             │               │
│  │    Balance: $12.3M                           │               │
│  │    Last Active: 1 day ago                    │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  ⚡ Set up alerts for watched addresses                         │
│  [Configure Alerts]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Emergency Kit (Pro Feature)

### Emergency Kit Setup
```
┌─────────────────────────────────────────────────────────────────┐
│ [←] Emergency Kit ᴾᴿᴼ                                  [✕]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🛡️ Protect Your Assets                                         │
│  Set up emergency access for trusted contacts                   │
│                                                                 │
│  How it works ─────────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 1. Add trusted contacts                      │               │
│  │ 2. Set waiting period (24h - 30 days)       │               │
│  │ 3. They can request access if needed        │               │
│  │ 4. You're notified and can cancel anytime   │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  Trusted Contacts ─────────────────────────────                │
│  ┌─────────────────────────────────────────────┐               │
│  │ 👤 spouse.eth          Wait: 48 hours       │ [⚙️]          │
│  ├─────────────────────────────────────────────┤               │
│  │ 👤 lawyer@firm.com     Wait: 7 days         │ [⚙️]          │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  [+ Add Trusted Contact]                                        │
│                                                                 │
│  Status: ✅ Active                                              │
│  Last verified: Oct 20, 2024                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Mobile-Responsive Versions

### Mobile Navigation Pattern
```
┌─────────────────────┐
│     YAKKL      🔔 👤│
├─────────────────────┤
│                     │
│   Main Content      │
│                     │
│                     │
├─────────────────────┤
│  🏠   💸   📊   ⚙️  │
│ Home Send Stats More│
└─────────────────────┘
```

### Mobile Send Flow - Recipient
```
┌─────────────────────┐
│ ← Send          ✕  │
├─────────────────────┤
│                     │
│ To:                 │
│ ┌─────────────────┐ │
│ │ 🔍 Search...    │ │
│ └─────────────────┘ │
│                     │
│ Recent              │
│ ┌─────────────────┐ │
│ │ 👤 alice.eth  ⭐│ │
│ ├─────────────────┤ │
│ │ 👤 bob.wallet ⭐│ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │  📋 Paste       │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │  📷 Scan QR     │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘
```

### Mobile Send Flow - Amount
```
┌─────────────────────┐
│ ← Send to alice.eth │
├─────────────────────┤
│                     │
│ Amount              │
│ ┌─────────────────┐ │
│ │      0.00        │ │
│ └─────────────────┘ │
│                     │
│ ┌────┐┌────┐┌────┐ │
│ │ETH ││USDC││MATIC│ │
│ │2.34││5000││3200 │ │
│ └────┘└────┘└────┘ │
│                     │
│ ┌────┐┌────┐┌────┐ │
│ │25% ││50% ││MAX │ │
│ └────┘└────┘└────┘ │
│                     │
│ Fee: ~$2.34         │
│                     │
│ ┌─────────────────┐ │
│ │ Review & Send → │ │
│ └─────────────────┘ │
│                     │
└─────────────────────┘
```

---

## Design System Notes

### Colors
- **Primary**: Brand Blue (#0066FF)
- **Success**: Green (#00D26A)
- **Danger**: Red (#FF3838)
- **Warning**: Orange (#FFB800)
- **Pro Badge**: Gold (#FFD700)
- **Background**: White/Light Gray
- **Text**: Dark Gray (#1A1A1A)

### Typography
- **Headings**: System font, bold
- **Body**: System font, regular
- **Numbers**: Monospace for amounts

### Component Patterns
- **Cards**: Subtle shadows, rounded corners
- **Buttons**: Primary actions filled, secondary outlined
- **Pro Features**: Gold "PRO" badge
- **Loading**: Skeleton screens, not spinners
- **Empty States**: Helpful illustrations with CTAs

### Interaction Patterns
- **Swipe**: Back navigation on mobile
- **Pull to Refresh**: Update balances
- **Long Press**: Quick actions on tokens/transactions
- **Haptic Feedback**: On successful actions (mobile)

### Accessibility
- **High Contrast**: Option in settings
- **Large Text**: Scalable UI
- **Screen Reader**: Proper ARIA labels
- **Keyboard Navigation**: Full support on desktop

---

## Implementation Priority

1. **Phase 1**: Core flows (Dashboard, Send, Receive)
2. **Phase 2**: Token management, Transaction history
3. **Phase 3**: Settings, Profile management
4. **Phase 4**: Pro features (Watch accounts, Emergency Kit)
5. **Phase 5**: Advanced features, optimizations

Each phase should maintain the 2-click goal and progressive disclosure principles throughout.