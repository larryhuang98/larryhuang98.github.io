(() => {
  'use strict';
  const root=document.querySelector('[data-multipole-explorer]');
  if(!root) return;
  const molecules=JSON.parse(root.querySelector('#studio-multipole-data').textContent);
  const defaults=structuredClone(molecules);
  const model=window.StudioGaussian, ns='http://www.w3.org/2000/svg';
  const svg=root.querySelector('svg');
  const angle=root.querySelector('#studio-multipole-angle');
  const field=root.querySelector('#studio-multipole-field');
  const picks=root.querySelector('[data-multipole-atom-picks]');
  const waterAngle=root.querySelector('#studio-water-angle');
  const editor=root.querySelector('[data-atom-editor]');
  const table=root.querySelector('[data-multipole-table]');
  const editStatus=root.querySelector('[data-atom-edit-status]');
  const bulkStatus=root.querySelector('[data-multipole-bulk-status]');
  let tableDirty=false;
  let key='water', selected=0, solution, frame=0, needsPhysics=false, pitch=18, drag=null;
  const subscript=n=>String(n).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
  const atomName=i=>molecules[key].atoms[i].symbol+subscript(i+1);
  const superscript=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
  const basisName=(to,origin)=>'e'+superscript(to+1)+superscript(origin+1);
  const virtual=(i,j)=>!molecules[key].bonds.some(([a,b])=>(a===i&&b===j)||(a===j&&b===i));
  const format=(x,digits=3)=>Math.abs(x)<.5*10**(-digits) ? (0).toFixed(digits) : x.toFixed(digits).replace('-','−');
  const vector=v=>'('+v.map(x=>format(x,4)).join(', ')+')';
  const add=(parent,tag,attrs,text)=>{
    const node=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));
    if(text)node.textContent=text;
    parent.appendChild(node);return node;
  };
  const rotate=v=>{
    const theta=Number(angle.value)*Math.PI/180, tilt=pitch*Math.PI/180;
    const x=v[0]*Math.cos(theta)+v[2]*Math.sin(theta);
    const z=-v[0]*Math.sin(theta)+v[2]*Math.cos(theta);
    return [x,v[1]*Math.cos(tilt)-z*Math.sin(tilt),v[1]*Math.sin(tilt)+z*Math.cos(tilt)];
  };
  const screen=([x,y])=>[255+67*x,175-67*y];
  const layers=()=>Object.fromEntries([...root.querySelectorAll('[data-multipole-layer]')].map(input=>[input.dataset.multipoleLayer,input.checked]));
  const drawDensity=visible=>{
    const parent=root.querySelector('[data-multipole-density]');parent.replaceChildren();
    if(!(visible.charge||visible.permanent||visible.induced))return;
    const sites=molecules[key].atoms.map((a,i)=>({r:rotate(a.r),beta:a.beta,q:visible.charge?a.q:0,m:rotate(a.mu.map((v,k)=>(visible.permanent?v:0)+(visible.induced?solution.dipoles[i][k]:0)))}));
    const nx=drag?.moved?76:124,ny=drag?.moved?46:74,x0=-3.6,y0=-2.5,dx=7.5/nx,dy=5/ny;
    // Exact line-of-sight projection of each 3D Gaussian and its derivatives:
    // ∫ρ dz = (β²/π)[q + 2β²(m_x dx + m_y dy)] exp[-β²(dx²+dy²)].
    const grid=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>{
      const x=x0+i*dx,y=y0+j*dy;
      return sites.reduce((s,a)=>{const rx=x-a.r[0],ry=y-a.r[1],b2=a.beta*a.beta;return s+b2/Math.PI*(a.q+2*b2*(a.m[0]*rx+a.m[1]*ry))*Math.exp(-b2*(rx*rx+ry*ry));},0);
    }));
    const levels=visible.charge?[-.14,-.09,-.04,-.025,.025,.04,.09,.14]:[-.015,-.008,-.003,.003,.008,.015];
    for(const level of levels){
      const segments=[];
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
        const corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],points=[];
        for(let edge=0;edge<4;edge++){
          const [ax,ay]=corners[edge],[bx,by]=corners[(edge+1)%4];
          const va=grid[ay][ax],vb=grid[by][bx];if((va>=level)===(vb>=level))continue;
          const t=(level-va)/(vb-va);points.push(screen([x0+(ax+t*(bx-ax))*dx,y0+(ay+t*(by-ay))*dy]));
        }
        for(let c=0;c+1<points.length;c+=2)segments.push(`M${points[c].map(x=>x.toFixed(2)).join(',')}L${points[c+1].map(x=>x.toFixed(2)).join(',')}`);
      }
      if(segments.length)add(parent,'path',{d:segments.join(''),fill:'none',stroke:level<0?'#28639c':'#b18c72','stroke-width':.85,opacity:Math.abs(level)<.004?.2:.46});
    }
  };
  const drawCbvFrame=visible=>{
    const parent=root.querySelector('[data-multipole-cbv]');parent.replaceChildren();
    if(!visible.cbv)return;
    const atoms=molecules[key].atoms,a=atoms[selected],[x,y]=screen(rotate(a.r));
    a.cbv.forEach(term=>{
      const delta=a.r.map((v,k)=>atoms[term.to].r[k]-v),length=Math.hypot(...delta),v=rotate(delta.map(x=>x/length));
      const norm=Math.hypot(v[0],v[1]);if(norm<1e-6)return;
      const start=[x+v[0]*20,y-v[1]*20],end=[x+v[0]*48,y-v[1]*48];
      add(parent,'path',{d:`M${start}L${end}`,class:'studio-cbv-vector'+(virtual(selected,term.to)?' is-virtual':''),'marker-end':'url(#studio-cbv-tip)'});
      add(parent,'text',{x:x+v[0]*51+v[1]/norm*19,y:y-v[1]*51+v[0]/norm*19,class:'studio-cbv-vector-label','text-anchor':'middle'},basisName(term.to,selected));
    });
  };
  const drawAtomScene=visible=>{
    const molecule=molecules[key];
    const longest=Math.max(1e-9,...molecule.atoms.flatMap((a,i)=>[visible.permanent?a.mu:[0,0,0],visible.induced?solution.dipoles[i]:[0,0,0]].map(v=>Math.hypot(...rotate(v).slice(0,2)))));
    const arrowScale=Math.min(600,72/longest);
    const bonds=root.querySelector('[data-multipole-bonds]'),atoms=root.querySelector('[data-multipole-atoms]'),arrows=root.querySelector('[data-multipole-arrows]');
    [bonds,atoms,arrows].forEach(g=>g.replaceChildren());
    molecule.bonds.forEach(([i,j,order=1])=>{
      const a=screen(rotate(molecule.atoms[i].r)),b=screen(rotate(molecule.atoms[j].r));
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const normal=length>1e-6?[-(b[1]-a[1])/length,(b[0]-a[0])/length]:[0,0];
      for(let l=0;l<order;l++){
        const offset=order===2?(l===0?-2.5:2.5):0;
        add(bonds,'path',{d:`M${a.map((v,k)=>v+normal[k]*offset)}L${b.map((v,k)=>v+normal[k]*offset)}`,class:'studio-multipole-bond'});
      }
    });
    // Painter's order, so the closer atoms are drawn last.
    const order=molecule.atoms.map((a,i)=>({i,view:rotate(a.r)})).sort((a,b)=>a.view[2]-b.view[2]);
    order.forEach(({i,view})=>{
      const atom=molecule.atoms[i],[x,y]=screen(view);
      const g=add(atoms,'g',{'data-atom-index':i,class:'studio-multipole-atom'+(i===selected?' is-selected':'' )});
      add(g,'circle',{cx:x,cy:y,r:23,class:'studio-multipole-hit'});
      if(i===selected)add(g,'circle',{cx:x,cy:y,r:20,class:'studio-multipole-selection'});
      add(g,'circle',{cx:x,cy:y,r:atom.symbol==='H'?11:14,class:atom.q<0?'studio-multipole-negative':'studio-multipole-positive'});
      add(g,'text',{x,y:y+.5,'text-anchor':'middle','dominant-baseline':'middle',class:'studio-multipole-symbol'},atomName(i));
      if(visible.charge)add(g,'text',{x,y:y+32,'text-anchor':'middle',class:'studio-multipole-charge'},format(atom.q,2));
      const arrow=(moment,type,offset)=>{
        const v=rotate(moment),length=Math.hypot(v[0],v[1]);if(length<1e-7)return;
        const dir=[v[0]/length,-v[1]/length],normal=[-dir[1],dir[0]];
        const a=[x+dir[0]*18+normal[0]*offset,y+dir[1]*18+normal[1]*offset];
        const b=[a[0]+v[0]*arrowScale,a[1]-v[1]*arrowScale];
        add(arrows,'path',{d:`M${a}L${b}`,class:`studio-multipole-vector studio-multipole-${type}`,'marker-end':`url(#studio-${type}-tip)`});
      };
      if(visible.permanent)arrow(atom.mu,'permanent',-4);
      if(visible.induced)arrow(solution.dipoles[i],'induced',4);
    });
    picks.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
    drawCbvFrame(visible);
  };
  const drawAxes=()=>{
    const parent=root.querySelector('.studio-multipole-axis');parent.replaceChildren();
    [[1,0,0],[0,1,0],[0,0,1]].forEach((basis,i)=>{
      const v=rotate(basis),end=[44+v[0]*25,290-v[1]*25];
      add(parent,'path',{d:`M44 290L${end}`});add(parent,'text',{x:end[0]+5,y:end[1]+3},'xyz'[i]);
    });
    add(parent,'text',{x:24,y:327},'Projected charge density');
    const total=model.moment(molecules[key].atoms,solution.dipoles),v=rotate(total),norm=Math.hypot(v[0],v[1]);
    const compass=root.querySelector('[data-multipole-total]');compass.replaceChildren();
    add(compass,'circle',{cx:517,cy:200,r:38,class:'studio-multipole-compass'});
    if(norm>1e-8)add(compass,'path',{d:`M517 200L${517+32*v[0]/norm},${200-32*v[1]/norm}`,class:'studio-multipole-molecular-arrow','marker-end':'url(#studio-total-tip)'});
    add(compass,'text',{x:517,y:258,'text-anchor':'middle',class:'studio-multipole-compass-label'},'Molecular dipole');
    add(compass,'text',{x:517,y:273,'text-anchor':'middle',class:'studio-multipole-compass-label'},'direction');
  };
  const inspect=()=>{
    const atoms=molecules[key].atoms,a=atoms[selected];
    const put=(name,value)=>{root.querySelector(`[data-multipole-${name}]`).textContent=value;};
    put('atom-title',atomName(selected));put('mu',vector(a.mu));put('p',vector(solution.dipoles[selected]));put('beta',format(a.beta,2));put('alpha',format(a.alpha,2));
    const net=atoms.reduce((s,a)=>s+a.q,0);
    put('net',format(net));root.querySelector('[data-multipole-origin-note]').hidden=Math.abs(net)<1e-10;put('permanent-total',format(Math.hypot(...model.moment(atoms))));put('total-value',format(Math.hypot(...model.moment(atoms,solution.dipoles))));
    put('scf',solution.converged?`SCF converged · ${solution.iterations} iterations`:'SCF did not converge');put('residual',`Residual ${solution.residual.toExponential(1)} · all sites coupled`);
    root.querySelector('[data-multipole-angle-output]').value=`${Math.round(Number(angle.value))}° / ${Math.round(pitch)}°`;
    svg.setAttribute('aria-label',`Interactive ${molecules[key].name} multipoles. View yaw ${Math.round(Number(angle.value))} degrees, tilt ${Math.round(pitch)} degrees. Drag or use arrow keys to rotate.`);
    root.querySelector('[data-multipole-field-output]').value=format(Number(field.value),2);
    root.querySelector('[data-cbv-geometry]').hidden=key!=='water';
    if(key==='water'){
      const bonds=[1,2].map(i=>atoms[i].r.map((v,k)=>v-atoms[0].r[k]));
      const cosine=bonds[0].reduce((s,v,k)=>s+v*bonds[1][k],0)/(Math.hypot(...bonds[0])*Math.hypot(...bonds[1]));
      const degrees=Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI;
      waterAngle.value=String(Math.round(degrees*2)/2);root.querySelector('[data-water-angle-output]').value=degrees.toFixed(1)+'°';
    }
  };
  const draw=()=>{const visible=layers();drawDensity(visible);drawAtomScene(visible);drawAxes();inspect();};
  const physics=()=>{
    const atoms=molecules[key].atoms,mu=model.covalentDipoles(atoms);
    atoms.forEach((a,i)=>{a.mu=mu[i];}); // derived Cartesian vectors, never fitted inputs
    solution=model.solve(atoms,[Number(field.value),0,0]);
  };
  const schedule=(update=false)=>{needsPhysics=needsPhysics||update;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(needsPhysics)physics();needsPhysics=false;draw();});};
  const select=i=>{selected=i;drawAtomScene(layers());inspect();syncEditor();};
  const buildPicks=()=>{
    picks.replaceChildren();molecules[key].atoms.forEach((a,i)=>{
      const button=document.createElement('button');button.type='button';button.textContent=atomName(i);button.setAttribute('aria-label',`Inspect ${a.symbol} atom ${i+1}`);button.addEventListener('click',()=>select(i));picks.appendChild(button);
    });
  };
  const editInputs=()=>[root.querySelector('#studio-edit-q'),...root.querySelectorAll('[data-cbv-input]')];
  const atomTable=()=>['# CBV parameters: atom q neighbor:u ...',...molecules[key].atoms.map((a,i)=>[a.symbol+(i+1),a.q,...a.cbv.map(term=>molecules[key].atoms[term.to].symbol+(term.to+1)+':'+term.u)].join(' '))].join('\n');
  const syncTable=()=>{table.value=atomTable();tableDirty=false;};
  const syncEditor=()=>{
    const a=molecules[key].atoms[selected],container=root.querySelector('[data-cbv-coefficients]');
    root.querySelector('#studio-edit-q').value=String(a.q);root.querySelector('#studio-edit-q').removeAttribute('aria-invalid');
    container.replaceChildren();
    a.cbv.forEach((term,index)=>{
      const label=document.createElement('label'),name=document.createElement('span'),direction=document.createElement('small'),input=document.createElement('input');
      label.className='studio-cbv-input';name.textContent='u'+subscript(index+1)+' · '+basisName(term.to,selected);
      direction.textContent=atomName(selected)+' → '+atomName(term.to)+(virtual(selected,term.to)?' · virtual':'');
      input.type='number';input.step='any';input.min='-100';input.max='100';input.required=true;input.value=String(term.u);input.dataset.cbvInput=String(index);
      input.setAttribute('aria-label',`CBV coefficient u${index+1} toward ${atomName(term.to)}`);
      label.append(name,direction,input);container.appendChild(label);
    });
    editStatus.textContent='';
  };
  const updateBadge=()=>{
    const changed=molecules[key].atoms.some((a,i)=>a.q!==defaults[key].atoms[i].q||a.cbv.some((term,k)=>term.u!==defaults[key].atoms[i].cbv[k].u));
    root.querySelector('.studio-multipole-demo').textContent=changed?'Custom q / CBV · illustrative model':'Illustrative CBV parameters';
  };
  const number=value=>{
    const text=value.trim().replace(/−/g,'-');
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))return null;
    const parsed=Number(text);return Number.isFinite(parsed)&&Math.abs(parsed)<=100?parsed:null;
  };
  const applyParameters=()=>{
    cancelAnimationFrame(frame);needsPhysics=false;physics();draw();updateBadge();syncEditor();
    if(!tableDirty)syncTable();
  };
  editor.addEventListener('submit',event=>{
    event.preventDefault();
    const inputs=editInputs(),values=inputs.map(input=>number(input.value));
    inputs.forEach((input,i)=>input.setAttribute('aria-invalid',String(values[i]===null)));
    if(values.some(x=>x===null)){
      editStatus.textContent='Enter q and every CBV coefficient as numbers between −100 and 100.';
      inputs[values.findIndex(x=>x===null)].focus();return;
    }
    const atom=molecules[key].atoms[selected];atom.q=values[0];atom.cbv.forEach((term,i)=>{term.u=values[i+1];});
    applyParameters();bulkStatus.textContent='';editStatus.textContent=`Applied to ${atomName(selected)}. CBV dipole and SCF updated.`;
  });
  root.querySelector('[data-multipole-restore]').addEventListener('click',()=>{
    molecules[key]=structuredClone(defaults[key]);tableDirty=false;applyParameters();
    bulkStatus.textContent='';editStatus.textContent='Example geometry and CBV parameters restored.';
  });
  table.addEventListener('input',()=>{tableDirty=true;table.removeAttribute('aria-invalid');bulkStatus.textContent='';});
  root.querySelector('[data-multipole-bulk-form]').addEventListener('submit',event=>{
    event.preventDefault();
    const rows=table.value.split(/\r?\n/).map(row=>row.trim()).filter(row=>row&&!row.startsWith('#'));
    const atoms=molecules[key].atoms,parsed=[];
    const fail=message=>{bulkStatus.textContent=message;table.setAttribute('aria-invalid','true');};
    if(rows[0]&&/mu[_xyz]|μ[xyz]/i.test(rows[0])){fail('Use CBV neighbor:u coefficients, not Cartesian μ components.');return;}
    if(rows[0]&&/^atom[\s,]+q(?:[\s,]|$)/i.test(rows[0]))rows.shift();
    if(rows.length!==atoms.length){fail(`Expected ${atoms.length} atom rows for ${molecules[key].name}; found ${rows.length}.`);return;}
    const normalized=value=>value.replace(/[₀-₉]/g,d=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(d)).toLowerCase();
    for(let i=0;i<rows.length;i++){
      const parts=rows[i].split(/[\s,]+/),a=atoms[i];
      if(parts.length!==a.cbv.length+2){fail(`Row ${i+1}: enter atom, q and ${a.cbv.length} neighbor:u CBV terms.`);return;}
      if(normalized(parts.shift())!==normalized(atomName(i))){fail(`Row ${i+1} must refer to ${atomName(i)}.`);return;}
      const q=number(parts.shift());if(q===null){fail(`Row ${i+1}: invalid charge.`);return;}
      const values=new Map();
      for(const token of parts){
        const pair=token.split(':'),name=normalized(pair[0]),value=pair.length===2?number(pair[1]):null;
        if(value===null||values.has(name)||!a.cbv.some(term=>normalized(atomName(term.to))===name)){fail(`Row ${i+1}: use each listed CBV neighbor once, as neighbor:u.`);return;}
        values.set(name,value);
      }
      parsed.push({q,u:a.cbv.map(term=>values.get(normalized(atomName(term.to))))});
    }
    parsed.forEach((values,i)=>{atoms[i].q=values.q;atoms[i].cbv.forEach((term,k)=>{term.u=values.u[k];});});
    tableDirty=false;table.removeAttribute('aria-invalid');applyParameters();
    bulkStatus.textContent=`Applied ${atoms.length} atoms. CBV dipoles and SCF updated.`;
  });
  root.querySelector('[data-multipole-copy-table]').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(atomTable());bulkStatus.textContent='Current q and CBV coefficients copied.';}
    catch{table.focus();table.select();bulkStatus.textContent=tableDirty?'Clipboard unavailable; your draft is selected for manual copying.':'Table selected; use your copy shortcut.';}
  });
  const wrapYaw=value=>((value+180)%360+360)%360-180;
  const clampPitch=value=>Math.max(-85,Math.min(85,value));
  const resetView=()=>{angle.value='20';pitch=18;schedule();};
  const finishDrag=(event,cancelled=false)=>{
    if(!drag||event.pointerId!==drag.id)return;
    const finished=drag;drag=null;svg.classList.remove('is-dragging');
    if(svg.hasPointerCapture(finished.id))svg.releasePointerCapture(finished.id);
    // Pointer capture retargets clicks to the SVG, so atom selection belongs
    // here. Moving more than five pixels is a rotation, never an atom click.
    if(!cancelled&&!finished.moved&&finished.atom!==null)select(finished.atom);
    if(finished.moved)schedule(); // restore full contour resolution on release
  };
  svg.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    const atom=event.target.closest('[data-atom-index]');
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:Number(angle.value),pitch,moved:false,atom:atom?Number(atom.dataset.atomIndex):null};
    svg.setPointerCapture(event.pointerId);svg.focus({preventScroll:true});
  });
  svg.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    drag.moved=true;svg.classList.add('is-dragging');
    // Normalize sensitivity to the rendered scene, including small screens.
    const gain=260/svg.getBoundingClientRect().width;
    angle.value=String(wrapYaw(drag.yaw+dx*gain));pitch=clampPitch(drag.pitch-dy*gain);
    schedule();
  });
  svg.addEventListener('pointerup',event=>finishDrag(event));
  svg.addEventListener('pointercancel',event=>finishDrag(event,true));
  svg.addEventListener('lostpointercapture',event=>finishDrag(event,true));
  svg.addEventListener('dblclick',event=>{event.preventDefault();resetView();});
  svg.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home'){resetView();return;}
    const step=event.shiftKey?15:5;
    if(event.key==='ArrowLeft')angle.value=String(wrapYaw(Number(angle.value)-step));
    if(event.key==='ArrowRight')angle.value=String(wrapYaw(Number(angle.value)+step));
    if(event.key==='ArrowUp')pitch=clampPitch(pitch+step);
    if(event.key==='ArrowDown')pitch=clampPitch(pitch-step);
    schedule();
  });
  root.querySelectorAll('[data-multipole-molecule]').forEach(button=>button.addEventListener('click',()=>{
    key=button.dataset.multipoleMolecule;selected=0;cancelAnimationFrame(frame);
    root.querySelectorAll('[data-multipole-molecule]').forEach(peer=>peer.setAttribute('aria-pressed',String(peer===button)));
    buildPicks();physics();draw();syncEditor();syncTable();updateBadge();bulkStatus.textContent='';
  }));
  root.querySelectorAll('[data-multipole-layer]').forEach(input=>input.addEventListener('change',()=>schedule()));
  angle.addEventListener('input',()=>schedule());field.addEventListener('input',()=>schedule(true));
  waterAngle.addEventListener('input',()=>{
    if(key!=='water')return;
    const atoms=molecules.water.atoms,o=atoms[0].r;
    const length=Math.hypot(...atoms[1].r.map((v,k)=>v-o[k])),half=Number(waterAngle.value)*Math.PI/360;
    atoms[1].r=[o[0]-length*Math.sin(half),o[1]+length*Math.cos(half),o[2]];
    atoms[2].r=[o[0]+length*Math.sin(half),o[1]+length*Math.cos(half),o[2]];
    schedule(true);
  });
  root.querySelector('[data-multipole-reset]').addEventListener('click',()=>{
    cancelAnimationFrame(frame);angle.value='20';pitch=18;field.value='0';selected=0;
    root.querySelectorAll('[data-multipole-layer]').forEach(input=>{input.checked=true;});physics();draw();syncEditor();
  });
  buildPicks();physics();draw();syncEditor();syncTable();updateBadge();
})();
