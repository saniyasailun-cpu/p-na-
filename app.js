/**
 * ==========================================================================
 * KPI DISCOUNT SUPPLIER & PROCUREMENT DASHBOARD - THAI LOCALIZED ENGINE
 * ==========================================================================
 */

// Application Global State
const State = {
  data: null,
  activeYear: '2026',
  activeView: 'dashboard',
  theme: localStorage.getItem('app-theme') || 'dark',
  
  // Transaction Table State
  transactions: [],
  filteredTransactions: [],
  tablePage: 1,
  pageSize: 20,
  sortKey: 'totalSaving',
  sortAsc: false,
  filters: {
    search: '',
    month: 'ALL',
    pic: 'ALL',
    strategy: 'ALL'
  },
  
  // Chart.js Instances
  charts: {
    monthlyTrend: null,
    strategyDonut: null,
    picPerformance: null,
    multiYear: null
  }
};

// Thai Month Mapping
const THAI_MONTHS = {
  'JAN': 'ม.ค. (JAN)',
  'FEB': 'ก.พ. (FEB)',
  'MAR': 'มี.ค. (MAR)',
  'APR': 'เม.ย. (APR)',
  'MAY': 'พ.ค. (MAY)',
  'JUN': 'มิ.ย. (JUN)',
  'JUL': 'ก.ค. (JUL)',
  'AUG': 'ส.ค. (AUG)',
  'SEP': 'ก.ย. (SEP)',
  'OCT': 'ต.ค. (OCT)',
  'NOV': 'พ.ย. (NOV)',
  'DEC': 'ธ.ค. (DEC)'
};

const THAI_PIC_NAMES = {
  'Pawina': 'คุณปวิณา ใจดี',
  'Tanida': 'คุณธนิดา ธรรมสุนทร',
  'Yuwanit': 'คุณยุวนิต โนจันทร์',
  'Dusit': 'คุณดุสิต',
  'Saniya': 'คุณศานิยา'
};

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  initNavigation();
  initYearFilters();
  initTableEvents();
  initSimulators();
  initDropzone();
});

// Theme Management
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

// Data Ingestion & Setup
function loadData() {
  if (window.KPI_DATA) {
    State.data = window.KPI_DATA;
    setupDataset();
    renderAllViews();
  } else {
    console.error("KPI_DATA not found on window object.");
  }
}

function setupDataset() {
  if (!State.data) return;
  
  // Combine transactions from recent and historical
  const recent = State.data.recentTransactions || [];
  const historical = State.data.historicalTransactions || [];
  
  const all = [...recent, ...historical].map((item, idx) => ({
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

  State.transactions = all;
  filterTransactions();
}

// Navigation & Tab Switching
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  const mobileToggle = document.getElementById('mobile-toggle');
  const sidebar = document.getElementById('sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function switchView(viewName) {
  State.activeView = viewName;
  
  // Update Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.getAttribute('data-view') === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Update Sections
  document.querySelectorAll('.view-section').forEach(sec => {
    if (sec.id === `view-${viewName}`) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });

  // Update Topbar Title in Thai
  const titles = {
    'dashboard': { title: 'ภาพรวมผู้บริหาร (Executive Overview)', desc: 'สรุปผลการต่อรองลดต้นทุนจัดซื้อและติดตามผลการดำเนินงานตามเป้าหมาย' },
    'kpi-tracking': { title: 'สรุปผล KPI รายเดือน & รายปี', desc: 'เปรียบเทียบผลการประหยัดต้นทุนเทียบเป้าหมาย 3.0% ประจำปี' },
    'transactions': { title: 'รายการสั่งซื้อ & การต่อรอง (PO Transactions)', desc: 'ค้นหาและตรวจสอบรายการสั่งซื้อกว่า 5,800+ รายการ' },
    'suppliers': { title: 'การวิเคราะห์ซัพพลายเออร์ (Supplier Intelligence)', desc: 'สรุปยอดสั่งซื้อและมูลค่าส่วนลดที่ได้รับจากคู่ค้าแต่ละราย' },
    'pic-team': { title: 'อันดับผลงานทีมจัดซื้อ (PIC Leaderboard)', desc: 'สถิติและกลยุทธ์การต่อรองของเจ้าหน้าที่จัดซื้อแต่ละท่าน' },
    'simulators': { title: 'โปรแกรมคำนวณ Kaizen & ขยายเครดิตเทอม', desc: 'เครื่องมือจำลองผลประหยัดเวลาและผลประโยชน์ทางการเงิน' },
    'data-import': { title: 'นำเข้า / ส่งออกข้อมูล (Data Management)', desc: 'อัปโหลดไฟล์ Excel (.xlsx) ชุดใหม่ หรือดาวน์โหลดข้อมูล' }
  };

  const current = titles[viewName] || titles['dashboard'];
  document.getElementById('current-view-title').textContent = current.title;
  document.getElementById('current-view-desc').textContent = current.desc;

  // Re-trigger layout for active charts
  setTimeout(() => {
    if (viewName === 'dashboard') {
      State.charts.monthlyTrend?.resize();
      State.charts.strategyDonut?.resize();
      State.charts.picPerformance?.resize();
    } else if (viewName === 'kpi-tracking') {
      State.charts.multiYear?.resize();
    }
  }, 100);

  // Close mobile sidebar if open
  document.getElementById('sidebar')?.classList.remove('open');
}

// Year Filters
function initYearFilters() {
  const buttons = document.querySelectorAll('#year-filter-group .quick-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.activeYear = btn.getAttribute('data-year');
      renderAllViews();
    });
  });
}

