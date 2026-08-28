# Tabby

Tabby splits the cost of a shared event — a dinner, a trip — among the people who were there. Its distinguishing move is that the people split it *themselves*: the organizer records what was bought, then shares one link, and each person claims what they consumed rather than having a share assigned to them.

## Language

**Group**:
One shared event with a cost to divide — a trip, a dinner, a party. Event-scoped: it has a natural end, not a running relationship.
_Avoid_: Event, trip, tab, ledger

**Organizer**:
The authenticated user who owns a Group, records its Expenses, and repairs its roster. The only role that can mutate the expense ledger.
_Avoid_: Owner, admin, host

**Participant**:
A named person who owes or is owed money within one Group. Belongs to exactly one Group, holds no account and no contact details, and comes into existence when someone types their name on the Claim Link. The Organizer is auto-created as one.
_Avoid_: Member, user, person, friend

**Claim Link**:
The single unguessable URL that grants anonymous access to a Group. Its holder may view everything and act as any Participant, but may not create, edit, or delete Expenses. Rotatable by the Organizer.
_Avoid_: Share link, invite, magic link

**Expense**:
One purchase within a Group, recorded by the Organizer, with exactly one Participant as its payer. Composed of Line Items and optional Adjustments.
_Avoid_: Bill, receipt, transaction, purchase

**Line Item**:
One purchasable thing on an Expense — description, quantity, unit price. The unit of claiming. An Expense with nothing to itemise has a single implicit Line Item covering its whole amount.
_Avoid_: Item, entry, row

**Claim**:
An assertion by a Participant that they consumed some of a Line Item, expressed as a number of Shares. Claims *are* the split method; they are what turns an Expense into Balances.
_Avoid_: Assignment, allocation, split

**Share**:
The unit of a Claim. A Line Item's cost divides by the total Shares claimed against it, so the cost is always fully allocated among its claimers, regardless of quantity. Quantity is a completeness check, not a cap.
_Avoid_: Portion, unit, weight, part

**Adjustment**:
A charge on an Expense that is not a Line Item — tax, tip, service fee. Allocated either evenly across claimers or pro-rata to each claimer's claimed subtotal, chosen per Adjustment.
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
