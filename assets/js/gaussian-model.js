/* Gaussian multipoles in reduced units. Shared by the two interactive figures. */
(() => {
  'use strict';
  const erf = x => {
    const t = 1 / (1 + .3275911 * Math.abs(x));
    const value = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - .284496736) * t + .254829592) * t) * Math.exp(-x*x);
    return x === 0 ? 0 : Math.sign(x) * value;
  };
  const pair = (a, b) => {
    const r = a.r.map((x,k) => x - b.r[k]);
    const d = Math.hypot(...r);
    if (d < 1e-6) throw new Error('Distinct Gaussian sites must not coincide in this explorer.');
    const ba = a.beta ?? 1, bb = b.beta ?? 1;
    const beta = ba*bb / Math.hypot(ba,bb);
    const e = Math.exp(-beta*beta*d*d), A = 2*beta/Math.sqrt(Math.PI), f = erf(beta*d);
    return {r, B:f/d**3-A*e/d**2, C:3*f/d**5-3*A*e/d**4-2*A*beta*beta*e/d**2};
  };
  // Wei Eq. (9): u⃗ = Σ_i u_i R⃗_i / |R⃗_i|. Directions point
  // from this atomic center to the named covalent/virtual neighbor.
  // CBVs are not orthogonalized; coefficients stay fixed with geometry.
  const covalentDipoles = atoms => atoms.map((a,i) => {
    if(!a.cbv)return [...(a.mu??a.r.map(()=>0))];
    return a.cbv.reduce((mu,term)=>{
      if(!atoms[term.to]||term.to===i||!Number.isFinite(term.u))throw new Error('Invalid CBV definition.');
      const r=a.r.map((x,k)=>atoms[term.to].r[k]-x),length=Math.hypot(...r);
      if(length<1e-6)throw new Error('CBV neighbors must be distinct.');
      return mu.map((x,k)=>x+term.u*r[k]/length);
    },a.r.map(()=>0));
  });
  const solve = (atoms, external = atoms[0].r.map(() => 0)) => {
    const n = atoms.length, dims = atoms[0].r.length;
    const covalent=covalentDipoles(atoms);
    const pairs = atoms.map((a,i) => atoms.map((b,j) => i===j ? null : pair(a,b)));
    const fields = p => atoms.map((a,i) => {
      const field = [...external];
      atoms.forEach((b,j) => {
        if (i===j) return;
        const {r,B,C} = pairs[i][j];
        const moment = p[j].map((x,k) => x + covalent[j][k]);
        const dot = r.reduce((s,x,k) => s+x*moment[k],0);
        for (let k=0;k<dims;k++) field[k] += b.q*B*r[k]+C*r[k]*dot-B*moment[k];
      });
      return field;
    });
    let p = Array.from({length:n},()=>Array(dims).fill(0)), iterations=0;
    for (;iterations<200;iterations++) {
      const e=fields(p);
      const next=atoms.map((a,i)=>e[i].map((x,k)=>.65*a.alpha*x+.35*p[i][k]));
      const delta=Math.max(...next.flatMap((v,i)=>v.map((x,k)=>Math.abs(x-p[i][k]))));
      p=next;
      if(delta<1e-10) {iterations++;break;}
    }
    const e=fields(p);
    const residual=Math.max(...atoms.flatMap((a,i)=>e[i].map((x,k)=>Math.abs(p[i][k]-a.alpha*x))));
    return {dipoles:p, iterations, residual, converged:residual<1e-9};
  };
  const moment = (atoms, p) => {
    const covalent=covalentDipoles(atoms);
    return atoms[0].r.map((_,k) => atoms.reduce((s,a,i) => s+a.q*a.r[k]+covalent[i][k]+(p?.[i]?.[k]??0),0));
  };
  window.StudioGaussian = {erf, solve, moment, covalentDipoles};
})();