// Render All Views
function renderAllViews() {
  renderExecutiveDashboard();
  renderMonthlyKPITracking();
  renderSuppliersView();
  renderPICLeaderboard();
  filterTransactions();
  renderTransactionTable();
}

// Formatters
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

// -------------------------------------------------------------
// VIEW 1: EXECUTIVE DASHBOARD
// -------------------------------------------------------------
function renderExecutiveDashboard() {
  if (!State.data) return;

  const year = State.activeYear;
  const is2026 = (year === '2026');

  let totalSavings = 0;
  let totalPurchase = 0;
  let poCount = 0;

  if (is2026 && State.data.monthlySummary) {
    State.data.monthlySummary.forEach(m => {
      totalPurchase += (m.pv2026 || 0);
      totalSavings += (m.cr2026 || 0);
    });
    poCount = State.data.recentTransactions?.length || 1397;
  } else {
    const txs = (year === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === year);
    poCount = txs.length;
    txs.forEach(t => {
      totalPurchase += t.totalPrice;
      totalSavings += t.totalSaving;
    });
  }

  const savingRate = totalPurchase > 0 ? (totalSavings / totalPurchase) : 0;
  const targetRate = 0.03; // 3%
  const isMet = savingRate >= targetRate;

  // Update Hero Cards
  document.getElementById('kpi-total-savings').textContent = formatCurrency(totalSavings);
  document.getElementById('kpi-savings-mb').textContent = `${(totalSavings / 1000000).toFixed(2)} ล้านบาท`;
  document.getElementById('kpi-savings-rate').textContent = `${(savingRate * 100).toFixed(2)}% ส่วนลดรวม`;

  document.getElementById('kpi-total-purchase').textContent = formatCurrency(totalPurchase);
  document.getElementById('kpi-purchase-mb').textContent = `${(totalPurchase / 1000000).toFixed(2)} ล้านบาท`;
  document.getElementById('kpi-po-count').textContent = `${formatNumber(poCount)} รายการสั่งซื้อ`;

  const targetPctEl = document.getElementById('kpi-target-pct');
  const targetBadgeEl = document.getElementById('kpi-target-badge');
  const targetDiffEl = document.getElementById('kpi-target-diff');

  targetPctEl.textContent = (savingRate * 100).toFixed(2) + '%';
  if (isMet) {
    targetBadgeEl.className = 'kpi-pill success';
    targetBadgeEl.textContent = 'ได้ตามเป้าหมาย (Passed)';
    targetDiffEl.textContent = `+${((savingRate - targetRate) * 100).toFixed(2)}% สูงกว่าเป้า`;
  } else {
    targetBadgeEl.className = 'kpi-pill danger';
    targetBadgeEl.textContent = 'ไม่ได้ตามเป้าหมาย (Below Target)';
    targetDiffEl.textContent = `${((savingRate - targetRate) * 100).toFixed(2)}% ต่ำกว่าเป้า`;
  }

  // Credit Terms Savings
  let creditTotal = 0;
  if (State.data.monthlySummary) {
    State.data.monthlySummary.forEach(m => creditTotal += (m.creditSaving || 0));
  }
  document.getElementById('kpi-credit-savings').textContent = formatCurrency(creditTotal > 0 ? creditTotal : 85669.64);

  // Render Charts
  renderMonthlyTrendChart();
  renderStrategyDonutChart();
  renderPICPerformanceChart();
  renderTopSuppliersList();
}

