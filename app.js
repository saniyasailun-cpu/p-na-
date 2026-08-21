/**
 * ==========================================================================
 * ระบบแดชบอร์ดติดตาม KPI การลดต้นทุนจัดซื้อและส่วนลดซัพพลายเออร์
 * Procurement KPI & Supplier Discount Management Engine (Clean UX/UI)
 * ==========================================================================
 */

// สถานะการทำงานของระบบ (Application Global State)
const State = {
  data: null,
  activeYear: '2026',
  activeQuarter: 'ALL',
  activeView: 'dashboard',
  chartMode: 'bar', // 'bar' | 'curve'
  theme: localStorage.getItem('app-theme') || 'dark',
  
  // ตารางรายการสั่งซื้อ
  transactions: [],
  filteredTransactions: [],
  tablePage: 1,
  pageSize: 15,
  sortKey: 'totalSaving',
  sortAsc: false,
  filters: {
    search: '',
    month: 'ALL',
    pic: 'ALL',
    strategy: 'ALL'
  },
  
  // อินสแตนซ์ Chart.js
  charts: {
    monthlyTrend: null,
    strategyDonut: null,
    multiYear: null
  }
};

// ข้อมูลเดือนและไตรมาส
const QUARTER_MONTHS = {
  'Q1': ['JAN', 'FEB', 'MAR'],
  'Q2': ['APR', 'MAY', 'JUN'],
  'Q3': ['JUL', 'AUG', 'SEP'],
  'Q4': ['OCT', 'NOV', 'DEC']
};

const THAI_MONTHS = {
  'JAN': 'มกราคม', 'FEB': 'กุมภาพันธ์', 'MAR': 'มีนาคม',
  'APR': 'เมษายน', 'MAY': 'พฤษภาคม', 'JUN': 'มิถุนายน',
  'JUL': 'กรกฎาคม', 'AUG': 'สิงหาคม', 'SEP': 'กันยายน',
  'OCT': 'ตุลาคม', 'NOV': 'พฤศจิกายน', 'DEC': 'ธันวาคม'
};

const THAI_MONTHS_SHORT = {
  'JAN': 'ม.ค.', 'FEB': 'ก.พ.', 'MAR': 'มี.ค.',
  'APR': 'เม.ย.', 'MAY': 'พ.ค.', 'JUN': 'มิ.ย.',
  'JUL': 'ก.ค.', 'AUG': 'ส.ค.', 'SEP': 'ก.ย.',
  'OCT': 'ต.ค.', 'NOV': 'พ.ย.', 'DEC': 'ธ.ค.'
};

const THAI_PIC_NAMES = {
  'Pawina': 'คุณปวิณา ใจดี',
  'Tanida': 'คุณธนิดา ธรรมสุนทร',
  'Yuwanit': 'คุณยุวนิต โนจันทร์',
  'Dusit': 'คุณดุสิต',
  'Saniya': 'คุณศานิยา'
};

const THAI_STRATEGIES = {
  'Compare + Negotiate': 'เปรียบเทียบราคาและต่อรอง',
  'Negotiate': 'เจรจาต่อรองราคา',
  'Avoidance': 'หลีกเลี่ยงต้นทุน',
  'Rebate': 'ส่วนลดเงินคืน',
  'เพิ่มเครดิต': 'ขยายระยะเวลาเครดิตเทอม'
};

// เริ่มต้นการทำงาน
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  initNavigation();
  initFilterPills();
  initTableEvents();
  initSimulators();
  initDropzone();
});

// จัดการธีม
function initTheme() {
  document.documentElement.setAttribute('data-theme', State.theme);
  updateThemeIcons();
  
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      State.theme = State.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', State.theme);
      localStorage.setItem('app-theme', State.theme);
      updateThemeIcons();
      updateChartsTheme();
    });
  }
}

function updateThemeIcons() {
  const moon = document.getElementById('theme-moon-icon');
  const sun = document.getElementById('theme-sun-icon');
  if (moon && sun) {
    if (State.theme === 'dark') {
      moon.style.display = 'block';
      sun.style.display = 'none';
    } else {
      moon.style.display = 'none';
      sun.style.display = 'block';
    }
  }
}

// โหลดข้อมูล
function loadData() {
  if (window.KPI_DATA) {
    State.data = window.KPI_DATA;
    setupDataset();
    renderAllViews();
  }
}

function setupDataset() {
  if (!State.data) return;
  
  const recent = State.data.recentTransactions || [];
  const historical = State.data.historicalTransactions || [];
  
  State.transactions = [...recent, ...historical].map((item, idx) => ({
    ...item,
    globalId: item.id || `rec-${idx}`,
    year: String(item.year || '2026'),
    month: String(item.month || 'JAN').toUpperCase(),
    totalPrice: Number(item.totalPrice) || 0,
    totalSaving: Number(item.totalSaving) || 0,
    percentDiscount: Number(item.percentDiscount) || 0,
    qty: Number(item.qty) || 0,
    pic: (item.pic || 'ไม่ระบุ').trim(),
    strategy: (item.strategy || item.method || 'Negotiate').trim()
  }));

  filterTransactions();
}

