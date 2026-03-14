# TODO 05: Orange Atmosphere Narrative Integration

**Context:**
The game world features an "orange-world" scenario with 2400K orange aesthetics and LIDAR-only visibility. This needs to be grounded in the game's narrative and implemented in the game's rendering and gameplay mechanics.

## Narrative Background

In the world of Mutonex, the "orange-world" scenario is grounded in scientifically plausible phenomena following a high-energy "nuclear counter-strike":

### 1. The "Nitrogen Dioxide" Effect (Gaseous Orange)
The most scientifically accurate "real-world gas" that colors the air orange is Nitrogen Dioxide (NO₂).
*   **The Mechanism:** Extreme heat (like nuclear explosions or hypersonic satellite re-entry) forces atmospheric nitrogen and oxygen to combine into NOx.
*   **The Look:** NO₂ is a deep reddish-brown/orange gas that specifically absorbs blue light, leaving only the orange-red spectrum to reach the surface.
*   **Story Integration:** The "automated surface defense" used high-yield thermal warheads that "burnt the sky," converting the atmosphere into a permanent, thick soup of NO₂.

### 2. Radioactive "Yellowcake" Fallout (Particulate Haze)
While pure plutonium isn't orange, the refining and oxidation process of nuclear fuels creates intermediate compounds.
*   **Yellowcake Dust:** Finely powdered uranium/plutonium oxides can range from bright yellow to deep orange depending on hydration and temperature.
*   **Thorium Micro-particles:** High-altitude destruction of thorium reactors released thorium dioxide (ThO₂). In a high-energy cataclysm, it forms yellowish or brownish aerosols suspended for years.
*   **Reduced Visibility:** These sub-micron particles are perfect for scattering and absorbing light, creating the "dimming" effect that necessitates LIDAR.

### 3. The "Orbital Rain" and Scattering
Reduced visibility is explained through:
*   **Aerosol Loading:** Ongoing "orbital fallout" from destroyed defense systems replenishes a layer of stratospheric aerosols.
*   **Rayleigh and Mie Scattering:** Fallout particles (aluminum/titanium satellite hulls) create intense Mie scattering, turning the sun into a diffused "bright patch" rather than a visible star, making optical navigation impossible.

## Proposed Story Hook

"The Counter-Strike didn't just break the satellites; it vaporized the Thorium-Plutonium cores of the orbital grid, seeding the upper atmosphere with Yellowcake-phase oxides. The resulting heat-flash triggered a global Nitrogen-Fixation Event, turning the air into a dense, red-orange NO₂ smog. Now, the 'Orbital Rain' of micro-particulates ensures that photons can't travel more than a few meters without scattering—leaving us blind to everything but the pulse of a LIDAR beam."

## The Narrative Hook
"The Chief tells us he can protect us from the Orange Fallout. He’s wrong. The old logs at the Depot confirmed the Orbital Counterstrikes didn't just smash the satellite constellations into million pieces:; it created a specific particulate frequency. Standard cameras see the orange soup, but if you pulse a laser at exactly 905nm, the ThO₂ crystals don't scatter the light—they fluoresce."

## Implementation Requirements

- **Visuals (Webclient):**
  - Implement 2400K orange ambient lighting and fog in the Three.js scene.
  - Diffuse the sun/light sources to represent Mie scattering from micro-particulates.
  - Implement or refine the LIDAR rendering to visually represent the 905nm fluorescence effect on ThO₂ crystals.
- **Narrative Integration:**
  - Introduce the narrative hook into the game's intro sequence or "logs" found in-game (e.g., at the Depot).
  - Clarify the Chief's role and his false promises regarding the Orange Fallout.
- **Gameplay Mechanics:**
  - Emphasize LIDAR as the *only* viable navigation tool due to the NO₂ smog and particulate scattering. Optical visibility should be zero beyond a few meters.