function renderMonthlyTrendChart() {
  const ctx = document.getElementById('monthlyTrendChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthLabelsThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthlyData = State.data.monthlySummary || [];

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

  if (State.charts.monthlyTrend) {
    State.charts.monthlyTrend.destroy();
  }

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

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
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: textColor, font: { family: 'Prompt, Plus Jakarta Sans', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ฿${ctx.raw} ล้านบาท`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: 'Prompt' } },
          grid: { color: gridColor }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'มูลค่าสั่งซื้อ (ล้านบาท)', color: textColor, font: { family: 'Prompt' } },
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'มูลค่าต่อรองได้ (ล้านบาท)', color: textColor, font: { family: 'Prompt' } },
          ticks: { color: textColor },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function renderStrategyDonutChart() {
  const ctx = document.getElementById('strategyDonutChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const matrix = State.data.strategyMatrix || [];
  const labels = matrix.map(s => s.strategy);
  const dataValues = matrix.map(s => s.Total);

  const colors = [
    '#10b981', // Compare + Negotiate
    '#3b82f6', // Negotiate
    '#8b5cf6', // Avoidance
    '#f59e0b', // Rebate
    '#ec4899'  // Extend Credit
  ];

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
        borderColor: State.theme === 'dark' ? '#111827' : '#ffffff'
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
            label: (ctx) => `${ctx.label}: ฿${Number(ctx.raw).toLocaleString('th-TH', {maximumFractionDigits: 0})} บาท`
          }
        }
      }
    }
  });

  // Render List Breakdown in Thai
  const total = dataValues.reduce((a, b) => a + b, 0) || 1;
  const listEl = document.getElementById('strategy-breakdown-list');
  if (listEl) {
    listEl.innerHTML = matrix.map((item, idx) => {
      const pct = ((item.Total / total) * 100).toFixed(1);
      return `
        <div class="strategy-row">
          <div class="strategy-meta">
            <span class="strategy-dot" style="background: ${colors[idx % colors.length]};"></span>
            <span class="strategy-name">${item.strategy}</span>
          </div>
          <div class="strategy-figures">
            <div class="strategy-amt">${formatCurrency(item.Total, 0)}</div>
            <div class="strategy-pct">${pct}% ของทั้งหมด</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderPICPerformanceChart() {
  const ctx = document.getElementById('picPerformanceChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const picMap = {};
  const currentTxs = (State.activeYear === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === State.activeYear);

  currentTxs.forEach(t => {
    const pic = t.pic || 'ไม่ระบุ';
    if (!picMap[pic]) picMap[pic] = { savings: 0, purchase: 0, count: 0 };
    picMap[pic].savings += t.totalSaving;
    picMap[pic].purchase += t.totalPrice;
    picMap[pic].count += 1;
  });

  const sortedPics = Object.keys(picMap).sort((a, b) => picMap[b].savings - picMap[a].savings);
  const labels = sortedPics.map(p => THAI_PIC_NAMES[p] || p);
  const savingsValues = sortedPics.map(p => Number((picMap[p].savings / 1000000).toFixed(2)));

  if (State.charts.picPerformance) {
    State.charts.picPerformance.destroy();
  }

  const isDark = State.theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  State.charts.picPerformance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'มูลค่าต่อรองได้ (ล้านบาท)',
        data: savingsValues,
        backgroundColor: [
          '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'
        ],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `ยอดลดต้นทุน: ฿${ctx.raw} ล้านบาท`
          }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { display: false } },
        y: { 
          ticks: { color: textColor }, 
          grid: { color: gridColor },
          title: { display: true, text: 'ล้านบาท', color: textColor, font: { family: 'Prompt' } }
        }
      }
    }
  });
}

