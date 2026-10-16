(() => {
  'use strict';
  const svg = document.querySelector('[data-molecular-scene]');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const scene = svg.querySelector('[data-molecule-layer]');
  const contours = svg.querySelector('[data-density-contours]');
  const orientation = document.querySelector('#studio-orientation');
  const distance = document.querySelector('#studio-distance');
  const modes = [...document.querySelectorAll('[data-polarization-mode]')];
  let polarized = true;
  const project = ([x, y]) => [220 + x * 47, 152 + y * 47];
  const element = (tag, attrs, parent, text) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text) el.textContent = text;
    parent.appendChild(el);
    return el;
  };
  const atomsFor = (angle, separation) => {
    const atoms = [];
    for (let m = 0; m < 2; m++) {
      const theta = m ? angle * Math.PI / 180 : 0;
      const origin = m ? [separation / 2, .1] : [-separation / 2, .1];
      const local = [[0, 0], [.8 * Math.cos(52.25 * Math.PI / 180), -.8 * Math.sin(52.25 * Math.PI / 180)], [.8 * Math.cos(52.25 * Math.PI / 180), .8 * Math.sin(52.25 * Math.PI / 180)]];
      local.forEach(([x, y], a) => atoms.push({
        r: [origin[0] + x * Math.cos(theta) - y * Math.sin(theta), origin[1] + x * Math.sin(theta) + y * Math.cos(theta)],
        q: a ? .4 : -.8, alpha: a ? .12 : .35, symbol: a ? 'H' : 'O', molecule: m
      }));
    }
    return atoms;
  };
  // Shared Gaussian SCF solver; this original water-dimer illustration uses
  // monopoles and induced dipoles, with permanent atomic μ set to zero.
  const solve = atoms => window.StudioGaussian.solve(atoms).dipoles;
  // Marching squares on a 2-D slice of the 3-D Gaussian charge density.
  // Segment endpoints interpolate scalar values; the fixed saddle convention is
  // sufficient for this illustration and avoids a raster/canvas dependency.
  const densityPaths = (atoms, p) => {
    const nx = 144, ny = 92, x0 = -4.5, y0 = -2.8, dx = 9 / nx, dy = 5.6 / ny;
    const grid = Array.from({length: ny + 1}, (_, j) => Array.from({length: nx + 1}, (_, i) => {
      const x = x0 + i * dx, y = y0 + j * dy;
      return atoms.reduce((sum, a, k) => {
        const rx = x - a.r[0], ry = y - a.r[1];
        return sum + (a.q + 2 * (p[k][0] * rx + p[k][1] * ry)) * Math.exp(-rx * rx - ry * ry);
      }, 0);
    }));
    contours.replaceChildren();
    for (const level of [-.3, -.18, -.09, -.035, .035, .08, .15, .24]) {
      const segments = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const corners = [[i,j],[i+1,j],[i+1,j+1],[i,j+1]];
        const crossings = [];
        for (let edge = 0; edge < 4; edge++) {
          const [ax, ay] = corners[edge], [bx, by] = corners[(edge+1)%4];
          const va = grid[ay][ax], vb = grid[by][bx];
          if ((va >= level) === (vb >= level)) continue;
          const t = (level - va) / (vb - va);
          crossings.push(project([x0 + (ax + t * (bx-ax)) * dx, y0 + (ay + t * (by-ay)) * dy]));
        }
        for (let c = 0; c + 1 < crossings.length; c += 2) {
          const [a,b] = [crossings[c], crossings[c+1]];
          segments.push(`M${a[0].toFixed(2)},${a[1].toFixed(2)}L${b[0].toFixed(2)},${b[1].toFixed(2)}`);
        }
      }
      element('path', {d: segments.join(''), fill:'none', stroke: level < 0 ? '#28639c' : '#b18c72', 'stroke-width': .9, opacity: .54}, contours);
    }
  };
  const draw = () => {
    const angle = Number(orientation.value), separation = Number(distance.value);
    const atoms = atomsFor(angle, separation);
    const p = polarized ? solve(atoms) : atoms.map(() => [0,0]);
    densityPaths(atoms, p);
    scene.replaceChildren();
    for (let m = 0; m < 2; m++) {
      const oxygen = project(atoms[m*3].r);
      for (const offset of [1,2]) {
        const h = project(atoms[m*3+offset].r);
        element('path', {d:`M${oxygen}L${h}`, class:'studio-molecular-bond'}, scene);
      }
    }
    // The faint connector denotes the intermolecular environment, not a covalent bond.
    const a = project(atoms[1].r), b = project(atoms[3].r);
    element('path', {d:`M${a}L${b}`, class:'studio-molecular-contact'}, scene);
    atoms.forEach((atom, i) => {
      const [x,y] = project(atom.r);
      const g = element('g', {class:'studio-atom'}, scene);
      element('circle', {cx:x, cy:y, r:atom.symbol === 'O' ? 10 : 7, class:atom.symbol === 'O' ? 'studio-oxygen' : 'studio-hydrogen'}, g);
      element('text', {x, y:y+.5, 'text-anchor':'middle', 'dominant-baseline':'middle'}, g, atom.symbol);
      if (polarized) {
        // Arrow lengths are enlarged for legibility and carry no quantitative scale.
        const length = Math.hypot(...p[i]);
        if (length > .001) {
          const scale = 440;
          const start = [x + p[i][0]/length*13, y + p[i][1]/length*13];
          const end = [start[0] + p[i][0]*scale, start[1] + p[i][1]*scale];
          element('path', {d:`M${start}L${end}`, class:'studio-atomic-dipole', 'marker-end':'url(#studio-dipole-tip)'}, scene);
        }
      }
    });
    document.querySelector('[data-orientation-output]').value = `${angle}°`;
    document.querySelector('[data-distance-output]').value = separation <= 2.6 ? 'Near' : separation >= 3.1 ? 'Far' : 'Middle';
    document.querySelector('[data-molecular-state]').textContent = polarized ? 'Mutual induction · on' : 'Permanent charges · only';
    svg.dataset.polarized = String(polarized);
    svg.setAttribute('aria-label', `Two water molecules, ${polarized ? 'with mutually induced atomic dipoles' : 'permanent charges only'}. Neighbor orientation ${angle} degrees. Conceptual parameters.`);
  };
  orientation.addEventListener('input', draw);
  distance.addEventListener('input', draw);
  modes.forEach(button => button.addEventListener('click', () => {
    polarized = button.dataset.polarizationMode === 'polarized';
    modes.forEach(peer => peer.setAttribute('aria-pressed', String(peer === button)));
    draw();
  }));
  document.querySelector('[data-molecule-reset]').addEventListener('click', () => {
    orientation.value = '30'; distance.value = '2.7'; polarized = true;
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.polarizationMode === 'polarized')));
    draw();
  });
  draw();
})();