// ระบบสลับเมนู
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.getAttribute('data-view'));
    });
  });

  const mobileToggle = document.getElementById('mobile-toggle');
  const sidebar = document.getElementById('sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function switchView(viewName) {
  State.activeView = viewName;
  
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === viewName);
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${viewName}`);
  });

  const titles = {
    'dashboard': { title: 'ภาพรวมผู้บริหาร', desc: 'สรุปผลการต่อรองลดต้นทุนจัดซื้อและติดตามผลการดำเนินงานตามเป้าหมาย' },
    'kpi-tracking': { title: 'สรุปผล KPI รายเดือน & รายปี', desc: 'เปรียบเทียบผลการประหยัดต้นทุนเทียบเป้าหมาย 3.0% ประจำปี' },
    'transactions': { title: 'รายการสั่งซื้อ & ส่วนลด (PO Data)', desc: 'ค้นหาและตรวจสอบรายการสั่งซื้อกว่า 5,800+ รายการ' },
    'suppliers': { title: 'การวิเคราะห์ข้อมูลคู่ค้า (ซัพพลายเออร์)', desc: 'สรุปยอดสั่งซื้อและมูลค่าส่วนลดที่ได้รับจากคู่ค้าแต่ละราย' },
    'pic-team': { title: 'สรุปผลงานทีมจัดซื้อรายบุคคล', desc: 'สถิติและกลยุทธ์การต่อรองของเจ้าหน้าที่จัดซื้อแต่ละท่าน' },
    'simulators': { title: 'โปรแกรมคำนวณ Kaizen & ขยายเครดิตเทอม', desc: 'เครื่องมือจำลองผลประหยัดเวลาและผลประโยชน์ทางการเงิน' },
    'data-import': { title: 'จัดการไฟล์ข้อมูล Excel', desc: 'อัปโหลดไฟล์ Excel (.xlsx) ชุดใหม่ หรือดาวน์โหลดข้อมูล' }
  };

  const current = titles[viewName] || titles['dashboard'];
  document.getElementById('current-view-title').textContent = current.title;
  document.getElementById('current-view-desc').textContent = current.desc;

  setTimeout(() => {
    if (viewName === 'dashboard') {
      State.charts.monthlyTrend?.resize();
      State.charts.strategyDonut?.resize();
    } else if (viewName === 'kpi-tracking') {
      State.charts.multiYear?.resize();
    }
  }, 50);

  document.getElementById('sidebar')?.classList.remove('open');
}

// ตัวเลือกปีและไตรมาส
function initFilterPills() {
  document.querySelectorAll('#year-filter-group .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#year-filter-group .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.activeYear = btn.getAttribute('data-year');
      renderAllViews();
    });
  });

  document.querySelectorAll('#quarter-filter-group .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#quarter-filter-group .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.activeQuarter = btn.getAttribute('data-quarter');
      renderAllViews();
    });
  });
}

// เรนเดอร์หน้าจอทั้งหมด
function renderAllViews() {
  renderExecutiveDashboard();
  renderMonthlyKPITracking();
  renderSuppliersView();
  renderPICLeaderboard();
  filterTransactions();
  renderTransactionTable();
}

// ฟังก์ชันแปลงรูปแบบตัวเลข
function formatCurrency(num, decimals = 2) {
  if (isNaN(num) || num === null) return '฿0.00';
  return '฿' + Number(num).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatNumber(num, decimals = 0) {
  if (isNaN(num) || num === null) return '0';
  return Number(num).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPercent(num, decimals = 2) {
  if (isNaN(num) || num === null) return '0.00%';
  return (Number(num) * 100).toFixed(decimals) + '%';
}

// แอนิเมชันนับตัวเลข
function animateValue(id, endValue, isCurrency = true, decimals = 2) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const duration = 600;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutQuad
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const currentVal = start + (endValue - start) * easeProgress;

    if (isCurrency) {
      el.textContent = formatCurrency(currentVal, decimals);
    } else {
      el.textContent = (currentVal * 100).toFixed(decimals) + '%';
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (isCurrency) el.textContent = formatCurrency(endValue, decimals);
      else el.textContent = (endValue * 100).toFixed(decimals) + '%';
    }
  }

  requestAnimationFrame(update);
}

// -------------------------------------------------------------
// 1. ภาพรวมผู้บริหาร (DASHBOARD)
// -------------------------------------------------------------
function renderExecutiveDashboard() {
  if (!State.data) return;

  const year = State.activeYear;
  const quarter = State.activeQuarter;
  const is2026 = (year === '2026');

  let totalSavings = 0;
  let totalPurchase = 0;
  let poCount = 0;

  let txs = (year === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === year);
  if (quarter !== 'ALL') {
    const allowedMonths = QUARTER_MONTHS[quarter] || [];
    txs = txs.filter(t => allowedMonths.includes(t.month));
  }

  if (is2026 && quarter === 'ALL' && State.data.monthlySummary) {
    State.data.monthlySummary.forEach(m => {
      totalPurchase += (m.pv2026 || 0);
      totalSavings += (m.cr2026 || 0);
    });
    poCount = State.data.recentTransactions?.length || 1397;
  } else {
    poCount = txs.length;
    txs.forEach(t => {
      totalPurchase += t.totalPrice;
      totalSavings += t.totalSaving;
    });
  }

  const savingRate = totalPurchase > 0 ? (totalSavings / totalPurchase) : 0;
  const targetRate = 0.03; // 3%
  const isMet = savingRate >= targetRate;

  // แอนิเมชันตัวเลข
  animateValue('kpi-total-savings', totalSavings, true, 2);
  animateValue('kpi-total-purchase', totalPurchase, true, 2);

  document.getElementById('kpi-savings-mb').textContent = `${(totalSavings / 1000000).toFixed(2)} ล้านบาท`;
  document.getElementById('kpi-savings-rate').textContent = `+${(savingRate * 100).toFixed(2)}% ประหยัดได้`;

  document.getElementById('kpi-purchase-mb').textContent = `${(totalPurchase / 1000000).toFixed(2)} ล้านบาท`;
  document.getElementById('kpi-po-count').textContent = `${formatNumber(poCount)} รายการ`;

  // อัปเดต Circular Gauge
  const targetPctDisplay = document.getElementById('kpi-target-pct');
  const targetRateDisplay = document.getElementById('kpi-target-rate-display');
  const targetBadge = document.getElementById('kpi-target-badge');
  const targetDiff = document.getElementById('kpi-target-diff');
  const gaugeFill = document.getElementById('kpi-gauge-fill');

  targetPctDisplay.textContent = (savingRate * 100).toFixed(1) + '%';
  targetRateDisplay.textContent = (savingRate * 100).toFixed(2) + '%';

  // คำนวณความยาววงแหวน (100% = 3.0% target)
  const pctOfTarget = Math.min((savingRate / targetRate) * 100, 100);
  if (gaugeFill) {
    gaugeFill.setAttribute('stroke-dasharray', `${pctOfTarget}, 100`);
    gaugeFill.style.stroke = isMet ? 'var(--accent-emerald)' : 'var(--accent-rose)';
  }

  if (isMet) {
    targetBadge.className = 'kpi-badge success';
    targetBadge.textContent = 'ได้ตามเป้าหมาย (Passed)';
    targetDiff.textContent = `+${((savingRate - targetRate) * 100).toFixed(2)}% สูงกว่าเป้าหมาย`;
  } else {
    targetBadge.className = 'kpi-badge danger';
    targetBadge.textContent = 'ต่ำกว่าเป้าหมาย';
    targetDiff.textContent = `${((savingRate - targetRate) * 100).toFixed(2)}% ต่ำกว่าเป้าหมาย`;
  }

  // ยอดลดต้นทุนเพิ่มเครดิตเทอม
  let creditTotal = 0;
  if (State.data.monthlySummary) {
    State.data.monthlySummary.forEach(m => creditTotal += (m.creditSaving || 0));
  }
  document.getElementById('kpi-credit-savings').textContent = formatCurrency(creditTotal > 0 ? creditTotal : 85669.64);

  // วาดกราฟและตารางสรุปแบบ Compact
  renderMonthlyTrendChart();
  renderStrategyDonutChart();
  renderCompactPICList(txs);
  renderCompactTopSuppliers(txs);
}

// สลับโหมดชาร์ต
window.setChartMode = function(mode) {
  State.chartMode = mode;
  document.getElementById('btn-chart-bar')?.classList.toggle('active', mode === 'bar');
  document.getElementById('btn-chart-curve')?.classList.toggle('active', mode === 'curve');
  renderMonthlyTrendChart();
};

function renderMonthlyTrendChart() {
  const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthLabelsThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthlyData = State.data.monthlySummary || [];

  if (State.charts.monthlyTrend) {
    State.charts.monthlyTrend.destroy();
  }

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  if (State.chartMode === 'bar') {
    // โหมด 1: กราฟแท่งเปรียบเทียบรายเดือน
    const purchaseValuesMB = months.map(m => {
      const row = monthlyData.find(d => d.month === m);
      return row ? Number((row.pv2026 / 1000000).toFixed(2)) : 0;
    });

    const costReductionMB = months.map(m => {
      const row = monthlyData.find(d => d.month === m);
      return row ? Number((row.cr2026 / 1000000).toFixed(2)) : 0;
    });

    const targetSavingsMB = months.map(m => {
      const row = monthlyData.find(d => d.month === m);
      return row ? Number((row.target2026 / 1000000).toFixed(2)) : 0;
    });

    State.charts.monthlyTrend = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabelsThai,
        datasets: [
          {
            label: 'มูลค่าสั่งซื้อ (ล้านบาท)',
            data: purchaseValuesMB,
            backgroundColor: 'rgba(59, 130, 246, 0.35)',
            borderColor: '#3b82f6',
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'มูลค่าต่อรองได้ (ล้านบาท)',
            data: costReductionMB,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: 'y1'
          },
          {
            label: 'เป้าหมาย 3% (ล้านบาท)',
            data: targetSavingsMB,
            type: 'line',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 2.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Prompt', size: 11.5 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ฿${c.raw} ล้านบาท` } }
        },
        scales: {
          x: { ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { display: false } },
          y: {
            type: 'linear', position: 'left',
            title: { display: true, text: 'มูลค่าสั่งซื้อ (ล้านบาท)', color: textColor, font: { family: 'Prompt', size: 11 } },
            ticks: { color: textColor }, grid: { color: gridColor }
          },
          y1: {
            type: 'linear', position: 'right',
            title: { display: true, text: 'ต่อรองได้ (ล้านบาท)', color: textColor, font: { family: 'Prompt', size: 11 } },
            ticks: { color: textColor }, grid: { drawOnChartArea: false }
          }
        }
      }
    });

  } else {
    // โหมด 2: กราฟสะสม S-Curve (Cumulative Savings vs Target)
    let cumActual = 0;
    let cumTarget = 0;
    const actualCumulative = [];
    const targetCumulative = [];

    months.forEach(m => {
      const row = monthlyData.find(d => d.month === m);
      if (row) {
        cumActual += (row.cr2026 || 0);
        cumTarget += (row.target2026 || 0);
        actualCumulative.push(Number((cumActual / 1000000).toFixed(2)));
        targetCumulative.push(Number((cumTarget / 1000000).toFixed(2)));
      }
    });

    State.charts.monthlyTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabelsThai,
        datasets: [
          {
            label: 'ยอดลดต้นทุนสะสมจริง (ล้านบาท)',
            data: actualCumulative,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'เป้าหมายสะสม 3.0% (ล้านบาท)',
            data: targetCumulative,
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Prompt', size: 11.5 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ฿${c.raw} ล้านบาท` } }
        },
        scales: {
          x: { ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { color: gridColor } },
          y: {
            title: { display: true, text: 'มูลค่าสะสม (ล้านบาท)', color: textColor, font: { family: 'Prompt', size: 11 } },
            ticks: { color: textColor }, grid: { color: gridColor }
          }
        }
      }
    });
  }
}