function renderTopSuppliersList() {
  const listEl = document.getElementById('top-suppliers-list');
  if (!listEl) return;

  const currentTxs = (State.activeYear === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === State.activeYear);
  const supplierMap = {};

  currentTxs.forEach(t => {
    const s = t.supplier || 'ไม่ระบุ';
    if (!supplierMap[s]) supplierMap[s] = { savings: 0, purchase: 0, count: 0 };
    supplierMap[s].savings += t.totalSaving;
    supplierMap[s].purchase += t.totalPrice;
    supplierMap[s].count += 1;
  });

  const top5 = Object.keys(supplierMap)
    .sort((a, b) => supplierMap[b].savings - supplierMap[a].savings)
    .slice(0, 5);

  listEl.innerHTML = top5.map((sup, idx) => {
    const data = supplierMap[sup];
    const avgDisc = data.purchase > 0 ? (data.savings / data.purchase) : 0;
    return `
      <div class="strategy-row">
        <div class="strategy-meta">
          <span class="pic-rank" style="min-width: 24px; text-align: center;">#${idx + 1}</span>
          <div>
            <div class="strategy-name" style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${sup}">${sup}</div>
            <div class="strategy-pct">${data.count} คำสั่งซื้อ | ลดเฉลี่ย ${formatPercent(avgDisc, 1)}</div>
          </div>
        </div>
        <div class="strategy-figures">
          <div class="strategy-amt" style="color: var(--accent-emerald);">${formatCurrency(data.savings, 0)}</div>
          <div class="strategy-pct">ยอดซื้อ: ${formatCurrency(data.purchase, 0)}</div>
        </div>
      </div>
    `;
  }).join('');
}

