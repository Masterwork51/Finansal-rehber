/**
 * Canvas tabanlı grafikler — harici kütüphane yok
 */

const Charts = {
  drawLineChart(canvas, labels, values, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width - 16;
    const h = options.height || 160;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 12, bottom: 28, left: 44 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const range = max - min || 1;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = '#8b95a8';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = max - (range / 4) * i;
      const y = padding.top + (chartH / 4) * i;
      const label = options.formatY ? options.formatY(val) : Math.round(val).toLocaleString('tr-TR');
      ctx.fillText(label, padding.left - 6, y + 3);
    }

    // Points
    const points = values.map((v, i) => ({
      x: padding.left + (chartW / (values.length - 1)) * i,
      y: padding.top + chartH - ((v - min) / range) * chartH
    }));

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    const color = options.color || '#3b9eff';
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      ctx.bezierCurveTo(cpX, points[i - 1].y, cpX, points[i].y, points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.lineTo(points[0].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      ctx.bezierCurveTo(cpX, points[i - 1].y, cpX, points[i].y, points[i].x, points[i].y);
    }
    ctx.strokeStyle = options.color || '#3b9eff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === points.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i === points.length - 1 ? (options.color || '#3b9eff') : '#131a2b';
      ctx.fill();
      ctx.strokeStyle = options.color || '#3b9eff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X labels
    ctx.fillStyle = '#8b95a8';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      ctx.fillText(label, points[i].x, h - 8);
    });
  },

  renderAll(data) {
    const usdCanvas = document.getElementById('chart-usd');
    const nwCanvas = document.getElementById('chart-networth');

    if (usdCanvas) {
      this.drawLineChart(
        usdCanvas,
        data.history.usd.map((d) => d.month),
        data.history.usd.map((d) => d.value),
        { color: '#22c55e', formatY: (v) => '$' + Math.round(v).toLocaleString('tr-TR') }
      );
    }

    if (nwCanvas) {
      this.drawLineChart(
        nwCanvas,
        data.history.netWorth.map((d) => d.month),
        data.history.netWorth.map((d) => d.value),
        { color: '#3b9eff', formatY: (v) => '₺' + Math.round(v / 1000) + 'K' }
      );
    }
  }
};
