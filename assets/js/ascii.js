/* ==========================================================================
   Maxbond — ASCII dot-matrix art
   --------------------------------------------------------------------------
   Renders a scene into any <canvas class="ascii" data-ascii="NAME">.
   Scenes: earth · website · mobile · chatbot · custom

   How it works: each scene is drawn in greyscale onto a small offscreen
   canvas (one pixel ≈ one character cell). Darkness becomes character
   density, then the grid is drawn as text and gently animated (shimmer,
   light sweep, pointer glow). Colours come from CSS: --ascii-ink (glyphs)
   and --ascii-hl (lime highlight blocks behind the densest cells).

   Optional attributes:
     data-cell="6.5x9"   character cell size in CSS px (width x height)
     data-stars          twinkling stars in the empty background
   ========================================================================== */
(function () {
  'use strict';

  var canvases = document.querySelectorAll('canvas[data-ascii]');
  if (!canvases.length || !document.createElement('canvas').getContext) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Density ramp, light → heavy. The heaviest level picks from DENSE.
  var RAMP = [' ', '.', '.', ':', ':', '+', 'o', 'o', '0', '0'];
  var DENSE = ['0', '1', '0', '8', '0', '1'];
  var SCRAMBLE = ['0', '1', '+', '*', '#', '%', '/', '<', '>'];
  var TOP = RAMP.length - 1;

  /* ---------- helpers ---------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  // density (0 = empty, 1 = full) → grey colour
  function g(v) {
    var c = Math.round(255 * (1 - Math.max(0, Math.min(1, v))));
    return 'rgb(' + c + ',' + c + ',' + c + ')';
  }
  function lin(ctx, x0, y0, x1, y1, v0, v1) {
    var gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, g(v0));
    gr.addColorStop(1, g(v1));
    return gr;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  function gearPath(ctx, cx, cy, r, teeth, depth) {
    var step = (Math.PI * 2) / teeth;
    ctx.beginPath();
    for (var i = 0; i < teeth; i++) {
      var a = i * step;
      var pts = [
        [a - step * 0.3, r],
        [a - step * 0.17, r + depth],
        [a + step * 0.17, r + depth],
        [a + step * 0.3, r],
      ];
      for (var k = 0; k < pts.length; k++) {
        var px = cx + Math.cos(pts[k][0]) * pts[k][1];
        var py = cy + Math.sin(pts[k][0]) * pts[k][1];
        if (i === 0 && k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.arc(cx, cy, r, a + step * 0.3, a + step * 0.7);
    }
    ctx.closePath();
  }

  function unit(x, y, z) {
    var l = Math.sqrt(x * x + y * y + z * z);
    return [x / l, y / l, z / l];
  }
  // 3D value noise + fbm (for the procedural planet)
  function h3(x, y, z) {
    var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, z) {
    var xi = Math.floor(x);
    var yi = Math.floor(y);
    var zi = Math.floor(z);
    var xf = x - xi;
    var yf = y - yi;
    var zf = z - zi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var w = zf * zf * (3 - 2 * zf);
    var a = h3(xi, yi, zi);
    var b = h3(xi + 1, yi, zi);
    var c = h3(xi, yi + 1, zi);
    var d = h3(xi + 1, yi + 1, zi);
    var e = h3(xi, yi, zi + 1);
    var f = h3(xi + 1, yi, zi + 1);
    var g2 = h3(xi, yi + 1, zi + 1);
    var h = h3(xi + 1, yi + 1, zi + 1);
    var x1 = a + (b - a) * u;
    var x2 = c + (d - c) * u;
    var x3 = e + (f - e) * u;
    var x4 = g2 + (h - g2) * u;
    var y1 = x1 + (x2 - x1) * v;
    var y2 = x3 + (x4 - x3) * v;
    return y1 + (y2 - y1) * w;
  }
  function fbm(x, y, z) {
    return vnoise(x, y, z) * 0.55 + vnoise(x * 2.03, y * 2.03, z * 2.03) * 0.3 + vnoise(x * 4.1, y * 4.1, z * 4.1) * 0.15;
  }

  /* ---------- scenes ----------
     Each scene is drawn inside its own design box [w, h], scaled to fit.
     main()   → greyscale density
     accent() → optional mask: cells drawn in the accent colour
     Dynamic scenes instead provide setup(art) + update(art, time), which
     write densities straight into art.dens / art.isAcc every frame.     */
  var SCENES = {
    // Night scene: a slowly spinning Earth above rolling ocean waves.
    // Computed procedurally every frame (no drawing pass).
    earth: {
      dynamic: true,
      stars: true,
      cell: [6, 8.4],
      setup: function (a) {
        var W = a.w;
        var H = a.h;
        var hz = Math.round(H * 0.7); // horizon
        var R = Math.min(H * 0.43, W * 0.3);
        var cx = W / 2;
        var cy = hz - R * 0.42;
        var L = unit(-0.55, -0.55, 0.63); // light from top-left
        var Hv = unit(L[0], L[1], L[2] + 1);
        var gI = [];
        var gN = [];
        var aI = [];
        var aV = [];
        var sI = [];
        var sP = [];
        for (var y = 0; y < a.rows; y++) {
          for (var x = 0; x < a.cols; x++) {
            var i = y * a.cols + x;
            var px = a.ox + (x + 0.5) * a.cw;
            var py = a.oy + (y + 0.5) * a.ch;
            if (py >= hz) {
              sI.push(i);
              sP.push(px, py);
              a.star[i] = 0;
              continue;
            }
            var dx = (px - cx) / R;
            var dy = (py - cy) / R;
            var r2 = dx * dx + dy * dy;
            if (r2 <= 1) {
              var nz = Math.sqrt(1 - r2);
              var lam = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
              var spec = Math.pow(Math.max(0, dx * Hv[0] + dy * Hv[1] + nz * Hv[2]), 70);
              gI.push(i);
              gN.push(dx, dy, nz, lam, spec);
              a.star[i] = 0;
            } else if (r2 < 1.26) {
              var rr2 = Math.sqrt(r2);
              aI.push(i);
              aV.push(Math.pow(1 - (rr2 - 1) / 0.123, 2) * 0.42);
              a.star[i] = 0;
            }
          }
        }
        a.E = {
          H: H,
          hz: hz,
          R: R,
          cx: cx,
          gI: Int32Array.from(gI),
          gN: Float32Array.from(gN),
          aI: Int32Array.from(aI),
          aV: Float32Array.from(aV),
          sI: Int32Array.from(sI),
          sP: Float32Array.from(sP),
        };
      },
      update: function (a, t) {
        var E = a.E;
        var d = a.dens;
        var acc = a.isAcc;
        d.fill(0);
        acc.fill(0);

        // Globe
        var spin = 2.4 + t * 0.00018;
        var cs = Math.cos(spin);
        var sn = Math.sin(spin);
        var tilt = 0.4;
        var ct = Math.cos(tilt);
        var st = Math.sin(tilt);
        var gI = E.gI;
        var gN = E.gN;
        for (var k = 0, m = 0; k < gI.length; k++, m += 5) {
          var i = gI[k];
          var nx = gN[m];
          var ny = gN[m + 1];
          var nz = gN[m + 2];
          var lam = gN[m + 3];
          var spec = gN[m + 4];
          var x1 = nx * ct + ny * st;
          var y1 = -nx * st + ny * ct;
          var x2 = x1 * cs + nz * sn;
          var z2 = -x1 * sn + nz * cs;
          var n = fbm(x2 * 1.7 + 7.3, y1 * 1.7 + 3.1, z2 * 1.7 + 5.7);
          var land = n > 0.53;
          var v = land ? 0.62 + (n - 0.53) * 2.2 : 0.2 + (n - 0.4) * 0.3;
          v *= 0.22 + 0.78 * lam;
          v += Math.pow(1 - nz, 2) * 0.45; // atmospheric rim
          if (land && lam > 0.3) acc[i] = 1; // lit continents in lime
          if (Math.abs(y1) > 0.9) {
            v = Math.max(v, (0.3 + 0.7 * lam) * 0.85); // polar ice
            acc[i] = 1;
          }
          if (!land && spec > 0.75) {
            v = Math.max(v, spec); // sun glint on the ocean
            acc[i] = 1;
          }
          d[i] = v > 1 ? 1 : v < 0 ? 0 : v;
        }

        // Atmosphere glow
        var pulse = 0.85 + 0.15 * Math.sin(t * 0.0018);
        for (var q = 0; q < E.aI.length; q++) d[E.aI[q]] = E.aV[q] * pulse;

        // Ocean: horizon, moonlit reflection, four layers of wave crests
        var hz = E.hz;
        var depth = E.H - hz;
        var chh = a.ch;
        var sI = E.sI;
        var sP = E.sP;
        for (var s = 0, p = 0; s < sI.length; s++, p += 2) {
          var j0 = sI[s];
          var px = sP[p];
          var py = sP[p + 1];
          var u = (py - hz) / depth;
          var w = 0.02 + 0.08 * u;
          var wob = Math.sin(py * 0.21 + t * 0.003) * 7 * (0.4 + u);
          var rx = (px + wob - E.cx) / (E.R * (0.55 + u * 0.5));
          if (rx > -1 && rx < 1) {
            w += (1 - rx * rx) * (0.42 - u * 0.25) * (0.55 + 0.45 * Math.sin(px * 0.3 + py * 0.5 + t * 0.006));
          }
          for (var L2 = 0; L2 < 5; L2++) {
            var base = hz + depth * (0.08 + L2 * 0.2);
            var amp = 3 + L2 * 4.2;
            var f = 0.017 - L2 * 0.0022;
            var sp = 0.001 + L2 * 0.00035;
            var h = base + amp * Math.sin(px * f + t * sp + L2 * 1.9) + amp * 0.45 * Math.sin(px * f * 2.6 - t * sp * 1.4 + L2);
            var dist = py - h;
            if (dist > -chh * 0.5 && dist < chh * 0.5) {
              var crest = 0.3 + L2 * 0.1;
              if (crest > w) w = crest;
              if (Math.abs(dist) < chh * 0.3 && Math.sin(px * 0.035 + t * 0.0016 * (L2 + 1) + L2 * 2.1) > 0.9) {
                w = 0.95; // foam
                acc[j0] = 1;
              }
            }
          }
          if (py - hz < chh) w = Math.max(w, 0.32);
          d[j0] = w > 1 ? 1 : w;
        }
      },
    },

    // A solid browser window; the UI is cut out as negative space.
    website: {
      box: [400, 280],
      fit: 0.94,
      halo: 10,
      main: function (c) {
        rr(c, 10, 10, 380, 260, 22);
        c.fillStyle = lin(c, 10, 10, 390, 270, 0.95, 0.45);
        c.fill();
        c.fillStyle = g(0);
        [44, 70, 96].forEach(function (x) {
          circle(c, x, 36, 8);
          c.fill();
        });
        rr(c, 124, 25, 236, 22, 11);
        c.fill();
        rr(c, 36, 74, 328, 104, 12);
        c.fill();
        c.fillStyle = g(0.95);
        c.fillRect(62, 98, 184, 16);
        c.fillStyle = g(0.7);
        c.fillRect(62, 126, 126, 10);
        rr(c, 62, 148, 70, 16, 5);
        c.fillStyle = g(1);
        c.fill();
        [36, 150, 264].forEach(function (x) {
          rr(c, x, 194, 100, 52, 9);
          c.fillStyle = g(0);
          c.fill();
          c.fillStyle = g(0.75);
          c.fillRect(x + 14, 210, 56, 7);
          c.fillRect(x + 14, 225, 36, 7);
        });
      },
      accent: function (c) {
        c.fillStyle = g(1);
        c.fillRect(62, 98, 184, 16);
        rr(c, 62, 148, 70, 16, 5);
        c.fill();
      },
    },

    // Two phones: one tilted behind, one solid phone in front.
    mobile: {
      box: [320, 300],
      fit: 0.96,
      halo: 10,
      main: function (c) {
        c.save();
        c.translate(220, 158);
        c.rotate(0.22);
        rr(c, -64, -124, 128, 248, 26);
        c.fillStyle = lin(c, -64, -124, 64, 124, 0.62, 0.22);
        c.fill();
        rr(c, -50, -102, 100, 196, 12);
        c.fillStyle = g(0.1);
        c.fill();
        c.fillStyle = g(0.45);
        c.fillRect(-36, -86, 72, 30);
        c.fillRect(-36, -40, 56, 8);
        c.fillRect(-36, -22, 40, 8);
        c.restore();

        rr(c, 70, 14, 150, 272, 30);
        c.fillStyle = lin(c, 70, 14, 220, 286, 0.98, 0.55);
        c.fill();
        rr(c, 88, 48, 114, 210, 12);
        c.fillStyle = g(0);
        c.fill();
        rr(c, 124, 26, 42, 10, 5);
        c.fill();
        rr(c, 98, 60, 94, 56, 9);
        c.fillStyle = lin(c, 98, 60, 192, 116, 0.95, 0.6);
        c.fill();
        [126, 162, 198].forEach(function (y, i) {
          circle(c, 110, y + 13, 8);
          c.fillStyle = g(0.85);
          c.fill();
          c.fillStyle = g(0.85);
          c.fillRect(126, y + 5, 60 - i * 10, 8);
          c.fillStyle = g(0.55);
          c.fillRect(126, y + 18, 40, 6);
        });
        rr(c, 124, 270, 42, 7, 3.5);
        c.fillStyle = g(0);
        c.fill();
      },
      accent: function (c) {
        c.fillStyle = g(1);
        [126, 162, 198].forEach(function (y) {
          circle(c, 110, y + 13, 8);
          c.fill();
        });
      },
    },

    // A dense chat bubble with typing dots and a lighter reply.
    chatbot: {
      box: [360, 290],
      fit: 0.96,
      halo: 10,
      main: function (c) {
        rr(c, 18, 24, 250, 152, 44);
        c.fillStyle = lin(c, 18, 24, 268, 176, 0.95, 0.55);
        c.fill();
        c.beginPath();
        c.moveTo(62, 160);
        c.lineTo(120, 170);
        c.lineTo(38, 228);
        c.closePath();
        c.fillStyle = g(0.8);
        c.fill();
        c.fillStyle = g(0);
        [92, 143, 194].forEach(function (x) {
          circle(c, x, 100, 17);
          c.fill();
        });
        rr(c, 186, 168, 156, 84, 30);
        c.fillStyle = g(0);
        c.fill();
        c.lineWidth = 9;
        c.strokeStyle = g(0.55);
        c.stroke();
        c.fillStyle = g(0.9);
        c.fillRect(214, 194, 96, 9);
        c.fillRect(214, 216, 62, 9);
      },
      accent: function (c) {
        c.fillStyle = g(1);
        c.fillRect(214, 194, 96, 9);
        c.fillRect(214, 216, 62, 9);
      },
    },

    // A big gear, a small gear and integration nodes.
    custom: {
      box: [360, 290],
      fit: 0.96,
      halo: 10,
      main: function (c) {
        c.lineWidth = 7;
        c.strokeStyle = g(0.6);
        c.beginPath();
        c.moveTo(150, 150);
        c.lineTo(300, 236);
        c.moveTo(150, 150);
        c.lineTo(318, 160);
        c.stroke();

        gearPath(c, 270, 72, 40, 7, 16);
        c.fillStyle = lin(c, 230, 30, 310, 110, 0.55, 0.3);
        c.fill();
        circle(c, 270, 72, 15);
        c.fillStyle = g(0);
        c.fill();

        gearPath(c, 140, 150, 92, 9, 24);
        c.fillStyle = lin(c, 48, 58, 232, 242, 0.98, 0.5);
        c.fill();
        circle(c, 140, 150, 40);
        c.fillStyle = g(0);
        c.fill();
        c.lineWidth = 10;
        c.strokeStyle = g(1);
        c.stroke();

        [[318, 160], [300, 236]].forEach(function (p) {
          circle(c, p[0], p[1], 17);
          c.fillStyle = g(0.95);
          c.fill();
        });
      },
      accent: function (c) {
        circle(c, 140, 150, 40);
        c.lineWidth = 12;
        c.strokeStyle = g(1);
        c.stroke();
        c.fillStyle = g(1);
        [[318, 160], [300, 236]].forEach(function (p) {
          circle(c, p[0], p[1], 18);
          c.fill();
        });
      },
    },
  };

  /* ---------- renderer ---------- */
  var SS = 2; // supersampling for the density map

  function Art(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.name = canvas.getAttribute('data-ascii');
    this.scene = SCENES[this.name] || SCENES.earth;
    var cell = canvas.getAttribute('data-cell');
    var c = cell ? cell.split('x').map(Number) : this.scene.cell || [4.8, 6.6];
    this.cw = c[0];
    this.ch = c[1];
    this.font = '700 ' + Math.round(this.ch * 1.02) + 'px "Space Mono", ui-monospace, Menlo, Consolas, monospace';
    this.w = 0;
    this.h = 0;
    this.visible = false;
    this.started = 0;
    this.last = 0;
    this.pointer = null;
  }

  Art.prototype.sceneLayer = function (draw, W, H, fit) {
    var cols = this.cols;
    var rows = this.rows;
    var s = this.scene;
    var layer = document.createElement('canvas');
    layer.width = cols * SS;
    layer.height = rows * SS;
    var c = layer.getContext('2d');
    c.fillStyle = '#fff';
    c.fillRect(0, 0, layer.width, layer.height);
    // CSS px → layer px
    var sx = layer.width / W;
    var sy = layer.height / H;
    var k = Math.min((W * fit) / s.box[0], (H * fit) / s.box[1]);
    c.setTransform(sx * k, 0, 0, sy * k, sx * ((W - s.box[0] * k) / 2), sy * ((H - s.box[1] * k) / 2));
    draw(c);
    this.k = k;
    return layer;
  };

  Art.prototype.readDensity = function (layer, haloPx) {
    var cols = this.cols;
    var rows = this.rows;
    var out = document.createElement('canvas');
    out.width = layer.width;
    out.height = layer.height;
    var o = out.getContext('2d', { willReadFrequently: true });
    o.fillStyle = '#fff';
    o.fillRect(0, 0, out.width, out.height);
    if (haloPx && 'filter' in o) {
      o.filter = 'blur(' + haloPx + 'px)';
      o.globalAlpha = 0.55;
      o.drawImage(layer, 0, 0);
      o.filter = 'none';
      o.globalAlpha = 1;
      o.globalCompositeOperation = 'multiply';
    }
    o.drawImage(layer, 0, 0);
    var px = o.getImageData(0, 0, out.width, out.height).data;
    var d = new Float32Array(cols * rows);
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var sum = 0;
        for (var j = 0; j < SS; j++) {
          for (var i = 0; i < SS; i++) {
            sum += px[((y * SS + j) * out.width + (x * SS + i)) * 4];
          }
        }
        d[y * cols + x] = 1 - sum / (SS * SS * 255);
      }
    }
    return d;
  };

  Art.prototype.build = function () {
    var rect = this.canvas.getBoundingClientRect();
    var W = Math.round(rect.width);
    var H = Math.round(rect.height);
    if (!W || !H || (W === this.w && H === this.h)) return false;
    this.w = W;
    this.h = H;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cols = (this.cols = Math.max(1, Math.floor(W / this.cw)));
    var rows = (this.rows = Math.max(1, Math.floor(H / this.ch)));
    this.ox = (W - cols * this.cw) / 2;
    this.oy = (H - rows * this.ch) / 2;
    var n = cols * rows;
    var s = this.scene;
    var fit = s.fit || 0.9;

    var rand = rng(hash(this.name));
    var seed = new Float32Array(n);
    var pick = new Float32Array(n);
    for (var q = 0; q < n; q++) {
      seed[q] = rand();
      pick[q] = rand();
    }
    var dens = new Float32Array(n);
    var isAcc = new Uint8Array(n);

    if (!s.dynamic) {
      var main = this.sceneLayer(s.main, W, H, fit);
      var haloPx = s.halo ? s.halo * this.k * ((cols * SS) / W) : 0;
      var raw = this.readDensity(main, haloPx);
      var acc = s.accent ? this.readDensity(this.sceneLayer(s.accent, W, H, fit), 0) : null;
      for (var i = 0; i < n; i++) {
        var d = raw[i] * (0.86 + 0.28 * seed[i]); // grain
        if (d < 0.16 && pick[i] < 0.45) d = 0; // dissolve faint edges into dots
        dens[i] = d < 0.05 ? 0 : Math.min(1, d);
        isAcc[i] = acc && acc[i] > 0.5 ? 1 : 0;
      }
    }

    // Twinkling stars in empty cells (value = twinkle speed, 0 = none)
    var star = new Float32Array(n);
    if (s.stars || this.canvas.hasAttribute('data-stars')) {
      for (var k = 0; k < n; k++) if (rand() < 0.016) star[k] = 0.5 + rand() * 6;
    }

    this.dens = dens;
    this.seed = seed;
    this.pick = pick;
    this.isAcc = isAcc;
    this.star = star;
    this.jit = new Float32Array(n);
    if (s.dynamic) s.setup(this);

    var cs = getComputedStyle(this.canvas);
    this.ink = cs.getPropertyValue('--ascii-ink').trim() || '#0a0a0a';
    this.hl = cs.getPropertyValue('--ascii-hl').trim() || '#ccff4d';
    return true;
  };

  Art.prototype.draw = function (t, animate) {
    var ctx = this.ctx;
    var cols = this.cols;
    var rows = this.rows;
    var cw = this.cw;
    var chh = this.ch;
    var dens = this.dens;
    var seed = this.seed;
    var pick = this.pick;
    var jit = this.jit;
    var isAcc = this.isAcc;
    var star = this.star;
    var dyn = !!this.scene.dynamic;
    var n = cols * rows;

    if (dyn) this.scene.update(this, animate ? t : 0);

    ctx.clearRect(0, 0, this.w, this.h);
    ctx.font = this.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var intro = 1;
    if (animate) {
      intro = Math.min(1, (t - this.started) / 1400);
      // shimmer: re-roll a few cells each frame
      for (var f = 0, flips = (n * 0.025) | 0; f < flips; f++) {
        jit[(Math.random() * n) | 0] = (Math.random() - 0.5) * 1.6;
      }
    }

    var P = animate ? this.pointer : null;
    var R2 = 90 * 90;
    var lastFill = '';
    var HL = this.scene.hl || 0.8; // density above which a cell gets a lime block
    var ink = this.ink;
    var hlc = this.hl;
    var setFill = function (c) {
      if (c !== lastFill) {
        ctx.fillStyle = c;
        lastFill = c;
      }
    };

    for (var y = 0; y < rows; y++) {
      var gate = intro * 1.45 - (y / rows) * 0.45; // reveal top → bottom
      for (var x = 0; x < cols; x++) {
        var i = y * cols + x;
        var d = dens[i];
        var tw = 0;
        if (d === 0 && star[i]) tw = animate ? 0.1 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.0012 * star[i] + star[i] * 7)) : 0.3;
        var boost = 0;
        if (P) {
          var dx = this.ox + x * cw - P.x;
          var dy = this.oy + y * chh - P.y;
          var q = (dx * dx + dy * dy) / R2;
          if (q < 1) boost = 1 - q;
        }
        if (d === 0 && tw === 0 && boost < 0.45) continue;
        if (seed[i] > gate) continue;

        var v = d;
        if (animate && !dyn) v *= 0.84 + 0.16 * Math.sin(x * 0.05 - y * 0.035 + t * 0.0015);
        v += boost * (d > 0 ? 0.5 : 0.18);
        if (tw > v) v = tw;
        if (v < 0.05) continue;
        if (v > 1) v = 1;
        v = Math.pow(v, 0.72); // lift mid-tones

        var li = (v * TOP + jit[i]) | 0;
        if (li < 1) li = 1;
        if (li > TOP) li = TOP;
        if (tw && d === 0 && li > 5) li = 5;
        var chr = li === TOP ? DENSE[(pick[i] * DENSE.length) | 0] : RAMP[li];
        if (boost > 0.3 && Math.random() < boost * 0.35) chr = SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];

        var px = this.ox + x * cw;
        var py = this.oy + y * chh;
        var isStar = tw && d === 0;
        if (!isStar && (isAcc[i] || v > HL)) {
          // lime "highlighter" block with a dark glyph on top
          setFill(hlc);
          ctx.globalAlpha = 1;
          ctx.fillRect(px + 0.4, py + 0.4, cw - 0.8, chh - 0.8);
          setFill(ink);
          ctx.globalAlpha = 0.88;
        } else {
          setFill(ink);
          ctx.globalAlpha = isStar ? 0.06 + 0.3 * v : 0.1 + 0.8 * v;
        }
        ctx.fillText(chr, px + cw / 2, py + chh / 2 + 0.5);
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- lifecycle ---------- */
  var arts = Array.prototype.map.call(canvases, function (c) {
    return new Art(c);
  });
  var raf = 0;

  function loop(t) {
    raf = 0;
    var any = false;
    arts.forEach(function (a) {
      if (!a.visible || !a.dens) return;
      any = true;
      if (t - a.last > 45) {
        a.draw(t, true);
        a.last = t;
      }
    });
    if (any) raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (!reduceMotion && !raf) raf = requestAnimationFrame(loop);
  }

  function refresh(a) {
    a.build();
    if (reduceMotion && a.dens) a.draw(0, false);
  }

  arts.forEach(function (a) {
    a.build();
    if (reduceMotion && a.dens) a.draw(0, false);
  });

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        arts.forEach(function (a) {
          if (a.canvas === e.target) refresh(a);
        });
      });
    });
    arts.forEach(function (a) {
      ro.observe(a.canvas);
    });
  } else {
    window.addEventListener('resize', function () {
      arts.forEach(refresh);
    });
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          arts.forEach(function (a) {
            if (a.canvas !== e.target) return;
            a.visible = e.isIntersecting;
            if (a.visible && !a.started) a.started = performance.now();
          });
        });
        kick();
      },
      { rootMargin: '80px' }
    );
    arts.forEach(function (a) {
      io.observe(a.canvas);
    });
  } else if (!reduceMotion) {
    arts.forEach(function (a) {
      a.visible = true;
      a.started = performance.now();
    });
    kick();
  }

  // Pointer glow (mouse / pen only)
  if (!reduceMotion) {
    window.addEventListener(
      'pointermove',
      function (e) {
        if (e.pointerType === 'touch') return;
        arts.forEach(function (a) {
          if (!a.visible) return;
          var r = a.canvas.getBoundingClientRect();
          var x = e.clientX - r.left;
          var y = e.clientY - r.top;
          a.pointer = x > -60 && y > -60 && x < r.width + 60 && y < r.height + 60 ? { x: x, y: y } : null;
        });
      },
      { passive: true }
    );
    document.addEventListener('pointerleave', function () {
      arts.forEach(function (a) {
        a.pointer = null;
      });
    });
  }

  // Small public hook (handy for debugging / screenshots).
  window.MaxbondAscii = {
    arts: arts,
    redraw: function () {
      arts.forEach(function (a) {
        a.build();
        if (a.dens) a.draw(0, false);
      });
    },
  };

  // Redraw once web fonts are in (static mode only; animated mode redraws anyway).
  if (document.fonts && document.fonts.ready && reduceMotion) {
    document.fonts.ready.then(function () {
      arts.forEach(function (a) {
        if (a.dens) a.draw(0, false);
      });
    });
  }
})();