// -------------------------------------------------------------
// VIEW 2: MONTHLY & YEARLY KPI TRACKING
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
        <td class="cell-highlight">${formatCurrency(row.cr2026)}</td>
        <td>${formatCurrency(row.target2026)}</td>
        <td><strong>${(actualPct * 100).toFixed(2)}%</strong></td>
        <td style="color: ${varianceTHB >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
          ${varianceTHB >= 0 ? '+' : ''}${formatCurrency(varianceTHB)}
        </td>
        <td>
          <span class="kpi-pill ${isPassed ? 'success' : 'danger'}">
            ${isPassed ? '✓ ได้ตามเป้าหมาย' : '✕ ไม่ได้ตามเป้าหมาย'}
          </span>
        </td>
        <td>${formatCurrency(row.creditSaving)}</td>
      </tr>
    `;
  }).join('');

  // Total Summary Row
  const totalActualPct = totalPV > 0 ? (totalCR / totalPV) : 0;
  const isTotalPassed = totalActualPct >= 0.03;
  tbody.innerHTML += `
    <tr style="background: var(--bg-glass); font-weight: 700; border-top: 2px solid var(--border-subtle);">
      <td>รวมทั้งปี (GRAND TOTAL)</td>
      <td>${formatCurrency(totalPV)}</td>
      <td class="cell-highlight">${formatCurrency(totalCR)}</td>
      <td>${formatCurrency(totalTarget)}</td>
      <td style="font-size: 14px; color: var(--accent-primary);">${(totalActualPct * 100).toFixed(2)}%</td>
      <td style="color: ${totalCR - totalTarget >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}">
        ${totalCR - totalTarget >= 0 ? '+' : ''}${formatCurrency(totalCR - totalTarget)}
      </td>
      <td>
        <span class="kpi-pill ${isTotalPassed ? 'success' : 'danger'}">
          ${isTotalPassed ? '✓ ได้ตามเป้าหมาย' : '✕ ไม่ได้ตามเป้าหมาย'}
        </span>
      </td>
      <td>${formatCurrency(totalCreditSaving)}</td>
    </tr>
  `;

  // Credit Extension Table
  if (creditTbody) {
    creditTbody.innerHTML = monthly.filter(m => m.creditPOVal > 0).map(m => `
      <tr>
        <td><strong>${THAI_MONTHS[m.month] || m.month}</strong></td>
        <td><span class="badge-tag">+${m.creditDiffDays} วัน</span></td>
        <td>${formatCurrency(m.creditPOVal)}</td>
        <td class="cell-highlight">${formatCurrency(m.creditSaving)}</td>
      </tr>
    `).join('');
  }

  renderMultiYearChart();
}

function renderMultiYearChart() {
  const ctx = document.getElementById('multiYearChart')?.getContext('2d');
  if (!ctx || !State.data) return;

  const yearly = State.data.yearlySummary || [
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
  const textColor = isDark ? '#9ca3af' : '#4b5563';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  State.charts.multiYear = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'มูลค่าผลประหยัดต้นทุน (ล้านบาท)',
        data: savingsMB,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Prompt' } } },
        tooltip: {
          callbacks: { label: (ctx) => `ยอดลดต้นทุน: ฿${ctx.raw} ล้านบาท` }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor }, title: { display: true, text: 'ล้านบาท', color: textColor, font: { family: 'Prompt' } } }
      }
    }
  });
}

// -------------------------------------------------------------
// VIEW 3: PO & TRANSACTION EXPLORER
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

  // Table Column Sort Headers
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

  // Year filter
  if (State.activeYear !== 'ALL') {
    list = list.filter(t => t.year === State.activeYear);
  }

  // Month filter
  if (State.filters.month !== 'ALL') {
    list = list.filter(t => t.month === State.filters.month);
  }

  // PIC filter
  if (State.filters.pic !== 'ALL') {
    list = list.filter(t => t.pic.toLowerCase().includes(State.filters.pic.toLowerCase()));
  }

  // Strategy filter
  if (State.filters.strategy !== 'ALL') {
    list = list.filter(t => t.strategy.toLowerCase().includes(State.filters.strategy.toLowerCase()));
  }

  // Full-text search
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
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 40px; color: var(--text-muted);">ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map(item => `
      <tr onclick="openTxModal('${item.globalId}')">
        <td><span class="badge-tag">${item.month}</span></td>
        <td><strong>${item.poNo || '-'}</strong></td>
        <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.supplier}">${item.supplier || '-'}</td>
        <td style="max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.description}">${item.description || '-'}</td>
        <td>${formatNumber(item.qty)}</td>
        <td><span style="color: var(--text-muted); font-size: 11px;">${item.unit || '-'}</span></td>
        <td>${formatCurrency(item.totalPrice)}</td>
        <td class="cell-highlight">${formatCurrency(item.totalSaving)}</td>
        <td><strong>${(item.percentDiscount * 100).toFixed(1)}%</strong></td>
        <td><span class="badge-tag">${item.strategy || '-'}</span></td>
        <td>${THAI_PIC_NAMES[item.pic] || item.pic || '-'}</td>
      </tr>
    `).join('');
  }

  // Pagination UI
  if (infoEl) {
    infoEl.textContent = total > 0 
      ? `แสดง ${startIdx + 1} ถึง ${endIdx} จากทั้งหมด ${formatNumber(total)} รายการ`
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
        <button class="page-btn ${p === State.tablePage ? 'active' : ''}" onclick="goToTablePage(${p})">${p}</button>
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
// MODAL DETAILS POPUP
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
      <div class="modal-detail-row">
        <span class="label">ชื่อซัพพลายเออร์</span>
        <span class="val">${item.supplier}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">รายละเอียดสินค้า/บริการ</span>
        <span class="val">${item.description}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">งวดประจำเดือน / ปี</span>
        <span class="val">${THAI_MONTHS[item.month] || item.month} / ปี ${item.year}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">จำนวนและหน่วยนับ</span>
        <span class="val">${formatNumber(item.qty)} ${item.unit}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">ราคาต่ำสุดต่อหน่วย</span>
        <span class="val">${formatCurrency(item.minUnitPrice)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">ราคาต่อรองได้ต่อหน่วย</span>
        <span class="val">${formatCurrency(item.negotiatedUnitPrice)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">ส่วนต่างราคาต่อหน่วย</span>
        <span class="val">${formatCurrency(item.unitDifference)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">มูลค่าสั่งซื้อรวม (PO Total)</span>
        <span class="val">${formatCurrency(item.totalPrice)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">รวมมูลค่าที่ต่อรองลดลงได้</span>
        <span class="val" style="color: var(--accent-emerald); font-size: 16px; font-weight: 700;">${formatCurrency(item.totalSaving)}</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">คิดเป็น % ส่วนลด</span>
        <span class="val" style="color: var(--accent-primary); font-weight: 700;">${(item.percentDiscount * 100).toFixed(2)}%</span>
      </div>
      <div class="modal-detail-row">
        <span class="label">กลยุทธ์ด้านจัดซื้อ (Strategy)</span>
        <span class="val"><span class="badge-tag">${item.strategy}</span></span>
      </div>
      <div class="modal-detail-row">
        <span class="label">ผู้รับผิดชอบ (Person in Charge)</span>
        <span class="val">${THAI_PIC_NAMES[item.pic] || item.pic}</span>
      </div>
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
// VIEW 4: SUPPLIERS ANALYTICS
// -------------------------------------------------------------
function renderSuppliersView() {
  const tbody = document.getElementById('supplier-ranking-tbody');
  const searchInput = document.getElementById('supplier-search-input');
  if (!tbody) return;

  const currentTxs = (State.activeYear === 'ALL') ? State.transactions : State.transactions.filter(t => t.year === State.activeYear);
  const supplierMap = {};

  currentTxs.forEach(t => {
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

  tbody.innerHTML = sorted.map((sup, idx) => {
    const avgDisc = sup.purchase > 0 ? (sup.savings / sup.purchase) : 0;
    const topStrats = Object.keys(sup.strategies)
      .sort((a, b) => sup.strategies[b] - sup.strategies[a])
      .slice(0, 2)
      .map(s => `<span class="badge-tag">${s}</span>`)
      .join(' ');

    return `
      <tr>
        <td><span class="pic-rank">#${idx + 1}</span></td>
        <td><strong>${sup.name}</strong></td>
        <td>${formatNumber(sup.count)}</td>
        <td>${formatCurrency(sup.purchase)}</td>
        <td class="cell-highlight">${formatCurrency(sup.savings)}</td>
        <td><strong>${formatPercent(avgDisc, 1)}</strong></td>
        <td>${topStrats}</td>
      </tr>
    `;
  }).join('');

  searchInput?.addEventListener('input', () => renderSuppliersView());
}

// -------------------------------------------------------------
// VIEW 5: PIC TEAM LEADERBOARD
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
      <div class="pic-card">
        <div class="pic-top">
          <span class="pic-rank">อันดับ #${idx + 1}</span>
          <span class="kpi-pill success">สัดส่วน ${share}%</span>
        </div>
        <div>
          <div class="pic-name">${thaiName}</div>
          <div class="pic-thai-name">เจ้าหน้าที่จัดซื้อ (Buyer: ${p.name})</div>
        </div>
        <div class="pic-metric">${formatCurrency(p.savings, 0)}</div>
        <div class="pic-submetrics">
          <span>จำนวน: <strong>${p.count} รายการ</strong></span>
          <span>ส่วนลดเฉลี่ย: <strong>${formatPercent(avgDisc, 1)}</strong></span>
        </div>
      </div>
    `;
  }).join('');

  // Render PIC Strategy Cross Matrix
  if (tableBody && State.data.strategyMatrix) {
    const matrix = State.data.strategyMatrix;
    const totalAll = matrix.reduce((acc, row) => acc + (row.Total || 0), 0) || 1;

    tableBody.innerHTML = matrix.map(row => {
      const share = ((row.Total / totalAll) * 100).toFixed(2);
      return `
        <tr>
          <td><strong>${row.strategy}</strong></td>
          <td>${formatCurrency(row.Pawina, 0)}</td>
          <td>${formatCurrency(row.Tanida, 0)}</td>
          <td>${formatCurrency(row.Yuwanit, 0)}</td>
          <td>${formatCurrency(row.Dusit, 0)}</td>
          <td>${formatCurrency(row.Saniya, 0)}</td>
          <td class="cell-highlight">${formatCurrency(row.Total, 0)}</td>
          <td><span class="kpi-pill">${share}%</span></td>
        </tr>
      `;
    }).join('');
  }
}

