// Ink-wash hero effects: stroke-draw name, parallax, ink particles, petals, koi, ink-trail.
(function () {
  var hero = document.getElementById('ink-hero');
  if (!hero) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 1. 黄震 written stroke-by-stroke ----------
  function writeName() {
    var nameEl = hero.querySelector('.ink-hero__name');
    if (reduce || !window.HanziWriter) { hero.classList.add('is-ready'); return; }
    hero.classList.add('hz-active');
    var chars = (hero.dataset.name || '黄震').split('');
    var size = Math.min(210, Math.max(110, window.innerWidth * 0.17));
    var writers = chars.map(function (ch) {
      var d = document.createElement('div'); d.className = 'hz-char'; nameEl.appendChild(d);
      return HanziWriter.create(d, ch, {
        width: size, height: size, padding: 5,
        strokeColor: '#1A1A1A', showOutline: false, showCharacter: false,
        strokeAnimationSpeed: 1.1, delayBetweenStrokes: 90
      });
    });
    var i = 0;
    (function next() {
      if (i >= writers.length) { hero.classList.add('is-ready'); return; }
      writers[i].animateCharacter({ onComplete: function () { i++; next(); } });
    })();
    setTimeout(function () { hero.classList.add('is-ready'); }, 6000); // safety
  }

  // ---------- 2. parallax (sun + mountain layers) ----------
  if (!reduce) {
    var sun = hero.querySelector('.ink-hero__sun');
    var layers = [
      { el: hero.querySelector('.m-far'), f: 6 },
      { el: hero.querySelector('.m-mid'), f: 12 },
      { el: hero.querySelector('.m-near'), f: 20 },
      { el: sun, f: 10 }
    ];
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      layers.forEach(function (l) {
        if (l.el) l.el.style.transform = 'translate(' + (dx * l.f) + 'px,' + (dy * l.f * 0.5) + 'px)';
      });
    });
  }

  // ---------- 3. canvas: ink particles + petals + koi + ink-trail ----------
  var canvas = hero.querySelector('.ink-hero__fx');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d');
    var W, H;
    function resize() { var r = hero.getBoundingClientRect(); W = canvas.width = r.width; H = canvas.height = r.height; }
    resize(); window.addEventListener('resize', resize);

    function spawnPart() { return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.4 + 0.6, vx: (Math.random() - 0.5) * 0.15, vy: -(Math.random() * 0.25 + 0.05), a: Math.random() * 0.22 + 0.05 }; }
    var parts = []; for (var p = 0; p < 32; p++) parts.push(spawnPart());

    function spawnPetal(init) { return { x: Math.random() * W, y: init ? Math.random() * H : -10, s: Math.random() * 5 + 5, vy: Math.random() * 0.45 + 0.28, sway: Math.random() * 1.3 + 0.6, ph: Math.random() * 6.28, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04 }; }
    var petals = []; for (var q = 0; q < 12; q++) petals.push(spawnPetal(true));

    var koi = { x: -90, y: H * 0.6, vx: 0.5, t: 0 };
    var trail = [];
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      trail.push({ x: e.clientX - r.left, y: e.clientY - r.top, a: 0.32, r: Math.random() * 6 + 4 });
      if (trail.length > 40) trail.shift();
    });

    function drawKoi(x, y, t) {
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.7; ctx.fillStyle = '#c45a3a';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, 6.28); ctx.fill();
      var tw = Math.sin(t * 3) * 0.5;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-27, -7 + tw * 6); ctx.lineTo(-24, 0); ctx.lineTo(-27, 7 + tw * 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1A1A1A'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(10, -1, 1.5, 0, 6.28); ctx.fill();
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#1A1A1A';
      parts.forEach(function (pt) {
        pt.x += pt.vx; pt.y += pt.vy;
        if (pt.y < -5 || pt.x < -5 || pt.x > W + 5) { var n = spawnPart(); n.y = H + 5; Object.assign(pt, n); }
        ctx.globalAlpha = pt.a; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 6.28); ctx.fill();
      });
      petals.forEach(function (pe) {
        pe.ph += 0.02; pe.y += pe.vy; pe.x += Math.sin(pe.ph) * pe.sway * 0.3; pe.rot += pe.vr;
        if (pe.y > H + 12) Object.assign(pe, spawnPetal(false));
        ctx.globalAlpha = 0.5; ctx.save(); ctx.translate(pe.x, pe.y); ctx.rotate(pe.rot);
        ctx.fillStyle = '#d98a8a'; ctx.beginPath(); ctx.ellipse(0, 0, pe.s * 0.5, pe.s, 0, 0, 6.28); ctx.fill(); ctx.restore();
      });
      koi.t += 0.03; koi.x += koi.vx; var ky = koi.y + Math.sin(koi.t) * 10;
      if (koi.x > W + 100) { koi.x = -100; koi.y = H * (0.5 + Math.random() * 0.22); }
      drawKoi(koi.x, ky, koi.t);
      trail.forEach(function (tp) { tp.a *= 0.92; ctx.globalAlpha = tp.a; ctx.fillStyle = '#1A1A1A'; ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.r, 0, 6.28); ctx.fill(); });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    draw();
  }

  writeName();
})();
