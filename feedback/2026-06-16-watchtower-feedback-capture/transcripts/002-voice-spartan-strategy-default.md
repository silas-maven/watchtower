# Feedback Item 002 — Spartan strategy checkbox behaviour

Source: WhatsApp voice note transcription provided inline by Hermes
Captured: 2026-06-16
Type: Voice note

## Transcript

“So the Spartan strategy tick box, if they tick it, it should be default ticked, and what that means is the fields will populate from the average implant, and if it's unticked, then it means you can just write what you want, it doesn't need to link to an average implant.”

## Normalised interpretation

- There should be a **Spartan Strategy** checkbox/toggle.
- It should be **ticked by default**.
- When ticked:
  - relevant fields should be populated from the associated **averaging plan**.
  - Next Buy Price and Sell Target should come from the averaging plan rather than manual input.
- When unticked:
  - the user should be able to manually enter values.
  - the fields do not need to be linked to an averaging plan.

## Implementation notes

- Treat “average implant” in the transcription as “averaging plan”.
- Default state for new holdings/plans should be Spartan Strategy enabled unless intentionally disabled.
- Unticking should not delete the averaging plan; it should disconnect calculated values from the displayed/manual target fields.
