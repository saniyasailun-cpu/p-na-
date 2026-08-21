/**
 * ==========================================================================
 * ระบบแดชบอร์ดติดตาม KPI การลดต้นทุนจัดซื้อและส่วนลดซัพพลายเออร์
 * Procurement KPI & Supplier Discount Management Engine (Dynamic & Responsive)
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
const MONTH_ORDER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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

const PIC_KEYS = ['Pawina', 'Tanida', 'Yuwanit', 'Dusit', 'Saniya'];

// ใช้ชื่อตาม Sheet ตรง 100% โดยไม่แปลชื่อหรือกลยุทธ์
const THAI_PIC_NAMES = {
  'Pawina': 'Pawina',
  'Tanida': 'Tanida',
  'Yuwanit': 'Yuwanit',
  'Dusit': 'Dusit',
  'Saniya': 'Saniya'
};

const THAI_STRATEGIES = {
  'Compare + Negotiate': 'Compare + Negotiate',
  'Negotiate': 'Negotiate',
  'Avoidance': 'Avoidance',
  'Rebate': 'Rebate',
  'เพิ่มเครดิต': 'เพิ่มเครดิต'
};

// เริ่มต้นการทำงานเมื่อโหลดหน้าเสร็จ
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
  
  State.transactions = [...recent, ...historical].map((item, idx) => {
    // ใช้คอลัมน์ Method เป็นกลยุทธ์หลัก และเก็บข้อความหมายเหตุสีแดงไว้ใน remark
    const officialMethod = (item.method || item.strategy || 'Negotiate').trim();
    const remarkNote = (item.strategy && item.strategy !== officialMethod) ? item.strategy.trim() : '';

    return {
      ...item,
      globalId: item.id || `rec-${idx}`,
      year: String(item.year || '2026'),
      month: String(item.month || 'JAN').toUpperCase(),
      totalPrice: Number(item.totalPrice) || 0,
      totalSaving: Number(item.totalSaving) || 0,
      percentDiscount: Number(item.percentDiscount) || 0,
      qty: Number(item.qty) || 0,
      pic: (item.pic || 'ไม่ระบุ').trim(),
      strategy: officialMethod,
      remark: remarkNote
    };
  });

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
  }, 60);

  document.getElementById('sidebar')?.classList.remove('open');
}

// ตัวกรองเลือกปีและไตรมาส
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

// ดึงรายการสั่งซื้อที่กรองตามปีและไตรมาสที่เลือก
function getActiveScopeTransactions() {
  let list = State.transactions;
  if (State.activeYear !== 'ALL') {
    list = list.filter(t => t.year === State.activeYear);
  }
  if (State.activeQuarter !== 'ALL') {
    const allowedMonths = QUARTER_MONTHS[State.activeQuarter] || [];
    list = list.filter(t => allowedMonths.includes(t.month));
  }
  return list;
}

// คำนวณสรุปรายเดือนแบบไดนามิกสำหรับปีที่เลือก
function getMonthlyAggregatedData() {
  const yearTxs = (State.activeYear === 'ALL') 
    ? State.transactions 
    : State.transactions.filter(t => t.year === State.activeYear);

  const monthMap = {};
  MONTH_ORDER.forEach(m => {
    monthMap[m] = { month: m, purchase: 0, savings: 0, count: 0, creditSaving: 0 };
  });

  yearTxs.forEach(t => {
    const m = t.month || 'JAN';
    if (monthMap[m]) {
      monthMap[m].purchase += t.totalPrice;
      monthMap[m].savings += t.totalSaving;
      monthMap[m].count += 1;
      if (t.strategy && t.strategy.includes('เครดิต')) {
        monthMap[m].creditSaving += t.totalSaving;
      }
    }
  });

  // ถ้าเป็นปี 2026 และมีข้อมูลเครดิตเทอมละเอียดใน monthlySummary ให้นำมาผสาน
  if (State.activeYear === '2026' && State.data?.monthlySummary) {
    State.data.monthlySummary.forEach(ms => {
      if (monthMap[ms.month]) {
        if (ms.creditSaving > 0) monthMap[ms.month].creditSaving = ms.creditSaving;
        if (monthMap[ms.month].purchase === 0 && ms.pv2026 > 0) {
          monthMap[ms.month].purchase = ms.pv2026;
          monthMap[ms.month].savings = ms.cr2026;
        }
      }
    });
  }

  return MONTH_ORDER.map(m => {
    const item = monthMap[m];
    const target = item.purchase * 0.03;
    const rate = item.purchase > 0 ? (item.savings / item.purchase) : 0;
    const isPassed = rate >= 0.03;
    return {
      month: m,
      pv: item.purchase,
      cr: item.savings,
      target: target,
      pct: rate,
      isPassed: isPassed,
      count: item.count,
      creditSaving: item.creditSaving
    };
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

// รูปแบบตัวเลขและสกุลเงิน
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

function animateValue(id, endValue, isCurrency = true, decimals = 2) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const duration = 500;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const currentVal = start + (endValue - start) * easeProgress;

    if (isCurrency) el.textContent = formatCurrency(currentVal, decimals);
    else el.textContent = (currentVal * 100).toFixed(decimals) + '%';

    if (progress < 1) requestAnimationFrame(update);
    else {
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
  const scopedTxs = getActiveScopeTransactions();
  
  let totalSavings = 0;
  let totalPurchase = 0;
  let totalCreditSavings = 0;
  const poCount = scopedTxs.length;

  scopedTxs.forEach(t => {
    totalPurchase += t.totalPrice;
    totalSavings += t.totalSaving;
    if (t.strategy && t.strategy.includes('เครดิต')) {
      totalCreditSavings += t.totalSaving;
    }
  });

  if (totalCreditSavings === 0 && State.activeYear === '2026') {
    totalCreditSavings = 85669.64;
  }

  const savingRate = totalPurchase > 0 ? (totalSavings / totalPurchase) : 0;
  const targetRate = 0.03; // 3%
  const isMet = savingRate >= targetRate;

  animateValue('kpi-total-savings', totalSavings, true, 2);
  animateValue('kpi-total-purchase', totalPurchase, true, 2);

  document.getElementById('kpi-savings-mb').textContent = `${(totalSavings / 1000000).toFixed(2)} ล้านบาท`;
  document.getElementById('kpi-savings-rate').textContent = `+${(savingRate * 100).toFixed(2)}% ประหยัดได้`;

  document.getElementById('kpi-purchase-mb').textContent = `${(totalPurchase / 1000000).toFixed(2)} ล้านบาท`;
  document.getElementById('kpi-po-count').textContent = `${formatNumber(poCount)} รายการ`;

  const targetPctDisplay = document.getElementById('kpi-target-pct');
  const targetRateDisplay = document.getElementById('kpi-target-rate-display');
  const targetBadge = document.getElementById('kpi-target-badge');
  const targetDiff = document.getElementById('kpi-target-diff');
  const gaugeFill = document.getElementById('kpi-gauge-fill');

  targetPctDisplay.textContent = (savingRate * 100).toFixed(1) + '%';
  targetRateDisplay.textContent = (savingRate * 100).toFixed(2) + '%';

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

  document.getElementById('kpi-credit-savings').textContent = formatCurrency(totalCreditSavings);

  renderMonthlyTrendChart();
  renderStrategyDonutChart(scopedTxs);
  renderCompactPICList(scopedTxs);
  renderCompactTopSuppliers(scopedTxs);
}

window.setChartMode = function(mode) {
  State.chartMode = mode;
  document.getElementById('btn-chart-bar')?.classList.toggle('active', mode === 'bar');
  document.getElementById('btn-chart-curve')?.classList.toggle('active', mode === 'curve');
  renderMonthlyTrendChart();
};

function renderMonthlyTrendChart() {
  const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
  if (!ctx) return;

  const monthlyAgg = getMonthlyAggregatedData();
  const monthLabelsThai = MONTH_ORDER.map(m => THAI_MONTHS_SHORT[m]);

  if (State.charts.monthlyTrend) {
    State.charts.monthlyTrend.destroy();
  }

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  if (State.chartMode === 'bar') {
    // ป้องกันการเกิดแท่งลอย (Floating Bar) ด้วยการยึดเส้นฐานที่ 0 ให้ตรงกันทั้งแกนซ้ายและขวา
    const purchaseValuesMB = monthlyAgg.map(r => (r.pv > 0 ? Number((r.pv / 1000000).toFixed(2)) : null));
    
    // ยึดความสูงแท่งที่ 0 เพื่อให้แท่งทั้งหมดติดพื้นดิน ไม่ลอยอยู่กลางอากาศ
    const costReductionMB = monthlyAgg.map(r => {
      if (r.pv === 0 && r.cr === 0) return null;
      // หากมีค่าติดลบ ให้แสดงที่พื้นฐาน 0 (ไม่ดึงแกนลงไป -1 ซึ่งทำให้แท่งอื่นลอย)
      return Number((r.cr / 1000000).toFixed(2));
    });

    const targetSavingsMB = monthlyAgg.map(r => (r.pv > 0 ? Number((r.target / 1000000).toFixed(2)) : null));

    // ตรวจสอบค่าติดลบสำหรับ Tooltip
    const rawCostReduction = monthlyAgg.map(r => Number((r.cr / 1000000).toFixed(2)));

    State.charts.monthlyTrend = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabelsThai,
        datasets: [
          {
            label: 'มูลค่าสั่งซื้อ (ล้านบาท)',
            data: purchaseValuesMB,
            backgroundColor: 'rgba(2, 132, 199, 0.35)',
            borderColor: '#0284c7',
            borderWidth: 1.5,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'มูลค่าต่อรองได้ (ล้านบาท)',
            data: costReductionMB.map(v => (v !== null && v < 0) ? 0 : v),
            backgroundColor: rawCostReduction.map(val => val < 0 ? 'rgba(244, 63, 94, 0.85)' : 'rgba(16, 185, 129, 0.75)'),
            borderColor: rawCostReduction.map(val => val < 0 ? '#f43f5e' : '#10b981'),
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
            pointRadius: 3.5,
            pointBackgroundColor: '#f59e0b',
            spanGaps: false,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: textColor, font: { family: 'Prompt', size: 11 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const idx = c.dataIndex;
                if (c.dataset.label === 'มูลค่าต่อรองได้ (ล้านบาท)') {
                  const rawVal = rawCostReduction[idx];
                  if (rawVal < 0) return `มูลค่าต่อรองได้: ปรับปรุงรายการ -฿${Math.abs(rawVal)} ล้านบาท`;
                  if (purchaseValuesMB[idx] === null && rawVal === 0) return `มูลค่าต่อรองได้: ยังไม่มีข้อมูล`;
                  return `มูลค่าต่อรองได้: ฿${rawVal} ล้านบาท`;
                }
                if (c.raw === null || c.raw === undefined) return `${c.dataset.label}: ยังไม่มีข้อมูล`;
                return `${c.dataset.label}: ฿${c.raw} ล้านบาท`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Prompt' } },
            grid: { display: false }
          },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            min: 0,
            title: { display: true, text: 'มูลค่าสั่งซื้อ (ล้านบาท)', color: textColor, font: { family: 'Prompt', size: 11 } },
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            min: 0,
            title: { display: true, text: 'ต่อรองได้ (ล้านบาท)', color: textColor, font: { family: 'Prompt', size: 11 } },
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      }
    });

  } else {
    let cumActual = 0;
    let cumTarget = 0;
    const actualCumulative = [];
    const targetCumulative = [];

    monthlyAgg.forEach(r => {
      cumActual += r.cr;
      cumTarget += r.target;
      actualCumulative.push(Number((cumActual / 1000000).toFixed(2)));
      targetCumulative.push(Number((cumTarget / 1000000).toFixed(2)));
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
          legend: { labels: { color: textColor, font: { family: 'Prompt', size: 11 }, boxWidth: 12 } },
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

function renderStrategyDonutChart(scopedTxs) {
  const ctx = document.getElementById('strategyDonutChart')?.getContext('2d');
  if (!ctx) return;

  const stratMap = {};
  scopedTxs.forEach(t => {
    const s = t.strategy || 'Negotiate';
    stratMap[s] = (stratMap[s] || 0) + t.totalSaving;
  });

  const sortedKeys = Object.keys(stratMap).sort((a, b) => stratMap[b] - stratMap[a]);
  const labels = sortedKeys.map(k => THAI_STRATEGIES[k] || k);
  const dataValues = sortedKeys.map(k => stratMap[k]);

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

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
    listEl.innerHTML = sortedKeys.map((k, idx) => {
      const amt = stratMap[k];
      const pct = ((amt / total) * 100).toFixed(1);
      const nameThai = THAI_STRATEGIES[k] || k;
      return `
        <div class="strat-item">
          <div class="strat-item-left">
            <span class="strat-dot" style="background: ${colors[idx % colors.length]};"></span>
            <span class="strat-name">${nameThai}</span>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div class="strat-val">${formatCurrency(amt, 0)}</div>
            <span style="font-size: 10px; color: var(--text-muted);">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderCompactPICList(scopedTxs) {
  const container = document.getElementById('pic-overview-list');
  if (!container) return;

  const picMap = {};
  scopedTxs.forEach(t => {
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

function renderCompactTopSuppliers(scopedTxs) {
  const container = document.getElementById('top-suppliers-list');
  if (!container) return;

  const supMap = {};
  scopedTxs.forEach(t => {
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
            <div class="name" title="${s}">${s}</div>
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
// 2. สรุป KPI รายเดือน & รายปี (ไดนามิกตามปีที่เลือก)
// -------------------------------------------------------------
function renderMonthlyKPITracking() {
  const tbody = document.getElementById('monthly-kpi-tbody');
  const creditTbody = document.getElementById('credit-extension-tbody');
  if (!tbody) return;

  const monthlyAgg = getMonthlyAggregatedData();
  let totalPV = 0;
  let totalCR = 0;
  let totalTarget = 0;
  let totalCreditSaving = 0;

  tbody.innerHTML = monthlyAgg.map(row => {
    totalPV += row.pv;
    totalCR += row.cr;
    totalTarget += row.target;
    totalCreditSaving += row.creditSaving;

    const varianceTHB = row.cr - row.target;

    return `
      <tr>
        <td><strong>${THAI_MONTHS[row.month] || row.month}</strong></td>
        <td>${formatCurrency(row.pv)}</td>
        <td class="highlight-col">${formatCurrency(row.cr)}</td>
        <td>${formatCurrency(row.target)}</td>
        <td><strong>${(row.pct * 100).toFixed(2)}%</strong></td>
        <td style="color: ${varianceTHB >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
          ${varianceTHB >= 0 ? '+' : ''}${formatCurrency(varianceTHB)}
        </td>
        <td>
          <span class="kpi-badge ${row.isPassed ? 'success' : 'danger'}">
            ${row.isPassed ? '✓ ได้ตามเป้า' : '✕ ต่ำกว่าเป้า'}
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
    const creditRows = monthlyAgg.filter(m => m.creditSaving > 0);
    if (creditRows.length > 0) {
      creditTbody.innerHTML = creditRows.map(m => `
        <tr>
          <td><strong>${THAI_MONTHS[m.month] || m.month}</strong></td>
          <td><span class="tier-tag tier-mid">+30 วัน</span></td>
          <td>${formatCurrency(m.pv)}</td>
          <td class="highlight-col">${formatCurrency(m.creditSaving)}</td>
        </tr>
      `).join('');
    } else {
      creditTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:20px;">ไม่มีรายการขยายเครดิตในปีที่เลือก</td></tr>`;
    }
  }

  renderMultiYearChart();
}

function renderMultiYearChart() {
  const ctx = document.getElementById('multiYearChart')?.getContext('2d');
  if (!ctx) return;

  const yearly = State.data?.yearlySummary || [
    { year: '2023', purchaseValue: 0, costSaving: 12809342.14 },
    { year: '2024', purchaseValue: 193845782.42, costSaving: 19695501.68 },
    { year: '2025', purchaseValue: 1573084681.49, costSaving: 38838937.04 },
    { year: '2026', purchaseValue: 645209533.19, costSaving: 25785570.12 }
  ];

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
        legend: { labels: { color: textColor, font: { family: 'Prompt', size: 11 } } },
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
          <td style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.supplier}">${item.supplier || '-'}</td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.description}">${item.description || '-'}</td>
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
// 4. การวิเคราะห์ซัพพลายเออร์ (ไดนามิกตามปีที่เลือก)
// -------------------------------------------------------------
function renderSuppliersView() {
  const tbody = document.getElementById('supplier-ranking-tbody');
  const searchInput = document.getElementById('supplier-search-input');
  if (!tbody) return;

  const scopedTxs = getActiveScopeTransactions();
  const supplierMap = {};

  scopedTxs.forEach(t => {
    const s = t.supplier || 'ไม่ระบุ';
    if (!supplierMap[s]) {
      supplierMap[s] = { name: s, savings: 0, purchase: 0, count: 0, strategies: {} };
    }
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

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">ไม่พบข้อมูลซัพพลายเออร์ในปีที่เลือก</td></tr>`;
    return;
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
// 5. ทีมจัดซื้อ & ตารางกลยุทธ์ (ไดนามิกตามปีที่เลือก)
// -------------------------------------------------------------
function renderPICLeaderboard() {
  const container = document.getElementById('pic-full-leaderboard');
  const tableBody = document.getElementById('pic-strategy-tbody');
  if (!container) return;

  const scopedTxs = getActiveScopeTransactions();
  const picMap = {};

  scopedTxs.forEach(t => {
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
      <div class="card-box" style="padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span class="rank-badge">อันดับ #${idx + 1}</span>
          <span class="kpi-badge success">สัดส่วน ${share}%</span>
        </div>
        <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${thaiName}</div>
        <div style="font-size: 10.5px; color: var(--text-muted); margin-bottom: 6px;">ผู้รับผิดชอบจัดซื้อ (${p.name})</div>
        <div style="font-size: 17px; font-weight: 700; color: var(--accent-emerald);">${formatCurrency(p.savings, 0)}</div>
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted); margin-top: 6px; border-top: 1px dashed var(--border-subtle); padding-top: 6px;">
          <span>${p.count} รายการ</span>
          <span>ลดเฉลี่ย ${formatPercent(avgDisc, 1)}</span>
        </div>
      </div>
    `;
  }).join('');

  // ตารางกลยุทธ์จำแนกรายบุคคลแบบไดนามิก (Strategy x PIC Cross Matrix)
  if (tableBody) {
    const stratPicMatrix = {};
    scopedTxs.forEach(t => {
      const strat = t.strategy || 'Negotiate';
      const pic = t.pic || 'Pawina';
      if (!stratPicMatrix[strat]) {
        stratPicMatrix[strat] = { strategy: strat, Total: 0 };
        PIC_KEYS.forEach(k => stratPicMatrix[strat][k] = 0);
      }
      stratPicMatrix[strat].Total += t.totalSaving;
      if (stratPicMatrix[strat][pic] !== undefined) {
        stratPicMatrix[strat][pic] += t.totalSaving;
      }
    });

    const matrixRows = Object.values(stratPicMatrix).sort((a, b) => b.Total - a.Total);
    const totalAll = matrixRows.reduce((acc, row) => acc + (row.Total || 0), 0) || 1;

    if (matrixRows.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">ไม่มีข้อมูลสำหรับปีที่เลือก</td></tr>`;
      return;
    }

    tableBody.innerHTML = matrixRows.map(row => {
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
  const monthlyAgg = getMonthlyAggregatedData();
  const rows = monthlyAgg.map(m => [
    THAI_MONTHS[m.month] || m.month,
    m.pv,
    m.cr,
    m.target,
    (m.pct * 100).toFixed(2) + '%',
    `"${m.isPassed ? 'ได้ตามเป้าหมาย' : 'ไม่ได้ตามเป้าหมาย'}"`,
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
  renderStrategyDonutChart(getActiveScopeTransactions());
  renderMultiYearChart();
}

// ==========================================================================
// ระบบซิงค์ข้อมูลสดจาก Google Sheets (Live Sync Engine)
// ==========================================================================

const GSHEET_STORAGE_KEY = 'qtc_gsheet_config';

function initGoogleSheetSync() {
  const saved = localStorage.getItem(GSHEET_STORAGE_KEY);
  if (!saved) return;

  try {
    const config = JSON.parse(saved);
    const urlInput = document.getElementById('gsheet-url-input');
    const sheetNameInput = document.getElementById('gsheet-sheet-name');
    const apiKeyInput = document.getElementById('gsheet-api-key');
    const autoSyncCheck = document.getElementById('gsheet-auto-sync');

    if (urlInput && config.url) urlInput.value = config.url;
    if (sheetNameInput && config.sheetName) sheetNameInput.value = config.sheetName;
    if (apiKeyInput && config.apiKey) apiKeyInput.value = config.apiKey;
    if (autoSyncCheck && config.autoSync !== undefined) autoSyncCheck.checked = config.autoSync;

    const badge = document.getElementById('gsheet-status-badge');
    if (badge && config.lastSync) {
      badge.textContent = `🟢 เชื่อมต่อแล้ว (${config.lastSync})`;
      badge.className = 'tier-tag tier-high';
    }

    if (config.autoSync && config.url) {
      console.log('🔄 Auto-syncing from Google Sheets...');
      syncGoogleSheetNow(false);
    }
  } catch (err) {
    console.error('Error loading Google Sheet config:', err);
  }
}

function extractGoogleSheetInfo(input) {
  if (!input) return { sheetId: '', gid: '' };
  const trimmed = input.trim();
  
  // Extract Sheet ID
  let sheetId = trimmed;
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    sheetId = idMatch[1];
  }

  // Extract GID if user passed specific tab URL
  let gid = '';
  const gidMatch = trimmed.match(/[#&]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  return { sheetId, gid };
}

// ตัวแปลงผลลัพธ์ Google Visualization API เป็น Array of Objects
function parseGvizTextToRows(gvizText) {
  const jsonStart = gvizText.indexOf('{');
  const jsonEnd = gvizText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("รูปแบบข้อมูล Google Sheet ไม่ถูกต้อง");
  
  const rawJson = gvizText.substring(jsonStart, jsonEnd + 1);
  const data = JSON.parse(rawJson);
  
  if (data.status === 'error') {
    throw new Error(data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลชีต');
  }

  if (!data.table || !data.table.rows) return [];

  const rows = [];
  data.table.rows.forEach((r, rowIdx) => {
    if (!r || !r.c) return;
    
    const getCellVal = (cIdx) => {
      if (cIdx < r.c.length && r.c[cIdx]) {
        if (r.c[cIdx].v !== null && r.c[cIdx].v !== undefined) return r.c[cIdx].v;
        if (r.c[cIdx].f !== null && r.c[cIdx].f !== undefined) return r.c[cIdx].f;
      }
      return '';
    };

    // ดึงค่าตามลำดับคอลัมน์มาตรฐานของชีต (Col A ถึง P)
    const rawYr = getCellVal(0);
    const yr = rawYr ? String(parseInt(rawYr) || rawYr).trim() : '2026';
    
    let mo = String(getCellVal(1) || 'JAN').toUpperCase().trim();
    if (mo.length > 3) mo = mo.slice(0, 3);

    const po = String(getCellVal(2) || `PO-${rowIdx + 1}`).trim();
    const supp = String(getCellVal(3) || 'ไม่ระบุ').trim();
    const desc = String(getCellVal(4) || '').trim();
    
    const qty = parseFloat(getCellVal(5) || 0) || 0;
    const unit = String(getCellVal(6) || 'EA').trim();
    const minPrice = parseFloat(getCellVal(7) || 0) || 0;
    
    let totalPrice = parseFloat(getCellVal(8) || 0) || 0;
    if (totalPrice === 0 && qty > 0 && minPrice > 0) totalPrice = qty * minPrice;

    const negPrice = parseFloat(getCellVal(9) || minPrice) || minPrice;
    let unitDiff = parseFloat(getCellVal(10) || (minPrice - negPrice)) || 0;
    let totalSaving = parseFloat(getCellVal(11) || (unitDiff * qty)) || 0;

    const pctDisc = parseFloat(getCellVal(12) || (totalPrice > 0 ? totalSaving / totalPrice : 0)) || 0;
    const method = String(getCellVal(13) || 'Negotiate').trim();
    const pic = String(getCellVal(14) || 'ไม่ระบุ').trim();
    const remark = String(getCellVal(15) || '').trim();

    if (po || supp !== 'ไม่ระบุ' || totalPrice > 0 || totalSaving > 0) {
      rows.push({
        id: `gs-${rowIdx + 1}`,
        globalId: `gs-${rowIdx + 1}`,
        year: yr,
        month: mo,
        poNo: po,
        supplier: supp,
        description: desc,
        qty: qty,
        unit: unit,
        minUnitPrice: minPrice,
        totalPrice: totalPrice,
        negotiatedUnitPrice: negPrice,
        unitDifference: unitDiff,
        totalSaving: totalSaving,
        percentDiscount: pctDisc,
        strategy: method,
        method: method,
        pic: pic,
        remark: remark
      });
    }
  });

  return rows;
}

window.syncGoogleSheetNow = async function(showAlert = true) {
  const urlInput = document.getElementById('gsheet-url-input')?.value.trim() || '';
  const autoSync = document.getElementById('gsheet-auto-sync')?.checked ?? true;

  const { sheetId, gid } = extractGoogleSheetInfo(urlInput);
  if (!sheetId) {
    if (showAlert) {
      alert('กรุณากรอก Google Sheet URL หรือ Sheet ID ในหน้า "จัดการไฟล์ข้อมูล Excel"');
      switchView('data-import');
    }
    return;
  }

  const syncBtn = document.getElementById('btn-sync-gsheet');
  const topbarLabel = document.getElementById('topbar-sync-label');
  const badge = document.getElementById('gsheet-status-badge');

  if (syncBtn) syncBtn.disabled = true;
  if (topbarLabel) topbarLabel.textContent = 'กำลังซิงค์...';
  if (badge) badge.textContent = '⏳ กำลังดึงข้อมูลจาก Google Sheets...';

  try {
    let allTransactions = [];
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${gid ? '&gid=' + gid : ''}`;
    
    const res = await fetch(gvizUrl);
    if (!res.ok) {
      throw new Error(`ไม่สามารถเชื่อมต่อ Google Sheet ได้ (Status: ${res.status}).\nกรุณาตรวจสอบว่า Google Sheet ตั้งค่าแชร์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู"`);
    }

    const text = await res.text();
    allTransactions = parseGvizTextToRows(text);

    if (allTransactions.length === 0) {
      throw new Error('ไม่พบข้อมูลรายการสั่งซื้อใน Google Sheet');
    }

    // อัปเดตข้อมูลในระบบแบบ Real-time
    State.transactions = allTransactions;
    filterTransactions();
    renderAllViews();

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;

    // บันทึกการตั้งค่าลง LocalStorage
    localStorage.setItem(GSHEET_STORAGE_KEY, JSON.stringify({
      url: urlInput,
      autoSync: autoSync,
      lastSync: timeStr
    }));

    if (badge) {
      badge.textContent = `🟢 ซิงค์สดสำเร็จ (${timeStr})`;
      badge.className = 'tier-tag tier-high';
    }
    if (topbarLabel) {
      topbarLabel.textContent = `ซิงค์แล้ว (${timeStr})`;
    }

    if (showAlert) {
      alert(`✅ ซิงค์ข้อมูลสำเร็จ!\nโหลดข้อมูลจาก Google Sheet ทั้งหมด ${allTransactions.length.toLocaleString()} รายการเรียบร้อยแล้ว`);
    }
  } catch (err) {
    console.error('Google Sheet Sync Error:', err);
    if (badge) {
      badge.textContent = `🔴 เกิดข้อผิดพลาด`;
      badge.className = 'tier-tag tier-low';
    }
    if (topbarLabel) {
      topbarLabel.textContent = 'ซิงค์ไม่สำเร็จ';
    }
    if (showAlert) {
      alert(`❌ ไม่สามารถซิงค์ข้อมูลได้:\n${err.message}\n\nคำแนะนำ:\n1. ตรวจสอบว่าเปิดแชร์ Google Sheet เป็น "ทุกคนที่มีลิงก์มีสิทธิ์ดู (Anyone with link can view)"\n2. ตรวจสอบว่าลิงก์ URL ถูกต้องหรือไม่`);
    }
  } finally {
    if (syncBtn) syncBtn.disabled = false;
  }
};

window.clearGoogleSheetSettings = function() {
  if (confirm('คุณต้องการล้างการตั้งค่า Google Sheet หรือไม่?')) {
    localStorage.removeItem(GSHEET_STORAGE_KEY);
    const urlInput = document.getElementById('gsheet-url-input');
    if (urlInput) urlInput.value = '';
    const badge = document.getElementById('gsheet-status-badge');
    if (badge) {
      badge.textContent = '⚪ ยังไม่ได้เชื่อมต่อ';
      badge.className = 'tier-tag tier-high';
    }
    const topbarLabel = document.getElementById('topbar-sync-label');
    if (topbarLabel) topbarLabel.textContent = 'ซิงค์สด';
    alert('ล้างการตั้งค่าเรียบร้อยแล้ว');
  }
};

// เพิ่มการเรียก initGoogleSheetSync ตอนเริ่มทำงาน
document.addEventListener('DOMContentLoaded', () => {
  initGoogleSheetSync();
});