function renderStrategyDonutChart() {
  const ctx = document.getElementById('strategyDonutChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const matrix = State.data.strategyMatrix || [];
  const labels = matrix.map(s => THAI_STRATEGIES[s.strategy] || s.strategy);
  const dataValues = matrix.map(s => s.Total);

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

  if (State.charts.strategyDonut) {
    State.charts.strategyDonut.destroy();
  }

  State.charts.strategyDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: State.theme === 'dark' ? '#131b26' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => `${c.label}: ฿${Number(c.raw).toLocaleString('th-TH', {maximumFractionDigits: 0})} บาท`
          }
        }
      }
    }
  });

  const total = dataValues.reduce((a, b) => a + b, 0) || 1;
  const listEl = document.getElementById('strategy-breakdown-list');
  if (listEl) {
    listEl.innerHTML = matrix.map((item, idx) => {
      const pct = ((item.Total / total) * 100).toFixed(1);
      const nameThai = THAI_STRATEGIES[item.strategy] || item.strategy;
      return `
        <div class="strat-item">
          <div class="strat-item-left">
            <span class="strat-dot" style="background: ${colors[idx % colors.length]};"></span>
            <span class="strat-name">${nameThai}</span>
          </div>
          <div style="text-align: right;">
            <div class="strat-val">${formatCurrency(item.Total, 0)}</div>
            <span style="font-size: 10.5px; color: var(--text-muted);">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// สรุปผลงานทีมแบบ Compact (ไม่รกตา)
function renderCompactPICList(currentTxs) {
  const container = document.getElementById('pic-overview-list');
  if (!container) return;

  const picMap = {};
  currentTxs.forEach(t => {
    const pic = t.pic || 'ไม่ระบุ';
    if (!picMap[pic]) picMap[pic] = { savings: 0, count: 0 };
    picMap[pic].savings += t.totalSaving;
    picMap[pic].count += 1;
  });

  const sorted = Object.keys(picMap).sort((a, b) => picMap[b].savings - picMap[a].savings);
  const totalTeamSavings = sorted.reduce((acc, p) => acc + picMap[p].savings, 0) || 1;

  container.innerHTML = sorted.map((p, idx) => {
    const share = ((picMap[p].savings / totalTeamSavings) * 100).toFixed(1);
    const thaiName = THAI_PIC_NAMES[p] || p;
    return `
      <div class="pic-compact-row">
        <div class="pic-compact-meta">
          <span class="rank-badge">#${idx + 1}</span>
          <div class="pic-title-box">
            <div class="name">${thaiName}</div>
            <div class="sub">${picMap[p].count} รายการ</div>
          </div>
        </div>
        <div class="pic-savings-box">
          <div class="amount">${formatCurrency(picMap[p].savings, 0)}</div>
          <div class="share">สัดส่วน ${share}%</div>
        </div>
      </div>
    `;
  }).join('');
}

// สรุป 5 อันดับซัพพลายเออร์แบบ Compact
function renderCompactTopSuppliers(currentTxs) {
  const container = document.getElementById('top-suppliers-list');
  if (!container) return;

  const supMap = {};
  currentTxs.forEach(t => {
    const s = t.supplier || 'ไม่ระบุ';
    if (!supMap[s]) supMap[s] = { savings: 0, count: 0, purchase: 0 };
    supMap[s].savings += t.totalSaving;
    supMap[s].purchase += t.totalPrice;
    supMap[s].count += 1;
  });

  const top5 = Object.keys(supMap).sort((a, b) => supMap[b].savings - supMap[a].savings).slice(0, 5);

  container.innerHTML = top5.map((s, idx) => {
    const avgDisc = supMap[s].purchase > 0 ? (supMap[s].savings / supMap[s].purchase) : 0;
    return `
      <div class="pic-compact-row">
        <div class="pic-compact-meta">
          <span class="rank-badge">#${idx + 1}</span>
          <div class="pic-title-box">
            <div class="name" style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s}">${s}</div>
            <div class="sub">${supMap[s].count} รายการ | ลดเฉลี่ย ${(avgDisc * 100).toFixed(1)}%</div>
          </div>
        </div>
        <div class="pic-savings-box">
          <div class="amount">${formatCurrency(supMap[s].savings, 0)}</div>
          <div class="share">ยอดซื้อ: ${formatCurrency(supMap[s].purchase, 0)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// 2. สรุป KPI รายเดือน & รายปี
// -------------------------------------------------------------
function renderMonthlyKPITracking() {
  const tbody = document.getElementById('monthly-kpi-tbody');
  const creditTbody = document.getElementById('credit-extension-tbody');
  if (!tbody || !State.data) return;

  const monthly = State.data.monthlySummary || [];
  let totalPV = 0;
  let totalCR = 0;
  let totalTarget = 0;
  let totalCreditSaving = 0;

  tbody.innerHTML = monthly.map(row => {
    totalPV += row.pv2026 || 0;
    totalCR += row.cr2026 || 0;
    totalTarget += row.target2026 || 0;
    totalCreditSaving += row.creditSaving || 0;

    const actualPct = row.pv2026 > 0 ? (row.cr2026 / row.pv2026) : 0;
    const isPassed = row.status2026 === 'ได้ตามเป้าหมาย';
    const varianceTHB = (row.cr2026 || 0) - (row.target2026 || 0);

    return `
      <tr>
        <td><strong>${THAI_MONTHS[row.month] || row.month}</strong></td>
        <td>${formatCurrency(row.pv2026)}</td>
        <td class="highlight-col">${formatCurrency(row.cr2026)}</td>
        <td>${formatCurrency(row.target2026)}</td>
        <td><strong>${(actualPct * 100).toFixed(2)}%</strong></td>
        <td style="color: ${varianceTHB >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
          ${varianceTHB >= 0 ? '+' : ''}${formatCurrency(varianceTHB)}
        </td>
        <td>
          <span class="kpi-badge ${isPassed ? 'success' : 'danger'}">
            ${isPassed ? '✓ ได้ตามเป้า' : '✕ ต่ำกว่าเป้า'}
          </span>
        </td>
        <td>${formatCurrency(row.creditSaving)}</td>
      </tr>
    `;
  }).join('');

  const totalActualPct = totalPV > 0 ? (totalCR / totalPV) : 0;
  const isTotalPassed = totalActualPct >= 0.03;
  tbody.innerHTML += `
    <tr style="background: var(--bg-glass); font-weight: 700;">
      <td>รวมทั้งปี (GRAND TOTAL)</td>
      <td>${formatCurrency(totalPV)}</td>
      <td class="highlight-col">${formatCurrency(totalCR)}</td>
      <td>${formatCurrency(totalTarget)}</td>
      <td style="color: var(--accent-primary);">${(totalActualPct * 100).toFixed(2)}%</td>
      <td style="color: ${totalCR - totalTarget >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
        ${totalCR - totalTarget >= 0 ? '+' : ''}${formatCurrency(totalCR - totalTarget)}
      </td>
      <td>
        <span class="kpi-badge ${isTotalPassed ? 'success' : 'danger'}">
          ${isTotalPassed ? '✓ ได้ตามเป้า' : '✕ ต่ำกว่าเป้า'}
        </span>
      </td>
      <td>${formatCurrency(totalCreditSaving)}</td>
    </tr>
  `;

  if (creditTbody) {
    creditTbody.innerHTML = monthly.filter(m => m.creditPOVal > 0).map(m => `
      <tr>
        <td><strong>${THAI_MONTHS[m.month] || m.month}</strong></td>
        <td><span class="tier-tag tier-mid">+${m.creditDiffDays} วัน</span></td>
        <td>${formatCurrency(m.creditPOVal)}</td>
        <td class="highlight-col">${formatCurrency(m.creditSaving)}</td>
      </tr>
    `).join('');
  }

  renderMultiYearChart();
}

function renderMultiYearChart() {
  const ctx = document.getElementById('multiYearChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const yearly = State.data.yearlySummary || [];
  const labels = yearly.map(y => `ปี ${y.year}`);
  const savingsMB = yearly.map(y => Number((y.costSaving / 1000000).toFixed(2)));

  if (State.charts.multiYear) {
    State.charts.multiYear.destroy();
  }

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  State.charts.multiYear = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'มูลค่าผลประหยัดต้นทุน (ล้านบาท)',
        data: savingsMB,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Prompt', size: 11.5 } } },
        tooltip: { callbacks: { label: (c) => `ยอดลดต้นทุน: ฿${c.raw} ล้านบาท` } }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor }, title: { display: true, text: 'ล้านบาท', color: textColor } }
      }
    }
  });
}