/* ==========================================================================
   ASCII icons
   --------------------------------------------------------------------------
   <img class="ico" data-ascii-icon="NAME" src="…pixel icon…"> is swapped for
   a canvas that redraws the same pixel map as characters: outline pixels
   become dark glyphs, lime pixels become lime blocks, white fill becomes
   faint dots. Without JavaScript the pixel icon simply stays.
   Maps come from assets/js/icon-art.js (generated by tools/pixel-art.mjs).
   ========================================================================== */
(function () {
  'use strict';

  var MAPS = window.MAXBOND_ICON_ART;
  var imgs = document.querySelectorAll('img[data-ascii-icon]');
  if (!MAPS || !imgs.length || !document.createElement('canvas').getContext) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INK = ['0', '0', '1', '0', '0', '1'];
  var root = getComputedStyle(document.documentElement);
  var inkColor = root.getPropertyValue('--ascii-ink').trim() || '#0a0a0a';
  var hlColor = root.getPropertyValue('--ascii-hl').trim() || '#ccff4d';

  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function draw(icon, scramble) {
    var c = icon.canvas;
    var map = icon.map;
    var rect = c.getBoundingClientRect();
    var W = rect.width;
    var H = rect.height;
    if (!W || !H) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(W * dpr)) c.width = Math.round(W * dpr);
    if (c.height !== Math.round(H * dpr)) c.height = Math.round(H * dpr);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var rows = map.length;
    var cols = map[0].length;
    var cell = Math.min(W / cols, H / rows);
    var ox = (W - cell * cols) / 2;
    var oy = (H - cell * rows) / 2;
    ctx.font = '700 ' + (cell * 1.3).toFixed(1) + 'px "Space Mono", ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var rand = rng(icon.seed);

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var p = map[y].charAt(x);
        if (p === '.') continue;
        var r = scramble ? Math.random() : rand();
        var cx = ox + (x + 0.5) * cell;
        var cy = oy + (y + 0.5) * cell + 0.4;
        if (p === '+') {
          ctx.globalAlpha = 1;
          ctx.fillStyle = hlColor;
          ctx.fillRect(ox + x * cell + 0.3, oy + y * cell + 0.3, cell - 0.6, cell - 0.6);
          ctx.fillStyle = inkColor;
          ctx.globalAlpha = 0.5;
          ctx.fillText(r < 0.5 ? '+' : ':', cx, cy);
        } else if (p === '#') {
          ctx.fillStyle = inkColor;
          ctx.globalAlpha = 1;
          ctx.fillText(INK[(r * INK.length) | 0], cx, cy);
        } else {
          // 'w' (white fill) / 'g' (grey detail) → sparse faint dots
          if (p === 'w' && (x + y) % 2) continue;
          ctx.fillStyle = inkColor;
          ctx.globalAlpha = p === 'g' ? 0.45 : 0.22;
          ctx.fillText(p === 'g' ? ':' : '.', cx, cy);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  var icons = [];
  Array.prototype.forEach.call(imgs, function (img, i) {
    var name = img.getAttribute('data-ascii-icon');
    var map = MAPS[name];
    if (!map) return;
    var c = document.createElement('canvas');
    c.className = (img.getAttribute('class') || '') + ' ascii-icon';
    var alt = img.getAttribute('alt');
    if (alt) {
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', alt);
    } else {
      c.setAttribute('aria-hidden', 'true');
    }
    img.parentNode.replaceChild(c, img);
    icons.push({ canvas: c, map: map, seed: i * 7919 + name.length });
  });

  function drawAll() {
    icons.forEach(function (ic) {
      draw(ic, false);
    });
  }
  drawAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);

  // Redraw when an icon changes size or becomes visible (e.g. a tab panel).
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) {
        icons.forEach(function (ic) {
          if (ic.canvas === e.target) draw(ic, false);
        });
      });
    });
    icons.forEach(function (ic) {
      ro.observe(ic.canvas);
    });
  } else {
    window.addEventListener('resize', drawAll);
  }

  // A tiny glitch when the surrounding card is hovered.
  if (!reduceMotion) {
    icons.forEach(function (ic) {
      var host = ic.canvas.closest('.card, .step, .why-item, .plan, .consult') || ic.canvas;
      var busy = false;
      host.addEventListener('pointerenter', function () {
        if (busy) return;
        busy = true;
        var n = 0;
        var tick = function () {
          if (n++ < 5) {
            draw(ic, true);
            setTimeout(tick, 55);
          } else {
            draw(ic, false);
            busy = false;
          }
        };
        tick();
      });
    });
  }
})();
