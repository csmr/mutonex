# TODO: Webclient Keyboard Shortcut Refactor

## Objective
Refactor the keyboard shortcut handling in the Webclient to use a
centralized, data-driven configuration. This config will be used to
automatically bind event listeners and generate the
on-screen/console help guides.

## Requirements

### 1. Data-Driven Configuration
Create a new file (e.g., `webclient/input/ShortcutConfig.ts`) that
defines all project shortcuts.
- **Entry Structure**: Each entry follows a logical schema:
  `[keyshortStr, targetActionKey, humanReadableDescriptionStr]`
- **Action Mapping**: Map `targetActionKey` to specific behaviors
  (e.g., view switching, avatar movement, diagnostic toggles).

### 2. Automated Binding
Update `main.ts` and relevant View classes to:
- Iterate over the configuration.
- Automatically register `keydown` listeners based on the config.
- Centralize the logic for dispatching actions to handlers.

### 3. Generated Shortcut Guide
- **Console Output**: Replace hardcoded `console.log` statements
  with a loop formatting config into a styled console list.
- **On-Screen Guide (Phase III)**: Preparation for a dynamic UI
  help menu that reflects current configuration.

### 4. Implementation Challenges
- **Context Awareness**: Support `scope` or `context` attributes
  for global versus view-specific shortcuts.
- **Logic Binding**: Functional input processing via pure config
  structures and stateful engine dispatching.

## Itinerary
- [x] Design the `ShortcutConfig` schema and action mapping.
- [x] Implement `ShortcutEngine.ts` to handle binding and
  dispatching.
- [x] Refactor `main.ts` to use the new engine.
- [x] Refactor `GlobeView.ts` and `LidarView.ts` to register local
  shortcuts via the engine.
- [x] Update debug console output to be generated from config.
- [x] Verify accessibility compliance (AGENTS.md) for text.
