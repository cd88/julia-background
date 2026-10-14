# Julia background lab

A standalone, editable WebGL background prototype. All HTML, CSS, JavaScript,
and shaders are in `index.html`. No dependencies, build step, or external assets.

## Run locally

Open `index.html` directly in a browser with WebGL enabled.

If you prefer a local server, run this from the extracted directory:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080. Reload after saving edits.

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
