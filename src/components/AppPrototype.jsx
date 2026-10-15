import { useEffect, useRef } from 'react'
import colorPalettes from '@models/colors'
import fractalModels from '@models/fractals'
import '/src/App.css'

function AppPrototype() {
  const canvasRef = useRef(null)

  function setup(canvas, signal) {
  // This config is replaced with your current settings when you download the demo.
  const DEFAULTS = {
    fractal: 'julia',
    movement: 'drift',
    family: 'lace',
    speed: 0.4,
    morphSpeed: 0.6,
    morphAmount: 1,
    cReal: -0.7,
    cImag: 0.27015,
    blur: 24,
    strength: 0.45,
    palette: 'sage',
    resolution: 320,
    fps: 10,
    iterations: 64,
    zoom: 1.1,
    tint: 0.35
  }
  const standaloneSource = '<!doctype html>\n' + document.documentElement.outerHTML;
  const state = { ...DEFAULTS };
  const $ = (id) => document.getElementById(id);
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionPreference.matches;
  let contextLost = false;
  let seconds = 0, morphSeconds = 0, lastFrame = 0, timer = 0, raf = 0;
  let reportAt = performance.now(), frames = 0;
  let parameterReportAt = -Infinity;

  const vertexSource = `
        attribute vec2 position;
        void main() {gl_Position = vec4(position, 0.0, 1.0); }
        `;
  const fragmentSource = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        uniform vec2 resolution;
        uniform vec2 parameter;
        uniform vec2 camera;
        uniform float zoom;
        uniform int limit;
        uniform int model;
        uniform float escapeScale;
        uniform vec3 colorA;
        uniform vec3 colorB;
        void main() {
          vec2 z = (gl_FragCoord.xy - resolution * 0.5) / resolution.y;
        z = z * (2.6 / zoom) + camera;
        float count = 0.0;
        float magnitude = 0.0;
        bool escaped = false;
        for (int i = 0; i < 128; i++) {
          if (i >= limit) break;
        if (model == 1) {
          z = vec2(z.x * (z.x * z.x - 3.0 * z.y * z.y), z.y * (3.0 * z.x * z.x - z.y * z.y)) + parameter;
          } else {
            if (model == 2) z = abs(z);
        if (model == 3) z.y = -z.y;
        z = vec2(z.x*z.x-z.y*z.y, 2.0*z.x*z.y) + parameter;
          }
        magnitude = dot(z, z);
        count += 1.0;
          if (magnitude > 256.0) {escaped = true; break; }
        }
        // Continuous escape time avoids hard color bands. A monotonic ramp
        // also makes the capped-iteration boundary much less conspicuous.
        float tone = 1.0;
        if (escaped) {
          float smoothCount = max(0.0, count + 1.0 - log2(0.5 * log2(magnitude)) * escapeScale);
        tone = 1.0 - exp(-0.08 * smoothCount);
        }
        gl_FragColor = vec4(mix(colorA, colorB, tone), 1.0);
      }
        `;
  const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  let program, vertices, uniforms;
  function notice(message) { $('notice').textContent = message; $('notice').style.display = 'block'; }
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(result);
      gl.deleteShader(result);
      throw new Error(error || 'Shader compilation failed');
    }
    return result;
  }
  function initialize() {
    const vert = shader(gl.VERTEX_SHADER, vertexSource), frag = shader(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vert); gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, 'position');
    gl.linkProgram(program);
    gl.deleteShader(vert); gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(['resolution', 'parameter', 'camera', 'zoom', 'limit', 'model', 'escapeScale', 'colorA', 'colorB'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    resize();
  }
  function updateBudget() {
    const width = canvas.width, height = canvas.height;
    const ceiling = width * height * state.iterations * state.fps;
    $('buffer').textContent = `${width} × ${height} buffer`;
    $('budget').textContent = `${(ceiling / 1e6).toFixed(1)}m / sec`;
  }
  function resize() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const width = aspect >= 1 ? state.resolution : Math.round(state.resolution * aspect);
    const height = aspect >= 1 ? Math.round(state.resolution / aspect) : state.resolution;
    // Deliberately ignore devicePixelRatio: this is an ambient low-res render.
    if (canvas.width !== width || canvas.height !== height) { canvas.width = Math.max(1, width); canvas.height = Math.max(1, height); }
    if (gl && !contextLost && program) { gl.viewport(0, 0, canvas.width, canvas.height); draw(); }
    updateBudget();
  }
  function blend(a, b, strength) { return a.map((v, i) => v + (b[i] - v) * strength); }
  // MOTION_START: A reproducible, non-looping sequence of smooth camera targets.
  // Travel through broad shapes as well as empty space; log zoom keeps scale positive.
  function driftRandom(index, salt) {
    const value = Math.sin((index + 20) * 127.1 + salt * 311.7) * 43758.5453123;
    return value - Math.floor(value);
  }
  function driftWaypoint(index) {
    const random = salt => driftRandom(index, salt);
    const coverage = random(1);
    let x, y, zoom;
    if (coverage < 0.2) {
      // Clear sky: place the finite Julia shape entirely outside the view.
      x = (random(2) < 0.5 ? -1 : 1) * (2.2 + random(3) * 0.5);
      y = (random(4) - 0.5) * 1.1;
      zoom = 6 + random(5) * 4;
    } else if (coverage < 0.4) {
      // Overcast: a close view of the broad center can fill the whole frame.
      x = (random(2) - 0.5) * 0.14;
      y = (random(3) - 0.5) * 0.12;
      zoom = 15 + random(4) * 6;
    } else {
      // Partial coverage: move across the larger branches and their edges.
      x = (random(2) - 0.5) * 2.2;
      y = (random(3) - 0.5) * 0.8;
      zoom = 5 + random(4) * 4;
    }
    return { x, y, logZoom: Math.log(zoom) };
  }
  function catmullRom(a, b, c, d, t) {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * b) + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  }
  function driftView(time) {
    const position = time / 18;
    const index = Math.floor(position), t = position - index;
    const points = [index - 1, index, index + 1, index + 2].map(driftWaypoint);
    const interpolate = key => catmullRom(...points.map(point => point[key]), t);
    return { x: interpolate('x'), y: interpolate('y'), zoom: Math.exp(interpolate('logZoom')) };
  }
  // MOTION_END
  // PARAMETER_START
  function animatedParameter(time, center, radius, amount) {
    const phase = time * (Math.PI * 2 / 120) + 0.9;
    return [center[0] + radius[0] * amount * Math.cos(phase), center[1] + radius[1] * amount * Math.sin(phase)];
  }
  // PARAMETER_END
  function draw() {
    if (!gl || contextLost || !program) return;
    const model = fractalModels[state.fractal], preset = model.presets[state.family], palette = colorPalettes[state.palette];
    const [real, imaginary] = animatedParameter(morphSeconds, [state.cReal, state.cImag], preset.radius, state.morphAmount);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.parameter, real, imaginary);
    const view = state.movement === 'drift' ? driftView(seconds) : { x: 0, y: 0, zoom: 1 };
    gl.uniform2f(uniforms.camera, view.x, view.y);
    gl.uniform1f(uniforms.zoom, state.zoom * view.zoom);
    gl.uniform1i(uniforms.limit, state.iterations);
    gl.uniform1i(uniforms.model, model.index);
    gl.uniform1f(uniforms.escapeScale, model.index === 1 ? 1 / Math.log2(3) : 1);
    gl.uniform3fv(uniforms.colorA, blend(palette.base, palette.light, state.strength));
    gl.uniform3fv(uniforms.colorB, blend(palette.base, palette.dark, state.strength));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const now = performance.now();
    if (now - parameterReportAt >= 250) {
      $('parameter-readout').textContent = `Animated c: ${real.toFixed(4)} ${imaginary < 0 ? '−' : '+'} ${Math.abs(imaginary).toFixed(4)}i`;
      parameterReportAt = now;
    }
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(raf); timer = 0; raf = 0; lastFrame = 0; }
  function hasDrift() { return state.movement === 'drift' && state.speed > 0; }
  function hasMorph() { return state.morphSpeed > 0 && state.morphAmount > 0; }
  function running() { return gl && program && !paused && !document.hidden && !contextLost && (hasDrift() || hasMorph()); }
  function updateMotionUI() {
    $('pause').setAttribute('aria-pressed', String(paused));
    $('pause').setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
    $('pause').querySelector('span').textContent = paused ? 'Resume' : 'Pause';
    $('pause').querySelector('path').setAttribute('d', paused ? 'M5 3l8 5-8 5z' : 'M4 3h3v10H4zM9 3h3v10H9z');
    $('status').textContent = !gl || !program ? 'Static fallback' : contextLost ? 'Restoring' : paused || (!hasDrift() && !hasMorph()) ? 'Still frame' : hasDrift() && hasMorph() ? 'Drift + morph' : hasDrift() ? 'Drifting slowly' : 'Morphing slowly';
    $('status').classList.toggle('paused', !running());
    $('actual-fps').textContent = running() ? `${state.fps} fps target` : 'Still frame';
  }
  function frame(now) {
    raf = 0;
    if (!running()) return;
    if (lastFrame) {
      const elapsed = Math.min((now - lastFrame) / 1000, 2);
      if (hasDrift()) seconds += elapsed * state.speed;
      if (hasMorph()) morphSeconds += elapsed * state.morphSpeed;
    }
    lastFrame = now;
    draw(); frames += 1;
    if (now - reportAt >= 2000) {
      $('actual-fps').textContent = `${(frames * 1000 / (now - reportAt)).toFixed(1)} fps observed`;
      frames = 0; reportAt = now;
    }
    const elapsed = performance.now() - now;
    timer = setTimeout(() => { timer = 0; if (running()) raf = requestAnimationFrame(frame); }, Math.max(0, 1000 / state.fps - elapsed - 5));
  }
  function restart() {
    stop(); updateMotionUI();
    frames = 0; reportAt = performance.now();
    if (running()) raf = requestAnimationFrame(frame);
  }
  function updateAppearance() {
    document.documentElement.style.setProperty('--blur', `${state.blur}px`);
    document.documentElement.style.setProperty('--glass', state.tint);
    document.documentElement.style.setProperty('--ink', colorPalettes[state.palette].ink);
    document.documentElement.style.setProperty('--accent', colorPalettes[state.palette].accent);
    document.body.style.backgroundColor = `rgb(${colorPalettes[state.palette].base.map(v => Math.round(v * 255)).join(',')})`;
    for (const name of ['speed', 'morphSpeed', 'morphAmount', 'blur', 'strength', 'zoom', 'tint', 'resolution', 'fps', 'cReal', 'cImag']) {
      $(name).value = state[name];
      $(`${name}-value`).textContent = ['blur', 'resolution'].includes(name) ? `${state[name]} px` : name === 'fps' ? `${state[name]} fps` : ['cReal', 'cImag'].includes(name) ? Number(state[name]).toFixed(3) : ['strength', 'tint'].includes(name) ? `${Math.round(state[name] * 100)}%` : `${Number(state[name]).toFixed(2).replace(/0$/, '')}×`;
    }
    for (const name of ['iterations', 'family', 'movement', 'fractal']) $(name).value = state[name];
    $('speed').disabled = state.movement !== 'drift';
    document.querySelectorAll('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === state.palette)));
  }
  function updatePresets() {
    const presets = fractalModels[state.fractal].presets;
    $('family').replaceChildren(...Object.entries(presets).map(([value, preset]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = preset.label; return option;
    }));
    $('family').value = state.family;
  }
  for (const name of ['speed', 'morphSpeed', 'morphAmount', 'blur', 'strength', 'zoom', 'tint', 'resolution', 'fps', 'iterations', 'family', 'movement', 'fractal', 'cReal', 'cImag']) {
    $(name).addEventListener('input', event => {
      state[name] = ['family', 'movement', 'fractal'].includes(name) ? event.target.value : Number(event.target.value);
      if (name === 'fractal' || name === 'family') {
        const preset = fractalModels[state.fractal].presets[state.family];
        [state.cReal, state.cImag] = preset.center;
        if (name === 'fractal') updatePresets();
      }
      parameterReportAt = -Infinity;
      updateAppearance();
      if (name === 'resolution') resize();
      else if (!document.hidden) draw();
      updateBudget();
      if (['speed', 'fps', 'morphSpeed', 'morphAmount', 'movement'].includes(name)) restart();
    }, { signal });
  }
  document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => { state.palette = button.dataset.palette; updateAppearance(); draw(); }, { signal }));

  function focusMode(enabled) {
    document.body.classList.toggle('focus-mode', enabled); (enabled ? $('restore') : $('focus')).focus();
  }
  $('pause').addEventListener('click', () => { paused }, { signal });
  $('toggle-glass').addEventListener('click', () => {
    const removed = $('glass').classList.toggle('no-glass');
    $('toggle-glass').textContent = removed ? 'Add glass' : 'Remove glass';
    $('toggle-glass').setAttribute('aria-pressed', String(!removed));
    $('glass-caption').textContent = removed ? 'The unfiltered canvas' : 'Looking through frosted glass';
  }, { signal });
  $('focus').addEventListener('click', () => focusMode(true), { signal });
  $('restore').addEventListener('click', () => focusMode(false), { signal });

  document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) focusMode(false); }, { signal });
  document.addEventListener('visibilitychange', restart, { signal });

  window.addEventListener('resize', resize, { signal });

  motionPreference.addEventListener('change', event => { if (event.matches) { paused = true; restart(); } }, { signal });

  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; stop(); updateMotionUI(); }, { signal });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    try { initialize(); restart(); } catch (error) { program = null; notice('The renderer could not restart. The static background is still available.'); console.error(error); updateMotionUI(); }
  }, { signal });
  $('download').addEventListener('click', () => {
    try {
      const source = standaloneSource.replace(/\/\* CONFIG_START \*\/[\s\S]*?\/\* CONFIG_END \*\//, `/* CONFIG_START */ ${JSON.stringify(state)} /* CONFIG_END */`);
      const url = URL.createObjectURL(new Blob([source], { type: 'text/html' }));
      const link = document.createElement('a'); link.href = url; link.download = 'julia-background.html'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { notice('The download could not be prepared. Please try again.'); console.error(error); }
  }, { signal });
  updatePresets();
  updateAppearance();
  if (gl) {
    try { initialize(); restart(); }
    catch (error) { program = null; notice('WebGL could not initialize. This device will show a static background.'); console.error(error); updateMotionUI(); }
  } else { notice('WebGL is unavailable here. This device will show a static background.'); updateMotionUI(); resize(); }
  if (motionPreference.matches) $('footnote').textContent = 'Reduced motion: starts paused · resume to preview';

  return () => {
    stop()
    document.body.classList.remove('focus-mode')
  }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('The canvas element is unavailable.')
    const controller = new AbortController()
    const cleanup = setup(canvas, controller.signal)
    return () => {
      controller.abort()
      cleanup()
    }
  }, [])

  return (
    <>
      <canvas id="field" ref={canvasRef} aria-hidden="true"></canvas>
      <div className="shell">
        <header>
          <div className="brand">
            <svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.2" /><ellipse cx="14" cy="14" rx="5" ry="12" transform="rotate(42 14 14)" stroke="currentColor" stroke-width="1.2" /><circle cx="22" cy="7" r="2.4" fill="currentColor" /></svg>
            <div><strong>JULIA</strong><span>Ambient background lab</span></div>
          </div>
          <div className="top-actions">
            <button className="button" id="pause" onClick="paused = !paused; restart();" type="button" aria-label="Pause animation" aria-pressed="false"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg><span>Pause</span></button>
            <button className="button" id="focus" type="button"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4" /></svg><span className="desktop-label">Background only</span></button>
          </div>
        </header>
        <main>
          <section className="sample" aria-label="Frosted glass preview">
            <p className="eyebrow">A quieter kind of background</p>
            <div className="glass" id="glass">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3v26M3 16h26M7 7l18 18M7 25L25 7" stroke="currentColor" stroke-width="1.2" /><circle cx="16" cy="16" r="7" fill="#ffffff44" stroke="currentColor" stroke-width="1.2" /></svg>
              <h1>Room for<br />thought.</h1>
              <p>A calm surface, with just enough movement to feel alive.</p>
            </div>
            <div className="sample-caption"><span id="glass-caption">Looking through frosted glass</span><button className="text-button" id="toggle-glass" type="button" aria-pressed="true">Remove glass</button></div>
          </section>
          <aside className="controls" aria-label="Background controls">
            <div id="notice" role="status"></div>
            <div className="controls-title"><h2>Make it subtle.</h2><span className="status" id="status">Moving slowly</span></div>
            <div className="select-group family-select"><label for="fractal">Fractal</label><select id="fractal"><option value="julia">Julia</option><option value="cubic">Cubic Julia</option><option value="ship">Burning Ship Julia</option><option value="tricorn">Tricorn Julia</option></select></div>
            <div className="select-group family-select"><label for="family">Shape preset</label><select id="family"><option value="lace">Soft filigree</option><option value="spiral">Spirals</option><option value="islands">Little islands</option></select></div>
            <div className="select-group family-select"><label for="movement">Movement</label><select id="movement"><option value="drift">Drifting field</option><option value="centered">Centered shape</option></select></div>
            <div className="control"><div className="label-line"><label for="speed">Drift speed</label><output id="speed-value" for="speed">0.4×</output></div><input id="speed" type="range" min="0" max="2" step="0.05" value="0.4" /></div>
            <div className="control"><div className="label-line"><label for="morphSpeed">Morph speed</label><output id="morphSpeed-value" for="morphSpeed">0.6×</output></div><input id="morphSpeed" type="range" min="0" max="2" step="0.05" value="0.6" /></div>
            <div className="control"><div className="label-line"><label for="morphAmount">Morph amount</label><output id="morphAmount-value" for="morphAmount">1.0×</output></div><input id="morphAmount" type="range" min="0" max="4" step="0.05" value="1" /></div>
            <p className="control-hint">Drift moves the view. Morph changes the shape itself.</p>
            <div className="control"><div className="label-line"><label for="blur">Glass blur</label><output id="blur-value" for="blur">24 px</output></div><input id="blur" type="range" min="0" max="64" step="1" value="24" /></div>
            <div className="control"><div className="label-line"><label for="strength">Contrast</label><output id="strength-value" for="strength">45%</output></div><input id="strength" type="range" min="0.08" max="1" step="0.01" value="0.45" /></div>
            <div className="control"><div className="label-line"><span id="palette-label">Palette</span></div><div className="colorPalettes" role="group" aria-labelledby="palette-label"><button className="palette" type="button" data-palette="sage" aria-pressed="true"><span className="swatch" style="background:#a2b7aa"></span>Sage</button><button className="palette" type="button" data-palette="plum" aria-pressed="false"><span className="swatch" style="background:#b4a2b9"></span>Plum</button><button className="palette" type="button" data-palette="sand" aria-pressed="false"><span className="swatch" style="background:#c4b59e"></span>Sand</button></div></div>
            <hr className="divide" />
            <div className="render-title">Rendering budget</div>
            <div className="control"><div className="label-line"><label for="resolution">Longest edge</label><output id="resolution-value" for="resolution">320 px</output></div><input id="resolution" type="range" min="64" max="1024" step="16" value="320" /></div>
            <div className="control"><div className="label-line"><label for="fps">Update rate</label><output id="fps-value" for="fps">10 fps</output></div><input id="fps" type="range" min="1" max="60" step="1" value="10" /></div>
            <p className="control-hint">Applies as you drag. Lower values reduce detail and updates.</p>
            <details><summary>Shape parameters & more</summary>
              <div className="control" style="margin-top:14px"><div className="label-line"><label for="cReal">Base c · real</label><output id="cReal-value" for="cReal">−0.700</output></div><input id="cReal" type="range" min="-1.5" max="1.5" step="0.001" value="-0.7" /></div>
              <div className="control"><div className="label-line"><label for="cImag">Base c · imaginary</label><output id="cImag-value" for="cImag">0.270</output></div><input id="cImag" type="range" min="-1.5" max="1.5" step="0.001" value="0.27" /></div>
              <p className="parameter-readout" id="parameter-readout">Animated c: —</p>
              <div className="control"><div className="label-line"><label for="zoom">Zoom</label><output id="zoom-value" for="zoom">1.1×</output></div><input id="zoom" type="range" min="0.6" max="3" step="0.05" value="1.1" /></div>
              <div className="control"><div className="label-line"><label for="tint">Glass tint</label><output id="tint-value" for="tint">35%</output></div><input id="tint" type="range" min="0" max="0.85" step="0.01" value="0.35" /></div>
              <div className="select-group"><label for="iterations">Maximum iterations per pixel</label><select id="iterations"><option value="32">32</option><option value="64" selected>64</option><option value="96">96</option><option value="128">128</option></select></div>
            </details>
            <div className="budget" title="Pixels × iteration limit × target FPS. An upper bound on fractal iterations, not a GPU timing measurement."><span>Iteration ceiling</span><strong id="budget">—</strong></div>
            <button className="text-button" id="download" type="button" style="margin-top:16px">Download standalone HTML ↗</button>
          </aside>
        </main>
        <footer><div className="metrics"><span id="buffer">320 × 180 buffer</span><span id="actual-fps">10 fps target</span><span>One draw per update</span></div><span id="footnote">Pauses in hidden tabs · no dependencies</span></footer>
      </div>
      <button className="button restore" id="restore" type="button">Show controls <span style="opacity:.5">Esc</span></button>

    </>
  )
}

export default AppPrototype