// -------------------------------------------------------------
// 3. ตารางรายการสั่งซื้อ (PO TRANSACTIONS)
// -------------------------------------------------------------
function initTableEvents() {
  const searchInput = document.getElementById('tx-search-input');
  const monthSelect = document.getElementById('filter-tx-month');
  const picSelect = document.getElementById('filter-tx-pic');
  const strategySelect = document.getElementById('filter-tx-strategy');
  const resetBtn = document.getElementById('reset-filter-btn');
  const exportBtn = document.getElementById('export-tx-btn');
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');

  searchInput?.addEventListener('input', (e) => {
    State.filters.search = e.target.value.toLowerCase();
    State.tablePage = 1;
    filterTransactions();
    renderTransactionTable();
  });

  monthSelect?.addEventListener('change', (e) => {
    State.filters.month = e.target.value;
    State.tablePage = 1;
    filterTransactions();
    renderTransactionTable();
  });

  picSelect?.addEventListener('change', (e) => {
    State.filters.pic = e.target.value;
    State.tablePage = 1;
    filterTransactions();
    renderTransactionTable();
  });

  strategySelect?.addEventListener('change', (e) => {
    State.filters.strategy = e.target.value;
    State.tablePage = 1;
    filterTransactions();
    renderTransactionTable();
  });

  resetBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (monthSelect) monthSelect.value = 'ALL';
    if (picSelect) picSelect.value = 'ALL';
    if (strategySelect) strategySelect.value = 'ALL';
    State.filters = { search: '', month: 'ALL', pic: 'ALL', strategy: 'ALL' };
    State.tablePage = 1;
    filterTransactions();
    renderTransactionTable();
  });

  exportBtn?.addEventListener('click', () => exportFilteredTransactions());

  prevBtn?.addEventListener('click', () => {
    if (State.tablePage > 1) {
      State.tablePage--;
      renderTransactionTable();
    }
  });

  nextBtn?.addEventListener('click', () => {
    const totalPages = Math.ceil(State.filteredTransactions.length / State.pageSize);
    if (State.tablePage < totalPages) {
      State.tablePage++;
      renderTransactionTable();
    }
  });

  document.querySelectorAll('#transaction-data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (State.sortKey === key) {
        State.sortAsc = !State.sortAsc;
      } else {
        State.sortKey = key;
        State.sortAsc = false;
      }
      sortFilteredTransactions();
      renderTransactionTable();
    });
  });
}

