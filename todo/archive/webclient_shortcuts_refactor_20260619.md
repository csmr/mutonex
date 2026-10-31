# TODO: Webclient Keyboard Shortcut Refactor

## Objective
Refactor the keyboard shortcut handling in the Webclient to use a centralized, data-driven configuration. This config will be used to automatically bind event listeners and generate the on-screen/console help guides.

## Requirements

### 1. Data-Driven Configuration
Create a new file (e.g., `webclient/ShortcutConfig.ts`) that defines all project shortcuts.
- **Entry Structure**: Each entry should follow a logical schema:
  `[keyshortStr, targetActionKey, humanReadableDescriptionStr]`
- **Action Mapping**: Map `targetActionKey` to specific behaviors (e.g., view switching, avatar movement, diagnostic toggles).

### 2. Automated Binding
Update `main.ts` and relevant View classes to:
- Iterate over the configuration.
- Automatically register `keydown` listeners based on the config.
- Centralize the logic for dispatching actions to the appropriate handlers.

### 3. Generated Shortcut Guide
- **Console Output**: Replace hardcoded `console.log` statements in `bindDebugConsole` with a loop that formats the configuration into a clean table or list.
- **On-Screen Guide (Phase III)**: Preparation for a dynamic UI help menu that reflects the current configuration.

### 4. Implementation Challenges
- **Context Awareness**: Some shortcuts (like 'Tab' or 'G') should be globally available, while others might be view-specific. The config should support a `scope` or `context` attribute.
- **Logic Binding**: Decide whether the handler is a callback function, a string-based event name, or a method call on a central "InputManager".

## Itinerary
- [ ] Design the `ShortcutConfig` schema and action mapping strategy.
- [ ] Implement `ShortcutManager.ts` to handle binding and dispatching.
- [ ] Refactor `main.ts` to use the new manager.
- [ ] Refactor `GlobeView.ts` and `LidarView.ts` to register their local shortcuts via the manager.
- [ ] Update debug console output to be generated from the config.
- [ ] Verify accessibility compliance (AGENTS.md) for generated text.
