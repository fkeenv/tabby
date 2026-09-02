# Tabby

Tabby splits the cost of a shared event — a dinner, a trip — among the people who were there. Its distinguishing move is that the people split it *themselves*: the organizer records what was bought, then shares one link, and each person claims what they consumed rather than having a share assigned to them.

## Language

**Group**:
One shared event with a cost to divide — a trip, a dinner, a party. Event-scoped: it has a natural end, not a running relationship. Denominated in exactly one currency, fixed once it holds an Expense.
_Avoid_: Event, trip, tab, ledger

**Organizer**:
The authenticated user who owns a Group, records its Expenses, and repairs its roster. The only role that can mutate the expense ledger.
_Avoid_: Owner, admin, host

**Participant**:
A named person who owes or is owed money within one Group. Belongs to exactly one Group, holds no account and no contact details, and comes into existence when someone types a name on the Claim Link — their own, or an absent person's. The Organizer is auto-created as one. Because names are typed by strangers on a phone, duplicates are expected and the Organizer repairs the roster by renaming, merging, or deleting.
_Avoid_: Member, user, person, friend

**Claim Link**:
The single unguessable URL that grants anonymous access to a Group. Its holder may view everything, claim, record a Payment, and add a Participant — and may act as any Participant while doing so — but may never create, edit, or delete an Expense. Holding it is the only credential; it carries no notion of who is holding it. Rotatable by the Organizer, which strands every other holder.
_Avoid_: Share link, invite, magic link

**Acting Participant**:
The Participant a device is currently claiming and paying as. A remembered default, never an identity: any holder of the Claim Link may switch to any Participant in one tap, with nothing to confirm and nothing verified. It exists so the person holding the phone does not have to say who they are on every tap — not to establish that they are that person. Never described as being signed in, because nobody is.
_Avoid_: Current user, session, logged-in participant, me

**Expense**:
One purchase within a Group, recorded by the Organizer, with exactly one Participant as its payer. Composed of Line Items and optional Adjustments. Correctable and removable by the Organizer at any time, including after people have claimed against it: Balances re-derive underneath, and the change is recorded as Activity rather than versioned.
_Avoid_: Bill, receipt, transaction, purchase

**Line Item**:
One purchasable thing on an Expense — description, quantity, unit price. The unit of claiming. An Expense with nothing to itemise has a single implicit Line Item covering its whole amount.
_Avoid_: Item, entry, row

**Claim**:
An assertion by a Participant that they consumed some of a Line Item, expressed as a number of Shares. Claims *are* the split method; they are what turns an Expense into Balances. Survives correction of the Line Item beneath it — a changed price or quantity alters what the Claim costs, never whether it was made — and survives that Line Item's removal, counting for nothing while it is gone.
_Avoid_: Assignment, allocation, split

**Share**:
The unit of a Claim. A Line Item's cost divides by the total Shares claimed against it, so the cost is always fully allocated among its claimers, regardless of quantity. Division is exact: the cost is split into whole units of the Group's currency and the leftover is handed out by a fixed remainder rule, never dropped or invented. Quantity is a completeness check, not a cap.
_Avoid_: Portion, unit, weight, part

**Allocation**:
What one Participant owes for one Line Item or one Adjustment — always a whole number of units of the Group's currency, always derived. Exact: a Line Item's or Adjustment's Allocations sum to its cost, never a unit over or under.
_Avoid_: Split, portion, amount, apportionment

**Unclaimed**:
The part of an Expense that no Claim reaches — a Line Item nobody took a Share of, or an Adjustment with nobody to divide among. Named rather than hidden, so that an Expense always accounts for itself: Allocations plus Unclaimed equal its total.
_Avoid_: Leftover, remainder, unassigned, orphaned

**Adjustment**:
A charge on an Expense that is not a Line Item — tax, tip, service fee. Allocated either pro-rata to each claimer's subtotal on that Expense, or evenly among every Participant who has claimed anything in the Group, chosen per Adjustment. May be negative, for a discount or voucher.
_Avoid_: Fee, extra, surcharge, modifier

**Balance**:
What a Participant net owes or is owed, derived from their Claims and Payments. Always computed, never stored, and never frozen — a late Claim moves it.
_Avoid_: Total, debt, amount owed

**Suggested Transfer**:
One payment in the minimal set that would clear every Balance in a Group. A suggestion only: it may pair two Participants who never shared an Expense.
_Avoid_: Settlement, debt, transfer

**Payment**:
A record that one Participant paid another some amount, entered by hand and unverified. Anyone with the Claim Link may record one. Reduces a Balance; does not close it.
_Avoid_: Settlement, transaction, payout

**Activity**:
One recorded change to a Group — who made it and what it was, in a sentence a stranger can read. Append-only and never edited, visible to everyone holding the Claim Link because that visibility is the only protection a Group has where nothing is verified. Outlives whatever it describes, so a deleted Expense keeps its deletion on the record, and is purged only when the Group is. A history of changes, not a version of the thing changed: it says the price moved, never what the bill looked like on Tuesday.
_Avoid_: Event (a Group *is* the shared event), log, audit trail, history, feed

**Settled**:
A Group whose every Balance is zero. Derived, never stored, and never final — a late Claim moves a Balance and the Group is no longer Settled. It describes the money at this moment; it is not a state a Group arrives at and stays in.
_Avoid_: Closed, complete, finished, done, locked

**Archived**:
A Group the Organizer has put out of sight. Their housekeeping and nothing more: it drops the Group from the default dashboard view and changes nothing else — the Claim Link keeps working, Claims and Payments keep landing, Balances stay live. Independent of Settled: an unsettled Group may be Archived, and a Settled one need not be.
_Avoid_: Closed, hidden, inactive, completed, finished
