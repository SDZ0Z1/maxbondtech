#!/usr/bin/env node
/**
 * Maxbond pixel-art generator
 * ---------------------------------------------------------------
 * Generates every pixel graphic used on the site from the ASCII
 * maps below: logo, favicon, icons and the 404 digits.
 * (The hero / service visuals are ASCII art, see assets/js/ascii.js.)
 *
 * Usage (optional — the generated files are already committed):
 *   node tools/pixel-art.mjs
 *
 * Pixel legend:
 *   #  ink   (near black)
 *   +  lime  (brand accent)
 *   w  white (fill)
 *   g  grey  (UI detail)
 *   .  transparent
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(ROOT, 'assets', 'img');
const ICONS = join(IMG, 'icons');

const COLORS = { '#': '#0a0a0a', '+': '#ccff4d', w: '#ffffff', g: '#d9d9d9' };

/* ------------------------------------------------------------ */
/* Helpers                                                       */
/* ------------------------------------------------------------ */
const parse = (art) =>
  art
    .trim()
    .split('\n')
    .map((l) => l.trim());

function check(name, rows, w, h) {
  if (h && rows.length !== h) throw new Error(`${name}: expected ${h} rows, got ${rows.length}`);
  rows.forEach((r, i) => {
    if (w && r.length !== w) throw new Error(`${name}: row ${i} is ${r.length} wide, expected ${w} → "${r}"`);
  });
}

/** Merge horizontal runs of the same colour into single <rect>s. */
function rowRects(row, y, x0 = 0, y0 = 0) {
  let out = '';
  let x = 0;
  while (x < row.length) {
    const ch = row[x];
    if (ch === '.') {
      x++;
      continue;
    }
    let len = 1;
    while (x + len < row.length && row[x + len] === ch) len++;
    const fill = COLORS[ch];
    if (!fill) throw new Error(`Unknown pixel "${ch}"`);
    // Height 1.06 overlaps the next row slightly, hiding hairline seams when
    // the SVG is scaled to a non-integer size.
    out += `<rect x="${x0 + x}" y="${y0 + y}" width="${len}" height="1.06" fill="${fill}"/>`;
    x += len;
  }
  return out;
}

const rectsFor = (rows, x0 = 0, y0 = 0) => rows.map((r, y) => rowRects(r, y, x0, y0)).join('');

const svg = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges"${extra}>${body}</svg>\n`;

/* ------------------------------------------------------------ */
/* Brand mark + wordmark                                         */
/* ------------------------------------------------------------ */
// Two overlapping squares — the "bond". The overlap is lime.
const MARK = `
#######...
#wwwww#...
#wwwww#...
#ww#######
#ww#++#ww#
#ww#++#ww#
#######ww#
...#wwwww#
...#wwwww#
...#######
`;

const LETTERS = {
  M: `
##...##
###.###
##.#.##
##...##
##...##
##...##
##...##`,
  A: `
.####.
##..##
##..##
######
##..##
##..##
##..##`,
  X: `
##..##
##..##
.####.
..##..
.####.
##..##
##..##`,
  B: `
#####.
##..##
##..##
#####.
##..##
##..##
#####.`,
  O: `
.####.
##..##
##..##
##..##
##..##
##..##
.####.`,
  N: `
##..##
###.##
######
##.###
##..##
##..##
##..##`,
  D: `
#####.
##..##
##..##
##..##
##..##
##..##
#####.`,
  4: `
##..##
##..##
##..##
######
....##
....##
....##`,
  0: `
.####.
##..##
##..##
##..##
##..##
##..##
.####.`,
};

function word(text, gap = 1) {
  const glyphs = [...text].map((ch) => parse(LETTERS[ch]));
  const h = 7;
  const width = glyphs.reduce((s, g) => s + g[0].length, 0) + gap * (glyphs.length - 1);
  const rows = Array.from({ length: h }, () => '');
  glyphs.forEach((g, i) => {
    for (let y = 0; y < h; y++) rows[y] += g[y] + (i < glyphs.length - 1 ? '.'.repeat(gap) : '');
  });
  return { rows, width, height: h };
}

/* ------------------------------------------------------------ */
/* Max — the chat assistant (16×16): a lime speech bubble with   */
/* eyes, layered over a white bubble.                            */
/* ------------------------------------------------------------ */
const MAX = `
................
..########......
.#wwwwwwww#.....
.#wwwwwwww#.....
.#www##########.
.#ww#+w++++++++#
.#ww#++++++++++#
.#ww#+++#++#+++#
.#ww#+++#++#+++#
..###++++++++++#
....#++++++++++#
....#++++++++++#
.....#######++#.
............#++#
.............###
................`;