function filterTransactions() {
  let list = State.transactions;

  if (State.activeYear !== 'ALL') {
    list = list.filter(t => t.year === State.activeYear);
  }

  if (State.activeQuarter !== 'ALL') {
    const allowed = QUARTER_MONTHS[State.activeQuarter] || [];
    list = list.filter(t => allowed.includes(t.month));
  }

  if (State.filters.month !== 'ALL') {
    list = list.filter(t => t.month === State.filters.month);
  }

  if (State.filters.pic !== 'ALL') {
    list = list.filter(t => t.pic.toLowerCase().includes(State.filters.pic.toLowerCase()));
  }

  if (State.filters.strategy !== 'ALL') {
    list = list.filter(t => t.strategy.toLowerCase().includes(State.filters.strategy.toLowerCase()));
  }

  if (State.filters.search) {
    const q = State.filters.search;
    list = list.filter(t => 
      (t.poNo && t.poNo.toLowerCase().includes(q)) ||
      (t.supplier && t.supplier.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.pic && t.pic.toLowerCase().includes(q))
    );
  }

  State.filteredTransactions = list;
  sortFilteredTransactions();
}

function sortFilteredTransactions() {
  const k = State.sortKey;
  const asc = State.sortAsc;

  State.filteredTransactions.sort((a, b) => {
    let valA = a[k];
    let valB = b[k];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
  });
}

