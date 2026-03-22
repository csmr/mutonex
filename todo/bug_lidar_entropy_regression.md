# BUG: LIDAR Rendering Entropy Regression / Missing Feature

## Description
During the transition to isolated cherry-picks in `develop-2` and resolving the massive breaking collisions in previous fusion rebases (`feat-charm-terrain-tokens-docs-scripts-fusion-202603182032`), it was noted that the LIDAR rendering entropy implementation is either broken or completely failed to merge. 

## Action Items
- Identify which branch or original commit contained the correct "desirable" LIDAR entropy rendering updates.
- Check if that specific commit was swallowed during the previous botched fusions or if it just hasn't been merged into `develop-2` yet.
- Restore the clean LIDAR entropy rendering logic to the webclient without dragging in regressions.
