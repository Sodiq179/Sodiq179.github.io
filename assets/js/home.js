/* Home page: live supply-network hero, rotating word, count-ups,
   scroll reveals, timeline progress and the section rail.
   Everything degrades to a static page without JS or with reduced motion. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Live network ---------- */
  var cv = document.getElementById("net");
  var hero = document.querySelector(".hero4, .band4");
  var hubEl = document.getElementById("hub");
  if (cv && hero) {
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var nodes = [], adj = [], edges = [], heat = {}, parent = [], depots = [];
    var built = false, ships = [], mouse = null, target = -1, running = false, visible = true, last = 0, spawnT = 0;

    function rand(a, b) { return a + Math.random() * (b - a); }
    function key(a, b) { return a < b ? a + "-" + b : b + "-" + a; }

    function build() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = []; depots = [];
      // Main depot sits at the centre of the portrait
      if (hubEl) {
        var hr = hubEl.getBoundingClientRect();
        nodes.push({ x: hr.left - r.left + hr.width / 2, y: hr.top - r.top + Math.min(hr.width, hr.height) / 2, depot: 2 });
      } else {
        nodes.push({ x: W * (W < 720 ? 0.85 : 0.8), y: H * 0.45, depot: 1 });
      }
      depots.push(0);
      var target_n = Math.round(Math.max(34, Math.min(90, (W * H) / 15000)));
      var minD = Math.sqrt((W * H) / target_n) * 0.62, tries = 0;
      while (nodes.length < target_n && tries < 6000) {
        tries++;
        var p = { x: rand(16, W - 16), y: rand(16, H - 16), depot: 0 };
        var ok = true;
        for (var i = 0; i < nodes.length; i++) {
          var dx = nodes[i].x - p.x, dy = nodes[i].y - p.y;
          if (dx * dx + dy * dy < minD * minD * (i === 0 ? 3.2 : 1)) { ok = false; break; }
        }
        if (ok) nodes.push(p);
      }
      // Two secondary depots, far apart
      var cands = nodes.slice(1).map(function (n, i) { return i + 1; });
      cands.sort(function (a, b) { return nodes[a].x - nodes[b].x; });
      if (cands.length > 4) {
        var d1 = cands[Math.floor(cands.length * 0.12)], d2 = cands[Math.floor(cands.length * 0.55)];
        nodes[d1].depot = 1; nodes[d2].depot = 1; depots.push(d1, d2);
      }
      // k-nearest graph
      adj = nodes.map(function () { return []; });
      var seen = {}; edges = [];
      nodes.forEach(function (n, i) {
        var ds = nodes.map(function (m, j) { return { j: j, d: Math.hypot(m.x - n.x, m.y - n.y) }; })
          .filter(function (o) { return o.j !== i; }).sort(function (a, b) { return a.d - b.d; });
        var k = i === 0 ? 5 : 3;
        for (var t = 0; t < k && t < ds.length; t++) {
          var kk = key(i, ds[t].j);
          if (seen[kk]) continue;
          seen[kk] = 1; edges.push([i, ds[t].j]);
          adj[i].push({ j: ds[t].j, w: ds[t].d }); adj[ds[t].j].push({ j: i, w: ds[t].d });
        }
      });
      // Multi-source Dijkstra from the depots
      var dist = nodes.map(function () { return Infinity; });
      parent = nodes.map(function () { return -1; });
      var done = nodes.map(function () { return false; });
      depots.forEach(function (d) { dist[d] = 0; });
      for (var c = 0; c < nodes.length; c++) {
        var u = -1, best = Infinity;
        for (var q = 0; q < nodes.length; q++) if (!done[q] && dist[q] < best) { best = dist[q]; u = q; }
        if (u < 0) break;
        done[u] = true;
        adj[u].forEach(function (e) {
          if (dist[u] + e.w < dist[e.j]) { dist[e.j] = dist[u] + e.w; parent[e.j] = u; }
        });
      }
      heat = {}; ships = []; built = true;
      if (reduce) { for (var s = 0; s < 14; s++) spawn(); ships.forEach(function (sh) { sh.pos = sh.len * rand(0.3, 0.9); markHeat(sh, 0.8); }); draw(); }
    }

    function pathTo(t) {
      var p = [t];
      while (parent[p[0]] >= 0) p.unshift(parent[p[0]]);
      return p;
    }
    function spawn(forced) {
      if (nodes.length < 3) return;
      var t = forced != null ? forced : 1 + Math.floor(Math.random() * (nodes.length - 1));
      if (nodes[t].depot) return;
      var p = pathTo(t);
      if (p.length < 2) return;
      var len = 0, segs = [];
      for (var i = 0; i < p.length - 1; i++) {
        var a = nodes[p[i]], b = nodes[p[i + 1]], l = Math.hypot(b.x - a.x, b.y - a.y);
        segs.push({ a: p[i], b: p[i + 1], l: l, s: len }); len += l;
      }
      ships.push({ segs: segs, len: len, pos: 0, v: rand(70, 120), hub: p[0] === 0, forced: forced != null });
    }
    function markHeat(sh, amt) {
      sh.segs.forEach(function (sg) { if (sg.s <= sh.pos) { var k = key(sg.a, sg.b); heat[k] = Math.min(1, (heat[k] || 0) + amt); } });
    }

    function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var flow = css("--flow") || "94,200,229", gold = css("--signal") || "242,181,68";
      // edges
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath();
      edges.forEach(function (e) { var a = nodes[e[0]], b = nodes[e[1]]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
      ctx.stroke();
      // heated edges
      for (var k in heat) {
        var h = heat[k]; if (h < 0.02) continue;
        var ab = k.split("-"), a = nodes[+ab[0]], b = nodes[+ab[1]];
        ctx.strokeStyle = "rgba(" + flow + "," + (0.08 + h * 0.5).toFixed(3) + ")";
        ctx.lineWidth = 1 + h * 1.4;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // nodes
      nodes.forEach(function (n, i) {
        if (i === 0 && hubEl) return;
        if (n.depot) {
          ctx.fillStyle = "rgba(" + gold + ",0.9)";
          ctx.beginPath(); ctx.arc(n.x, n.y, 4.5, 0, 6.283); ctx.fill();
          ctx.strokeStyle = "rgba(" + gold + ",0.35)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(n.x, n.y, 10, 0, 6.283); ctx.stroke();
        } else {
          ctx.fillStyle = i === target ? "rgba(" + gold + ",1)" : "rgba(255,255,255,0.28)";
          ctx.beginPath(); ctx.arc(n.x, n.y, i === target ? 4 : 2.2, 0, 6.283); ctx.fill();
        }
      });
      if (target > 0) {
        var tn = nodes[target], ph = (performance.now() / 900) % 1;
        ctx.strokeStyle = "rgba(" + gold + "," + (0.6 * (1 - ph)).toFixed(3) + ")"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tn.x, tn.y, 6 + ph * 18, 0, 6.283); ctx.stroke();
      }
      // shipments
      ships.forEach(function (sh) {
        var sg = null;
        for (var i = 0; i < sh.segs.length; i++) if (sh.pos >= sh.segs[i].s && sh.pos <= sh.segs[i].s + sh.segs[i].l) { sg = sh.segs[i]; break; }
        if (!sg) return;
        var a = nodes[sg.a], b = nodes[sg.b], f = (sh.pos - sg.s) / sg.l;
        var x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        var col = sh.forced ? gold : flow;
        var g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, "rgba(" + col + ",0.55)"); g.addColorStop(1, "rgba(" + col + ",0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill();
        ctx.fillStyle = "rgba(" + col + ",1)"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.283); ctx.fill();
      });
    }

    function step(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = rand(0.1, 0.26);
        if (target > 0 && Math.random() < 0.55) spawn(target); else spawn();
      }
      ships.forEach(function (sh) { sh.pos += sh.v * dt; markHeat(sh, dt * 1.6); });
      ships = ships.filter(function (sh) { return sh.pos < sh.len; });
      for (var k in heat) { heat[k] *= Math.pow(0.62, dt); if (heat[k] < 0.01) delete heat[k]; }
      draw();
      requestAnimationFrame(step);
    }
    function start() { if (!built || reduce || running || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(step); }
    function stop() { running = false; }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 1e9;
      for (var i = 1; i < nodes.length; i++) { if (nodes[i].depot) continue; var d = Math.hypot(nodes[i].x - x, nodes[i].y - y); if (d < bd) { bd = d; best = i; } }
      target = bd < 140 ? best : -1;
      if (reduce) draw();
    });
    hero.addEventListener("pointerleave", function () { target = -1; if (reduce) draw(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 150); });
    var mo = new MutationObserver(function () { if (reduce) draw(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    var init = function () { build(); start(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
  }

  /* ---------- Rotating word ---------- */
  var rot = document.querySelector(".rot");
  if (rot && !reduce) {
    var words = rot.getAttribute("data-words").split("|"), wi = 0;
    rot.innerHTML = words.map(function (w, i) { return '<span class="rot__word' + (i === 0 ? " is-on" : "") + '">' + w + "</span>"; }).join("");
    var spans = rot.querySelectorAll(".rot__word");
    var fit = function () { rot.style.width = spans[wi].getBoundingClientRect().width + "px"; };
    fit(); window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    setInterval(function () {
      spans[wi].classList.remove("is-on"); spans[wi].classList.add("is-off");
      var prev = wi; wi = (wi + 1) % spans.length;
      setTimeout(function () { spans[prev].classList.remove("is-off"); }, 600);
      spans[wi].classList.add("is-on");
      fit();
    }, 2600);
  }

  /* ---------- Reveal on scroll + count-ups ---------- */
  function countUp(el) {
    var end = +el.getAttribute("data-count"), t0 = null, dur = 1100;
    if (reduce || end < 3) { el.textContent = end; return; }
    function f(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }
    requestAnimationFrame(f);
  }
  var revs = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        e.target.querySelectorAll("[data-count]").forEach(countUp);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revs.forEach(function (r) { io.observe(r); });
  } else { revs.forEach(function (r) { r.classList.add("is-in"); }); }

  /* ---------- Timeline progress ---------- */
  var tl = document.getElementById("timeline"), fill = tl && tl.querySelector(".tl__fill");
  function tlUpdate() {
    if (!fill) return;
    var r = tl.getBoundingClientRect(), mid = window.innerHeight * 0.6;
    var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    fill.style.transform = "scaleY(" + p.toFixed(4) + ")";
  }

  /* ---------- Section rail ---------- */
  var rail = document.querySelector(".rail4") || document.querySelector(".jump4"), links = rail ? rail.querySelectorAll("a") : [];
  var secs = Array.prototype.map.call(links, function (a) { return document.querySelector(a.getAttribute("href")); });
  function railUpdate() {
    if (!rail) return;
    var y = window.innerHeight * 0.35, cur = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= y) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle("is-on", i === cur); });
    if (rail.classList.contains("rail4")) rail.classList.toggle("is-shown", window.scrollY > window.innerHeight * 0.5);
    else if (window.scrollY < 40 || secs[0] && secs[0].getBoundingClientRect().top > y) links.forEach(function (a) { a.classList.remove("is-on"); });
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { tlUpdate(); railUpdate(); ticking = false; });
  }, { passive: true });
  tlUpdate(); railUpdate();
})();