/* ------------------------------------------------------------ */
/* Icons (12×12)                                                 */
/* ------------------------------------------------------------ */
const ICON_ART = {
  browser: `
.##########.
#wwwwwwwwww#
#w#w#w#wwww#
############
#wwwwwwwwww#
#w++++++www#
#w++++++www#
#wwwwwwwwww#
#w####w###w#
#wwwwwwwwww#
#w#####wwww#
.##########.`,
  phone: `
..########..
..#ww##ww#..
..#wwwwww#..
..#++++++#..
..#++++++#..
..#wwwwww#..
..#w####w#..
..#wwwwww#..
..#w###ww#..
..#wwwwww#..
..#ww##ww#..
..########..`,
  bot: `
....####....
....#++#....
....####....
.....##.....
.##########.
#wwwwwwwwww#
#w##wwww##w#
#w##wwww##w#
#wwwwwwwwww#
#www####www#
#wwwwwwwwww#
.##########.`,
  gear: `
....####....
.##.#++#.##.
.#+##++##+#.
..#++++++#..
###++##++###
#+++#ww#+++#
#+++#ww#+++#
###++##++###
..#++++++#..
.#+##++##+#.
.##.#++#.##.
....####....`,
  pin: `
............
...######...
..#++++++#..
.#++####++#.
.#++#ww#++#.
.#++#ww#++#.
.#++####++#.
..#++++++#..
...#++++#...
....#++#....
.....##.....
............`,
  bond: `
########....
#wwwwww#....
#wwwwww#....
#wwwwww#....
#www########
#www#++#www#
#www#++#www#
########www#
....#wwwwww#
....#wwwwww#
....#wwwwww#
....########`,
  bolt: `
....#####...
....#+++#...
...#+++#....
..#+++#.....
.#+++######.
.#++++++++#.
.######++#..
.....#++#...
....#++#....
...#++#.....
..#+#.......
..##........`,
  heart: `
............
.###....###.
#+++#..#+++#
#++++##++++#
#++++++++++#
#++++++++++#
.#++++++++#.
..#++++++#..
...#++++#...
....#++#....
.....##.....
............`,
  search: `
..####......
.#++++#.....
#++++++#....
#+ww+++#....
#+w++++#....
#++++++#....
.#++++##....
..######....
......###...
.......###..
........###.
.........##.`,
  pencil: `
.........#..
........###.
.......#ww##
......#+#w#.
.....#+++#..
....#+++#...
...#+++#....
..#+++#.....
.#ww+#......
.#w##.......
.##.........
............`,
  code: `
.##########.
#++++++++++#
############
#wwwwwwwwww#
#w#wwwwwwww#
#ww#wwwwwww#
#www#wwwwww#
#ww#wwwwwww#
#w#ww####ww#
#wwwwwwwwww#
#wwwwwwwwww#
.##########.`,
  rocket: `
.....##.....
....#ww#....
...#wwww#...
...#w##w#...
...#w##w#...
...#wwww#...
..##wwww##..
.#w#wwww#w#.
.#w######w#.
.####++####.
....#++#....
.....##.....`,
  headset: `
...######...
..##....##..
.##......##.
.#........#.
####....####
#++#....#++#
#++#....#++#
####....####
..........#.
.........##.
......####..
......###...`,
  cart: `
##..........
.#..........
.##########.
..#+++++++#.
..#+++++++#.
...#+++++#..
...#######..
...#........
...########.
....##..##..
....##..##..
............`,
  chart: `
............
........###.
........#+#.
....###.#+#.
....#+#.#+#.
....#+#.#+#.
###.#+#.#+#.
#+#.#+#.#+#.
#+#.#+#.#+#.
#+#.#+#.#+#.
############
............`,
  lock: `
...######...
..#wwwwww#..
..#w####w#..
..#w#..#w#..
..#w#..#w#..
############
#++++++++++#
#++++##++++#
#++++##++++#
#++++##++++#
#++++++++++#
############`,
  cloud: `
............
............
.....###....
....#www#...
..###wwww##.
.#wwwwwwwww#
#wwwwwwwwww#
#wwwwwwwwww#
#wwwwwwwwww#
.##########.
............
............`,
  bell: `
.....##.....
....####....
...#wwww#...
..#wwwwww#..
..#wwwwww#..
..#wwwwww#..
..#wwwwww#..
.#wwwwwwww#.
############
....#++#....
.....##.....
............`,
  card: `
............
............
############
#wwwwwwwwww#
############
#wwwwwwwwww#
#w####wwwww#
#w#++#w###w#
#w####wwwww#
#wwwwwwwwww#
############
............`,
  database: `
..########..
.#++++++++#.
#++++++++++#
############
#wwwwwwwwww#
############
#wwwwwwwwww#
############
#wwwwwwwwww#
.#wwwwwwww#.
..########..
............`,
  globe: `
...######...
.##++##++##.
.#+++##+++#.
############
#++++##++++#
#++++##++++#
#++++##++++#
#++++##++++#
############
.#+++##+++#.
.##++##++##.
...######...`,
  chat: `
............
.##########.
#++++++++++#
#++++++++++#
#+##+##+##+#
#+##+##+##+#
#++++++++++#
#++++++++++#
.##+#######.
..#+#.......
..##........
............`,
  users: `
............
..##....##..
.#ww#..#++#.
.#ww#..#++#.
..##....##..
............
.####..####.
#wwww##++++#
#wwww##++++#
#wwww##++++#
############
............`,
  clock: `
...######...
.##wwwwww##.
.#wwwwwwww#.
#wwwww#wwww#
#wwwww#wwww#
#wwwww#wwww#
#wwwww####w#
#wwwwwwwwww#
#wwwwwwwwww#
.#wwwwwwww#.
.##wwwwww##.
...######...`,
  calendar: `
..##....##..
############
#++++++++++#
############
#wwwwwwwwww#
#w##w##w##w#
#wwwwwwwwww#
#w##w##w##w#
#wwwwwwwwww#
#w##w##wwww#
#wwwwwwwwww#
############`,
  box: `
............
############
#++++##++++#
#++++##++++#
############
.#wwwwwwww#.
.#wwwwwwww#.
.#ww####ww#.
.#wwwwwwww#.
.#wwwwwwww#.
.##########.
............`,
  plug: `
...##..##...
...##..##...
..########..
..#++++++#..
..#++++++#..
..#++++++#..
...#++++#...
....####....
.....##.....
.....##.....
.....##.....
.....##.....`,
  bulb: `
...######...
..#++++++#..
.#++w+++++#.
.#+w++++++#.
.#++++++++#.
.#++++++++#.
..#++++++#..
...#++++#...
...######...
...#wwww#...
...######...
....####....`,
  mail: `
............
............
############
##wwwwwwww##
#w#wwwwww#w#
#ww#wwww#ww#
#www####www#
#wwwwwwwwww#
#wwwwwwwwww#
############
............
............`,
  layout: `
############
#wwwwwwwwww#
#w++++++++w#
#w++++++++w#
#wwwwwwwwww#
#w###ww###w#
#w#w#ww#w#w#
#w###ww###w#
#wwwwwwwwww#
#w########w#
#wwwwwwwwww#
############`,
};

