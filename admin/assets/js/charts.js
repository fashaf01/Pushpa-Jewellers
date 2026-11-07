/* Pushpa Jewellers admin — two small SVG charts, no library.
   One series each, so no legend; the card title names what is plotted.
   Both redraw on resize and carry a hover tooltip and a hidden table. */
(function () {
  'use strict';

  const PJ = window.PJ;
  const { html } = PJ;
  const NS = 'http://www.w3.org/2000/svg';
  const SERIES = '#A97B22'; /* validated: lightness band, chroma floor, 3:1 on white */

  function niceStep(span, count) {
    const raw = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }

  function ticks(min, max, count = 4) {
    const step = niceStep(max - min, count);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v));
    return out;
  }

  /* Bars: 4px rounded top, square at the baseline */
  function barPath(x, y, w, h) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }

  function text(x, y, str, cls, anchor = 'middle') {
    const t = el('text', { x, y, class: cls, 'text-anchor': anchor });
    t.textContent = str;
    return t;
  }

  function mount(host, draw, table) {
    host.classList.add('chart');
    host.innerHTML = '';
    const svgWrap = document.createElement('div');
    svgWrap.className = 'chart__plot';
    const tip = document.createElement('div');
    tip.className = 'chart__tip';
    tip.hidden = true;
    host.append(svgWrap, tip);
    if (table) host.insertAdjacentHTML('beforeend', String(table));

    let lastW = 0;
    const render = () => {
      const w = Math.round(svgWrap.clientWidth);
      if (!w || w === lastW) return;
      lastW = w;
      svgWrap.innerHTML = '';
      svgWrap.appendChild(draw(w, tip, svgWrap));
    };
    render();
    if ('ResizeObserver' in window) new ResizeObserver(render).observe(svgWrap);
  }

  function showTip(tip, wrap, x, y, content) {
    tip.innerHTML = String(content);
    tip.hidden = false;
    const tw = tip.offsetWidth;
    const left = Math.max(0, Math.min(wrap.clientWidth - tw, x - tw / 2));
    tip.style.left = left + 'px';
    tip.style.top = Math.max(0, y - tip.offsetHeight - 10) + 'px';
  }

  /* ------------------------------------------------------------------
     Daily sales columns
     data: [{ date: 'YYYY-MM-DD', total, orders }]
     ------------------------------------------------------------------ */
  function sales(host, data) {
    const table = html`<table class="sr-only"><caption>Sales by day</caption><thead><tr><th>Day</th><th>Sales</th><th>Orders</th></tr></thead><tbody>
      ${data.map((d) => html`<tr><td>${PJ.fmt.day(d.date)}</td><td>${PJ.fmt.money(d.total)}</td><td>${d.orders}</td></tr>`)}</tbody></table>`;

    mount(host, (W, tip, wrap) => {
      const H = 220;
      const padL = 44, padR = 8, padT = 12, padB = 28;
      const max = Math.max(1, ...data.map((d) => d.total));
      const yt = ticks(0, max, 4);
      const top = yt[yt.length - 1];
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const band = plotW / data.length;
      const barW = Math.max(4, Math.min(24, band - 2));
      const y = (v) => padT + plotH - (v / top) * plotH;
      const today = PJ.isoDay();

      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Sales for the last ${data.length} days` });

      yt.forEach((v) => {
        svg.appendChild(el('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: 'chart__grid' }));
        svg.appendChild(text(padL - 8, y(v) + 4, v === 0 ? '0' : PJ.fmt.compact(v), 'chart__tick', 'end'));
      });

      const every = band < 30 ? 2 : 1;
      data.forEach((d, i) => {
        const cx = padL + band * i + band / 2;
        const h = (d.total / top) * plotH;
        if (h > 0) svg.appendChild(el('path', { d: barPath(cx - barW / 2, y(d.total), barW, h), fill: SERIES, class: 'chart__bar' }));
        const isToday = d.date === today;
        if (isToday || (data.length - 1 - i) % every === 0) {
          svg.appendChild(text(cx, H - 8, isToday ? 'Today' : String(PJ.fromDay(d.date).getDate()), 'chart__tick' + (isToday ? ' chart__tick--strong' : '')));
        }
        /* The hit target is the whole column, not just the bar */
        const hit = el('rect', { x: padL + band * i, y: padT, width: band, height: plotH, fill: 'transparent', class: 'chart__hit' });
        const label = html`<strong>${PJ.fmt.weekday(PJ.fromDay(d.date))} ${PJ.fmt.shortDay(PJ.fromDay(d.date))}</strong><span>${PJ.fmt.money(d.total)}</span><span class="muted">${PJ.fmt.plural(d.orders, 'order')}</span>`;
        hit.addEventListener('mouseenter', () => { hit.classList.add('is-hover'); showTip(tip, wrap, cx, y(d.total), label); });
        hit.addEventListener('mouseleave', () => { hit.classList.remove('is-hover'); tip.hidden = true; });
        svg.insertBefore(hit, svg.firstChild);
      });

      svg.appendChild(el('line', { x1: padL, x2: W - padR, y1: y(0), y2: y(0), class: 'chart__axis' }));
      return svg;
    }, table);
  }

  /* ------------------------------------------------------------------
     Gold rate line, per pawn
     data: [{ date, value }] oldest first
     ------------------------------------------------------------------ */
  function rate(host, data, label) {
    if (data.length < 2) { host.innerHTML = ''; return; }
    const table = html`<table class="sr-only"><caption>${label}</caption><thead><tr><th>Day</th><th>Rate</th></tr></thead><tbody>
      ${data.map((d) => html`<tr><td>${PJ.fmt.day(d.date)}</td><td>${PJ.fmt.money(d.value)}</td></tr>`)}</tbody></table>`;

    mount(host, (W, tip, wrap) => {
      const H = 200;
      const padL = 52, padR = 76, padT = 14, padB = 26;
      const vals = data.map((d) => d.value);
      const yt = ticks(Math.min(...vals), Math.max(...vals), 3);
      const lo = yt[0], hi = yt[yt.length - 1];
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const x = (i) => padL + (plotW * i) / (data.length - 1);
      const y = (v) => padT + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });

      yt.forEach((v) => {
        svg.appendChild(el('line', { x1: padL, x2: padL + plotW, y1: y(v), y2: y(v), class: 'chart__grid' }));
        svg.appendChild(text(padL - 8, y(v) + 4, PJ.fmt.compact(v), 'chart__tick', 'end'));
      });

      const pts = data.map((d, i) => [x(i), y(d.value)]);
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
      svg.appendChild(el('path', { d: line + `L${x(data.length - 1)},${padT + plotH}L${padL},${padT + plotH}Z`, fill: SERIES, 'fill-opacity': 0.1 }));
      svg.appendChild(el('path', { d: line, fill: 'none', stroke: SERIES, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

      const end = pts[pts.length - 1];
      svg.appendChild(el('circle', { cx: end[0], cy: end[1], r: 4, fill: SERIES, class: 'chart__dot' }));
      svg.appendChild(text(end[0] + 10, end[1] + 4, PJ.fmt.compact(vals[vals.length - 1]), 'chart__end', 'start'));

      [0, data.length - 1].forEach((i) => {
        svg.appendChild(text(x(i), H - 6, PJ.fmt.shortDay(PJ.fromDay(data[i].date)), 'chart__tick', i ? 'end' : 'start'));
      });

      /* Crosshair */
      const cross = el('line', { y1: padT, y2: padT + plotH, class: 'chart__cross', visibility: 'hidden' });
      const dot = el('circle', { r: 4, fill: SERIES, class: 'chart__dot', visibility: 'hidden' });
      svg.append(cross, dot);
      const hit = el('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
      const moveTo = (clientX) => {
        const box = svg.getBoundingClientRect();
        const i = Math.max(0, Math.min(data.length - 1, Math.round(((clientX - box.left - padL) / plotW) * (data.length - 1))));
        const [px, py] = pts[i];
        cross.setAttribute('x1', px); cross.setAttribute('x2', px);
        dot.setAttribute('cx', px); dot.setAttribute('cy', py);
        cross.setAttribute('visibility', 'visible'); dot.setAttribute('visibility', 'visible');
        showTip(tip, wrap, px, py, html`<strong>${PJ.fmt.day(data[i].date)}</strong><span>${PJ.fmt.money(data[i].value)}</span>`);
      };
      hit.addEventListener('mousemove', (e) => moveTo(e.clientX));
      hit.addEventListener('touchstart', (e) => moveTo(e.touches[0].clientX), { passive: true });
      hit.addEventListener('mouseleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.hidden = true; });
      svg.appendChild(hit);
      return svg;
    }, table);
  }

  PJ.charts = { sales, rate };
})();
