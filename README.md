# Julia background lab

A standalone, editable WebGL background prototype. All HTML, CSS, JavaScript,
and shaders are in `index.html`. No dependencies, build step, or external assets.


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.


## Explore

- Fractal: Julia, Cubic Julia, Burning Ship Julia, or Tricorn Julia.
- Movement: drifting field or a centered shape.
- Drift speed, morph speed, and morph amount are independent.
- Longest edge and update rate change rendering immediately.
- Advanced controls expose the real and imaginary components of `c`.
- Remove glass to inspect the unblurred render; Background only hides the UI.
- Download standalone HTML saves a copy with your current control settings as defaults.

Reduced-motion preferences start the animation paused. Hidden tabs pause rendering.

## Where to edit

Search for these names inside `index.html`:

- `DEFAULTS`: initial control settings.
- `palettes`: the three color palettes.
- `models`: fractal presets, parameter centers, and morph radii.
- `fragmentSource`: the four recurrence formulas and smooth two-color shading.
- `driftView` / `driftWaypoint`: the wandering camera path and changing scale.
- `animatedParameter`: the path of the evolving shape parameter `c`.
- `frame`: independent animation clocks and update scheduling.
- The `<style>` block: the layout, controls, and frosted glass panel.

The two-color palette stays fixed during animation; parameter changes reshape
what the shader draws. The iteration ceiling is a work estimate, not GPU timing.

## Source snapshot

Published prototype version 3. Source commit: 9ce1f53704878807806cdcef03085070c540a6cf.

This export contains the complete app and this README.
