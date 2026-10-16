(() => {
  'use strict';
  const root = document.querySelector('[data-alchemical-explorer]');
  if (!root) return;
  const svg = root.querySelector('svg');
  const axes = root.querySelector('[data-alchemical-axes]');
  const slider = root.querySelector('#studio-lambda');
  const buttons = [...root.querySelectorAll('[data-alchemical-mode]')];
  let mode = 'charge';
  const ns = 'http://www.w3.org/2000/svg';
  const xMax = 2.4;
  const alpha = 18.17, beta = 3.65;
  const erf = x => {
    if (x === 0) return 0;
    const t = 1 / (1 + .3275911 * x);
    return 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - .284496736) * t + .254829592) * t) * Math.exp(-x * x);
  };
  // DEGAUSS eqs. (5) and (7). λ scales one solute charge in the
  // electrostatic stage, or the solute–environment ε₀ in the vdW stage.
  // No MD sampling or ΔG estimate is performed by this pair-potential explorer.
  const potential = (r, lambda, type) => {
    if (lambda === 0) return 0;
    if (type === 'charge') return -lambda * (r === 0 ? 2 / Math.sqrt(Math.PI) : erf(r) / r);
    return lambda * (beta * Math.exp(alpha * (1 - r)) - alpha * Math.exp(beta * (1 - r))) / (alpha - beta);
  };
  const symlog = value => Math.sign(value) * Math.log1p(Math.abs(value) / .01);
  const px = x => 70 + x / xMax * 450;
  const py = value => {
    if (mode === 'charge') return 250 - (value + 1.25) / 1.4 * 210;
    const low = symlog(-1.5), high = symlog(1e8);
    return 250 - (symlog(value) - low) / (high - low) * 210;
  };
  const add = (tag, attrs, text) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    if (text) el.textContent = text;
    axes.appendChild(el);
  };
  const drawAxes = () => {
    axes.replaceChildren();
    const ticks = mode === 'charge' ? [[-1.2,'−1.2'],[-.8,'−0.8'],[-.4,'−0.4'],[0,'0']] : [[-1,'−1'],[0,'0'],[1,'1'],[1e3,'10³'],[1e6,'10⁶'],[1e8,'10⁸']];
    ticks.forEach(([value, label]) => {
      const y = py(value);
      add('path',{d:`M70 ${y}H520`,class: value === 0 ? 'studio-alchemical-zero' : 'studio-alchemical-grid'});
      add('text',{x:57,y:y+3,'text-anchor':'end',class:'studio-alchemical-tick'},label);
    });
    [0,.5,1,1.5,2].forEach(x => {
      add('path',{d:`M${px(x)} 250v5`,class:'studio-alchemical-zero'});
      add('text',{x:px(x),y:269,'text-anchor':'middle',class:'studio-alchemical-tick'},String(x));
    });
    add('path',{d:'M70 40V250H520',class:'studio-alchemical-zero'});
    root.querySelector('[data-alchemical-y-label]').textContent = mode === 'charge' ? 'U / (|qᵢqⱼ| γᵢⱼ)' : 'U / ε₀ · symmetric log scale';
    root.querySelector('[data-alchemical-x-label]').textContent = mode === 'charge' ? 'Separation · γᵢⱼ r' : 'Separation · r / rₘ';
    root.querySelector('[data-alchemical-stage]').textContent = mode === 'charge' ? 'Stage 1 · scale solute charges; retain van der Waals interactions.' : 'Stage 2 · charges off; scale solute–environment van der Waals interactions.';
    root.querySelector('[data-alchemical-parameters]').textContent = mode === 'charge' ? 'Opposite-charge pair · reduced units · linear charge scaling' : 'α = 18.17 · β = 3.65 · linear ε₀ scaling · symmetric-log threshold 0.01';
    const ticksRoot = root.querySelector('[data-lambda-ticks]');
    ticksRoot.replaceChildren();
    for (let i = 0; i <= 10; i++) {
      // Published reference windows, eq. (18), a=3, n=10. These markers
      // indicate λ placement only; they do not represent sampled results.
      const lambda = mode === 'charge' ? i / 10 : (Math.exp(-(((1-i/10)*3)**2))-Math.exp(-9))/(1-Math.exp(-9));
      const tick = document.createElement('span');
      tick.style.left = `${lambda * 100}%`;
      ticksRoot.appendChild(tick);
    }
  };
  const path = lambda => Array.from({length:481},(_,i) => {
    const r = i * xMax / 480;
    return `${i ? 'L' : 'M'}${px(r).toFixed(2)},${py(potential(r, lambda, mode)).toFixed(2)}`;
  }).join(' ');
  const draw = () => {
    const lambda = Number(slider.value);
    root.querySelector('[data-alchemical-curve]').setAttribute('d',path(lambda));
    root.querySelector('[data-alchemical-reference]').setAttribute('d',path(1));
    root.querySelector('[data-alchemical-overlap]').setAttribute('cx',px(0));
    root.querySelector('[data-alchemical-overlap]').setAttribute('cy',py(potential(0,lambda,mode)));
    root.querySelectorAll('[data-lambda-output], [data-lambda-legend]').forEach(output=> {output.value=lambda.toFixed(2);});
    svg.setAttribute('aria-label',`${mode === 'charge' ? 'Gaussian electrostatic' : 'Double-exponential van der Waals'} pair potential at lambda ${lambda.toFixed(2)}. Zero is decoupled; one is coupled. Finite overlap energy.`);
    root.dataset.alchemicalMode = mode;
  };
  buttons.forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.alchemicalMode;
    buttons.forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
    drawAxes();draw();
  }));
  slider.addEventListener('input',draw);
  drawAxes();draw();
})();