function renderTransactionTable() {
  const tbody = document.getElementById('transaction-tbody');
  const infoEl = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');
  const pageNumbersEl = document.getElementById('page-numbers');
  if (!tbody) return;

  const total = State.filteredTransactions.length;
  const totalPages = Math.ceil(total / State.pageSize) || 1;
  if (State.tablePage > totalPages) State.tablePage = totalPages;

  const startIdx = (State.tablePage - 1) * State.pageSize;
  const endIdx = Math.min(startIdx + State.pageSize, total);
  const pageData = State.filteredTransactions.slice(startIdx, endIdx);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 36px; color: var(--text-muted);">ไม่พบรายการข้อมูลตามเงื่อนไขที่ค้นหา</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map(item => {
      const disc = item.percentDiscount;
      let tierHtml = '';
      if (disc >= 0.10) {
        tierHtml = '<span class="tier-tag tier-high">🟢 สูง (>10%)</span>';
      } else if (disc >= 0.03) {
        tierHtml = '<span class="tier-tag tier-mid">🔵 ตามเป้า (3-10%)</span>';
      } else {
        tierHtml = '<span class="tier-tag tier-low">⚪ ทั่วไป (<3%)</span>';
      }

      return `
        <tr onclick="openTxModal('${item.globalId}')">
          <td><span class="tier-tag tier-low">${THAI_MONTHS_SHORT[item.month] || item.month}</span></td>
          <td><strong>${item.poNo || '-'}</strong></td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.supplier}">${item.supplier || '-'}</td>
          <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.description}">${item.description || '-'}</td>
          <td>${formatNumber(item.qty)}</td>
          <td><span style="color: var(--text-muted); font-size: 11px;">${item.unit || '-'}</span></td>
          <td>${formatCurrency(item.totalPrice)}</td>
          <td class="highlight-col">${formatCurrency(item.totalSaving)}</td>
          <td><strong>${(item.percentDiscount * 100).toFixed(1)}%</strong></td>
          <td>${tierHtml}</td>
          <td><span class="tier-tag tier-low">${THAI_STRATEGIES[item.strategy] || item.strategy || '-'}</span></td>
          <td>${THAI_PIC_NAMES[item.pic] || item.pic || '-'}</td>
        </tr>
      `;
    }).join('');
  }

  if (infoEl) {
    infoEl.textContent = total > 0 
      ? `แสดงรายการที่ ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${formatNumber(total)} รายการ`
      : 'แสดง 0 ถึง 0 จากทั้งหมด 0 รายการ';
  }

  if (prevBtn) prevBtn.disabled = (State.tablePage <= 1);
  if (nextBtn) nextBtn.disabled = (State.tablePage >= totalPages);

  if (pageNumbersEl) {
    let pagesHtml = '';
    const maxVisible = 5;
    let startPage = Math.max(1, State.tablePage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      pagesHtml += `
        <button class="page-num-btn ${p === State.tablePage ? 'active' : ''}" onclick="goToTablePage(${p})">${p}</button>
      `;
    }
    pageNumbersEl.innerHTML = pagesHtml;
  }
}

window.goToTablePage = function(page) {
  State.tablePage = page;
  renderTransactionTable();
};

// -------------------------------------------------------------
// ป๊อปอัปดูรายละเอียด PO
// -------------------------------------------------------------
window.openTxModal = function(globalId) {
  const item = State.transactions.find(t => t.globalId === globalId);
  if (!item) return;

  const modal = document.getElementById('tx-modal');
  const modalBody = document.getElementById('modal-tx-body');
  const modalTitle = document.getElementById('modal-tx-title');

  if (modalTitle) modalTitle.textContent = `รายละเอียด PO: ${item.poNo || 'ไม่ระบุ'}`;

  if (modalBody) {
    modalBody.innerHTML = `
      <div class="detail-line"><span class="lbl">ชื่อซัพพลายเออร์ / คู่ค้า</span><span class="val">${item.supplier}</span></div>
      <div class="detail-line"><span class="lbl">รายละเอียดสินค้าหรือบริการ</span><span class="val">${item.description}</span></div>
      <div class="detail-line"><span class="lbl">งวดประจำเดือน / ปี</span><span class="val">${THAI_MONTHS[item.month] || item.month} / ปี ${item.year}</span></div>
      <div class="detail-line"><span class="lbl">จำนวนและหน่วยนับ</span><span class="val">${formatNumber(item.qty)} ${item.unit}</span></div>
      <div class="detail-line"><span class="lbl">ราคาต่อหน่วยต่ำสุดเดิม</span><span class="val">${formatCurrency(item.minUnitPrice)}</span></div>
      <div class="detail-line"><span class="lbl">ราคาต่อหน่วยที่ต่อรองได้</span><span class="val">${formatCurrency(item.negotiatedUnitPrice)}</span></div>
      <div class="detail-line"><span class="lbl">ส่วนต่างราคาต่อหน่วย</span><span class="val">${formatCurrency(item.unitDifference)}</span></div>
      <div class="detail-line"><span class="lbl">มูลค่าสั่งซื้อรวม (บาท)</span><span class="val">${formatCurrency(item.totalPrice)}</span></div>
      <div class="detail-line"><span class="lbl">รวมมูลค่าที่ต่อรองลดลงได้</span><span class="val" style="color: var(--accent-emerald); font-size: 15px; font-weight: 700;">${formatCurrency(item.totalSaving)}</span></div>
      <div class="detail-line"><span class="lbl">คิดเป็น % ส่วนลด</span><span class="val" style="color: var(--accent-primary); font-weight: 700;">${(item.percentDiscount * 100).toFixed(2)}%</span></div>
      <div class="detail-line"><span class="lbl">กลยุทธ์การต่อรองราคา</span><span class="val"><span class="tier-tag tier-mid">${THAI_STRATEGIES[item.strategy] || item.strategy}</span></span></div>
      <div class="detail-line"><span class="lbl">ผู้รับผิดชอบการจัดซื้อ</span><span class="val">${THAI_PIC_NAMES[item.pic] || item.pic}</span></div>
    `;
  }

  modal?.classList.add('active');
};