/* ------------------------------------------------------------ */
/* Write files                                                   */
/* ------------------------------------------------------------ */
mkdirSync(ICONS, { recursive: true });

// Mark
const markRows = parse(MARK);
check('mark', markRows, 10, 10);
writeFileSync(join(IMG, 'mark.svg'), svg(10, 10, rectsFor(markRows)));

// Logo = mark + wordmark
const wm = word('MAXBOND');
const LOGO_W = 10 + 4 + wm.width;
writeFileSync(
  join(IMG, 'logo.svg'),
  svg(
    LOGO_W,
    10,
    rectsFor(markRows) + `<g transform="translate(14 1.5)">${rectsFor(wm.rows)}</g>`,
    ' role="img" aria-label="Maxbond"',
  ),
);

// Favicon: mark on a lime tile
writeFileSync(
  join(IMG, 'favicon.svg'),
  svg(16, 16, `<rect width="16" height="16" rx="3" fill="${COLORS['+']}"/>` + rectsFor(markRows, 3, 3)),
);

// 404 digits
const four04 = word('404', 2);
writeFileSync(join(IMG, '404.svg'), svg(four04.width, 7, rectsFor(four04.rows), ' role="img" aria-label="404"'));

// Icons
for (const [name, art] of Object.entries(ICON_ART)) {
  const rows = parse(art);
  check(name, rows, 12, 12);
  writeFileSync(join(ICONS, `${name}.svg`), svg(12, 12, rectsFor(rows)));
}

// Pixel maps for the ASCII icon renderer (assets/js/ascii.js)
const maps = {};
for (const [name, art] of Object.entries(ICON_ART)) maps[name] = parse(art);
maps['404'] = four04.rows;
writeFileSync(
  join(ROOT, 'assets', 'js', 'icon-art.js'),
  `/* Generated by tools/pixel-art.mjs — pixel maps used to draw the ASCII icons. */\nwindow.MAXBOND_ICON_ART = ${JSON.stringify(maps)};\n`,
);

// Max (chat assistant)
const maxRows = parse(MAX);
check('max', maxRows, 16, 16);
writeFileSync(join(IMG, 'max.svg'), svg(16, 16, rectsFor(maxRows), ' role="img" aria-label="Max"'));
// Line-only version (black outline + eyes) for the lime chat launcher
const maxLine = maxRows.map((r) => r.replace(/[+wg]/g, '.'));
writeFileSync(join(IMG, 'max-line.svg'), svg(16, 16, rectsFor(maxLine), ' role="img" aria-label="Max"'));

console.log(`✓ logo, mark, favicon, 404, Max and ${Object.keys(ICON_ART).length} icons written to assets/img`);
