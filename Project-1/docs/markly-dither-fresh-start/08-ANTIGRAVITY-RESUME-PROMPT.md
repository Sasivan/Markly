# Resume Markly Dither Fresh-Start Project

Do not guess the completed stage from conversation memory.

1. Read all fresh-start docs in `docs/markly-dither-fresh-start/`.
2. Read `PROGRESS.json` and `PROGRESS.md`.
3. Check the current branch and working tree.
4. Inspect the actual source tree, routes and component files.
5. Run the relevant tests/build for the last completed stage.
6. Compare actual completed work to the checkpoint; correct stale/incorrect progress data.
7. Resume the first incomplete task in the execution plan.
8. Do not redo completed work unless verification finds a defect.
9. Preserve current uncommitted work.
10. Do not touch `main`, deploy, change production or invent backend credentials.

Critical: use only Dither UI as the UI source. The verified framework variant and exact source path are recorded in Stage 0. If the Dither source/framework gate is still blocked, do not bypass it by importing Solid into Vue, using React, or installing another UI kit.

Continue implementing, verifying, repairing and checkpointing. Update `PROGRESS.json` after each batch. Do not stop after writing a status report.