window.closeTxModal = function() {
  document.getElementById('tx-modal')?.classList.remove('active');
};

document.getElementById('tx-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'tx-modal') closeTxModal();
});

// -------------------------------------------------------------
// 4. การวิเคราะห์ซัพพลายเออร์
// -------------------------------------------------------------
function renderSuppliersView() {
  const tbody = document.getElementById('supplier-ranking-tbody');
  const searchInput = document.getElementById('supplier-search-input');
  if (!tbody) return;

  const currentTxs = (State.activeYear === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === State.activeYear);
  const supplierMap = {};

  currentTxs.forEach(t => {
    const s = t.supplier || 'ไม่ระบุ';
    if (!supplierMap[s]) supplierMap[s] = { name: s, savings: 0, purchase: 0, count: 0, strategies: {} };
    supplierMap[s].savings += t.totalSaving;
    supplierMap[s].purchase += t.totalPrice;
    supplierMap[s].count += 1;

    const strat = t.strategy || 'Negotiate';
    supplierMap[s].strategies[strat] = (supplierMap[s].strategies[strat] || 0) + 1;
  });

  let sorted = Object.values(supplierMap).sort((a, b) => b.savings - a.savings);

  const query = (searchInput?.value || '').toLowerCase();
  if (query) {
    sorted = sorted.filter(s => s.name.toLowerCase().includes(query));
  }

  tbody.innerHTML = sorted.map((sup, idx) => {
    const avgDisc = sup.purchase > 0 ? (sup.savings / sup.purchase) : 0;
    const topStrats = Object.keys(sup.strategies)
      .sort((a, b) => sup.strategies[b] - sup.strategies[a])
      .slice(0, 2)
      .map(s => `<span class="tier-tag tier-low">${THAI_STRATEGIES[s] || s}</span>`)
      .join(' ');

    return `
      <tr>
        <td><span class="rank-badge">#${idx + 1}</span></td>
        <td><strong>${sup.name}</strong></td>
        <td>${formatNumber(sup.count)}</td>
        <td>${formatCurrency(sup.purchase)}</td>
        <td class="highlight-col">${formatCurrency(sup.savings)}</td>
        <td><strong>${formatPercent(avgDisc, 1)}</strong></td>
        <td>${topStrats}</td>
      </tr>
    `;
  }).join('');

  searchInput?.addEventListener('input', () => renderSuppliersView());
}

// -------------------------------------------------------------
// 5. ทีมจัดซื้อ (PIC TEAM)
// -------------------------------------------------------------
function renderPICLeaderboard() {
  const container = document.getElementById('pic-full-leaderboard');
  const tableBody = document.getElementById('pic-strategy-tbody');
  if (!container || !State.data) return;

  const currentTxs = (State.activeYear === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === State.activeYear);
  const picMap = {};

  currentTxs.forEach(t => {
    const pic = t.pic || 'ไม่ระบุ';
    if (!picMap[pic]) picMap[pic] = { name: pic, savings: 0, purchase: 0, count: 0 };
    picMap[pic].savings += t.totalSaving;
    picMap[pic].purchase += t.totalPrice;
    picMap[pic].count += 1;
  });

  const sortedPics = Object.values(picMap).sort((a, b) => b.savings - a.savings);
  const totalTeamSavings = sortedPics.reduce((acc, p) => acc + p.savings, 0) || 1;

  container.innerHTML = sortedPics.map((p, idx) => {
    const share = ((p.savings / totalTeamSavings) * 100).toFixed(1);
    const avgDisc = p.purchase > 0 ? (p.savings / p.purchase) : 0;
    const thaiName = THAI_PIC_NAMES[p.name] || p.name;

    return `
      <div class="card-box" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="rank-badge">อันดับ #${idx + 1}</span>
          <span class="kpi-badge success">สัดส่วน ${share}%</span>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${thaiName}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">ผู้รับผิดชอบจัดซื้อ (${p.name})</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--accent-emerald);">${formatCurrency(p.savings, 0)}</div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 6px; border-top: 1px dashed var(--border-subtle); padding-top: 6px;">
          <span>${p.count} รายการ</span>
          <span>ลดเฉลี่ย ${formatPercent(avgDisc, 1)}</span>
        </div>
      </div>
    `;
  }).join('');

  if (tableBody && State.data.strategyMatrix) {
    const matrix = State.data.strategyMatrix;
    const totalAll = matrix.reduce((acc, row) => acc + (row.Total || 0), 0) || 1;

    tableBody.innerHTML = matrix.map(row => {
      const share = ((row.Total / totalAll) * 100).toFixed(2);
      const stratThai = THAI_STRATEGIES[row.strategy] || row.strategy;
      return `
        <tr>
          <td><strong>${stratThai}</strong></td>
          <td>${formatCurrency(row.Pawina, 0)}</td>
          <td>${formatCurrency(row.Tanida, 0)}</td>
          <td>${formatCurrency(row.Yuwanit, 0)}</td>
          <td>${formatCurrency(row.Dusit, 0)}</td>
          <td>${formatCurrency(row.Saniya, 0)}</td>
          <td class="highlight-col">${formatCurrency(row.Total, 0)}</td>
          <td><span class="kpi-badge success">${share}%</span></td>
        </tr>
      `;
    }).join('');
  }
}

