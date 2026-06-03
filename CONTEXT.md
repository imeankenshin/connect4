# Connect Four Context

This context describes the language for the local two-player Connect Four game.

## Language

**Connect Four**:
A local two-player game where players alternate dropping discs into a board and win by connecting four discs.

**Board**:
The 7-column by 6-row play area that holds discs.

**Column**:
A vertical lane in the Board where a player can drop a disc.

**Disc**:
A red or yellow piece occupying one Board cell.

**Turn**:
The current player's opportunity to choose a Column and drop a Disc.

**Preview**:
The visible landing position for the current player's Disc before the Turn is committed.

**Winning line**:
The four connected Disc positions that end the game.

**Score**:
The running count of red wins, yellow wins, and draws across games.

## Relationships

- A **Board** has seven **Columns**.
- A **Column** holds zero to six **Discs**.
- A **Turn** drops one **Disc** into one **Column**.
- A **Winning line** belongs to the completed **Board** state.
- A **Score** is updated after a win or draw.

## Example dialogue

> **Dev:** "When the player hovers a **Column**, should the **Preview** use the same rule as dropping a **Disc**?"
> **Domain expert:** "Yes. The **Preview** shows where the **Disc** would land if that **Turn** were committed."

## Flagged ambiguities

- None yet.
