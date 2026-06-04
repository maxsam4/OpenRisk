# Project Charter

## No Composite Scoring (binding constraint)

This project aggregates third-party DeFi risk feeds and displays each feed's
assessment **verbatim**. It MUST NOT produce, store, or display any composite,
derived, normalized, or synthesized risk score, ranking, or rating of its own.

This is enforced in code: the data schema has no field for a derived score, and
`validateDataset()` fails CI if such a field is introduced.

## Changing this constraint

This constraint may only change via a PR that (a) amends this charter, (b) is
approved by the project steward, and (c) documents the rationale publicly. Absent
all three, the no-composite-scoring rule stands.