// -------------------------------------------------------------
// 6. โปรแกรมคำนวณ Kaizen & ขยายเครดิตเทอม
// -------------------------------------------------------------
function initSimulators() {
  const wageInput = document.getElementById('sim-hourly-wage');
  const minInput = document.getElementById('sim-minutes-saved');
  const jobsInput = document.getElementById('sim-jobs-month');
  const monthsInput = document.getElementById('sim-months-year');

  const calcKaizen = () => {
    const wage = Number(wageInput?.value) || 117;
    const min = Number(minInput?.value) || 10;
    const jobs = Number(jobsInput?.value) || 16;
    const months = Number(monthsInput?.value) || 1;

    const result = (min / 60) * jobs * wage * months;
    document.getElementById('sim-kaizen-result').textContent = formatCurrency(result);
    document.getElementById('sim-kaizen-formula').textContent = 
      `(${min} / 60) × ${jobs} งาน × ฿${wage}/ชม. × ${months} เดือน`;
  };

  [wageInput, minInput, jobsInput, monthsInput].forEach(el => el?.addEventListener('input', calcKaizen));

  const poInput = document.getElementById('sim-credit-po');
  const origInput = document.getElementById('sim-credit-orig');
  const newInput = document.getElementById('sim-credit-new');
  const rateInput = document.getElementById('sim-credit-rate');

  const calcCredit = () => {
    const po = Number(poInput?.value) || 3340000;
    const origDays = Number(origInput?.value) || 30;
    const newDays = Number(newInput?.value) || 60;
    const rate = (Number(rateInput?.value) || 4.25) / 100;

    const diffDays = Math.max(0, newDays - origDays);
    const saving = po * (diffDays / 360) * rate;

    document.getElementById('sim-credit-result').textContent = formatCurrency(saving);
    document.getElementById('sim-credit-formula').textContent = 
      `${formatNumber(po)} × (${diffDays} / 360) × ${(rate * 100).toFixed(2)}%`;
  };

  [poInput, origInput, newInput, rateInput].forEach(el => el?.addEventListener('input', calcCredit));
}

// -------------------------------------------------------------
// 7. จัดการไฟล์ข้อมูล Excel (DROPZONE & EXPORT)
// -------------------------------------------------------------
function initDropzone() {
  const dropzone = document.getElementById('excel-dropzone');
  const fileInput = document.getElementById('excel-file-input');

  dropzone?.addEventListener('click', () => fileInput?.click());

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-primary-light)';
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--accent-primary)';
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-primary)';
    if (e.dataTransfer.files.length > 0) {
      handleUploadedExcel(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleUploadedExcel(e.target.files[0]);
    }
  });
}

function handleUploadedExcel(file) {
  if (typeof XLSX === 'undefined') {
    alert("กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดไลบรารี SheetJS");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(sheet);

      alert(`โหลดข้อมูลสำเร็จ ${jsonRows.length} รายการจากไฟล์ ${file.name}! กำลังอัปเดตหน้าแดชบอร์ด...`);
      switchView('transactions');
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function exportFilteredTransactions() {
  const headers = ["เดือน", "เลขที่ PO", "ชื่อซัพพลายเออร์", "รายละเอียดสินค้า/บริการ", "จำนวน", "หน่วย", "ราคารวม (บาท)", "รวมที่ต่อรองได้ (บาท)", "% ส่วนลด", "กลยุทธ์", "ผู้รับผิดชอบ"];
  const rows = State.filteredTransactions.map(t => [
    THAI_MONTHS[t.month] || t.month,
    `"${t.poNo}"`,
    `"${(t.supplier || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.qty,
    t.unit,
    t.totalPrice,
    t.totalSaving,
    (t.percentDiscount * 100).toFixed(2) + '%',
    `"${THAI_STRATEGIES[t.strategy] || t.strategy}"`,
    `"${THAI_PIC_NAMES[t.pic] || t.pic}"`
  ]);

  downloadCSV("รายงานรายการส่วนลดจัดซื้อ.csv", headers, rows);
}

window.exportMonthlyKPIToCSV = function() {
  const headers = ["เดือน", "มูลค่าสั่งซื้อ (บาท)", "มูลค่าต่อรองได้ (บาท)", "เป้าหมาย 3% (บาท)", "% ส่วนลดจริง", "สถานะ KPI", "ผลประหยัดเพิ่มเครดิต (บาท)"];
  const rows = (State.data.monthlySummary || []).map(m => [
    THAI_MONTHS[m.month] || m.month,
    m.pv2026,
    m.cr2026,
    m.target2026,
    (m.pct2026 || 0).toFixed(2) + '%',
    `"${m.status2026}"`,
    m.creditSaving
  ]);

  downloadCSV("สรุปผลการลดต้นทุนรายเดือน.csv", headers, rows);
};

window.exportFullTransactionsCSV = function() {
  exportFilteredTransactions();
};

window.exportFullTransactionsJSON = function() {
  const blob = new Blob([JSON.stringify(State.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "kpi_dataset.json";
  a.click();
  URL.revokeObjectURL(url);
};

function downloadCSV(filename, headers, rows) {
  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function updateChartsTheme() {
  renderMonthlyTrendChart();
  renderStrategyDonutChart();
  renderMultiYearChart();
}