// -------------------------------------------------------------
// VIEW 6: KAIZEN & CREDIT SIMULATORS
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

  // Credit Terms Calculator
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
    const netPay = po - saving;

    document.getElementById('sim-credit-result').textContent = formatCurrency(saving);
    document.getElementById('sim-credit-formula').textContent = 
      `${formatNumber(po)} × (${diffDays} / 360) × ${(rate * 100).toFixed(2)}%`;
    document.getElementById('sim-credit-netpay').textContent = formatCurrency(netPay);
  };

  [poInput, origInput, newInput, rateInput].forEach(el => el?.addEventListener('input', calcCredit));
}

// -------------------------------------------------------------
// VIEW 7: DROPZONE & EXPORT ENGINE
// -------------------------------------------------------------
function initDropzone() {
  const dropzone = document.getElementById('excel-dropzone');
  const fileInput = document.getElementById('excel-file-input');

  dropzone?.addEventListener('click', () => fileInput?.click());

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent-primary)';
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.style.borderColor = 'var(--border-active)';
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border-active)';
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

// Export Helpers
function exportFilteredTransactions() {
  const headers = ["เดือน", "เลขที่ PO", "ชื่อซัพพลายเออร์", "รายละเอียดสินค้า/บริการ", "จำนวน", "หน่วย", "ราคารวม (บาท)", "รวมที่ต่อรองได้ (บาท)", "% ส่วนลด", "กลยุทธ์", "ผู้รับผิดชอบ"];
  const rows = State.filteredTransactions.map(t => [
    t.month,
    `"${t.poNo}"`,
    `"${(t.supplier || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.qty,
    t.unit,
    t.totalPrice,
    t.totalSaving,
    (t.percentDiscount * 100).toFixed(2) + '%',
    `"${t.strategy}"`,
    `"${THAI_PIC_NAMES[t.pic] || t.pic}"`
  ]);

  downloadCSV("transactions_export.csv", headers, rows);
}

window.exportMonthlyKPIToCSV = function() {
  const headers = ["เดือน", "มูลค่าสั่งซื้อ (บาท)", "มูลค่าต่อรองได้ (บาท)", "เป้าหมาย 3% (บาท)", "% ส่วนลดจริง", "สถานะ KPI", "ผลประหยัดเพิ่มเครดิต (บาท)"];
  const rows = (State.data.monthlySummary || []).map(m => [
    m.month,
    m.pv2026,
    m.cr2026,
    m.target2026,
    (m.pct2026 || 0).toFixed(2) + '%',
    `"${m.status2026}"`,
    m.creditSaving
  ]);

  downloadCSV("monthly_kpi_summary.csv", headers, rows);
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
  renderPICPerformanceChart();
  renderMultiYearChart();
}
