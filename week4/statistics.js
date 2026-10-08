const status = document.getElementById("chart-status");
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
const employmentCsvPath = "./data/youth-employment-monthly.csv";
const rateCsvPath = "./data/youth-employment-rate-quarterly.csv";
const targetAge = "15 - 29세";
const quarterMonths = ["2026.04", "2026.05", "2026.06"];
const targetQuarter = "2026.2/4";

let regionPoints = [];
let scatterChart;
let rankingChart;

function loadCsv(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      skipEmptyLines: "greedy",
      complete: result => {
        if (result.errors.length > 0) {
          reject(new Error(`${path}의 CSV 형식에 문제가 있습니다: ${result.errors[0].message}`));
          return;
        }

        resolve(result);
      },
      error: error => reject(new Error(`${path} 파일을 읽지 못했습니다: ${error.message}`))
    });
  });
}

function parseNumber(rawValue) {
  const cleanedValue = String(rawValue ?? "").trim().replaceAll(",", "");

  if (!cleanedValue) {
    return { value: null, problem: "빈 값" };
  }

  const value = Number(cleanedValue);
  if (!Number.isFinite(value)) {
    return { value: null, problem: "숫자가 아닌 값" };
  }

  return { value, problem: null };
}

function drawScatterChart() {
  if (scatterChart || regionPoints.length === 0) {
    return;
  }

  scatterChart = new Chart(document.getElementById("scatter-chart"), {
    type: "scatter",
    data: {
      datasets: [{
        label: "시도",
        data: regionPoints,
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
        pointRadius: 6,
        pointHoverRadius: 9
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "청년 취업자 수 (천 명)"
          }
        },
        y: {
          min: 30,
          max: 50,
          title: {
            display: true,
            text: "청년 고용률 (%)"
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: context => {
              const point = context.raw;
              return `${point.region}: 취업자 ${point.x.toLocaleString("ko-KR", {
                maximumFractionDigits: 1
              })}천 명, 고용률 ${point.y}%`;
            }
          }
        }
      }
    }
  });
}

function drawRankingChart() {
  if (rankingChart || regionPoints.length === 0) {
    return;
  }

  const rankedRegions = [...regionPoints].sort((a, b) => b.x - a.x);

  rankingChart = new Chart(document.getElementById("ranking-chart"), {
    type: "bar",
    data: {
      labels: rankedRegions.map(point => point.region),
      datasets: [{
        label: "청년 취업자 수 평균 (천 명)",
        data: rankedRegions.map(point => point.x),
        backgroundColor: "#0f766e",
        borderColor: "#115e59",
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "청년 취업자 수 평균 (천 명)"
          }
        },
        y: {
          ticks: {
            autoSkip: false
          },
          title: {
            display: true,
            text: "시도"
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: context =>
              `${context.parsed.x.toLocaleString("ko-KR", {
                maximumFractionDigits: 1
              })}천 명`
          }
        }
      }
    }
  });
}

function showTab(selectedTab) {
  const panelId = selectedTab.getAttribute("aria-controls");

  for (const tab of tabs) {
    const isSelected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  }

  for (const panel of panels) {
    panel.hidden = panel.id !== panelId;
  }

  if (panelId === "panel-scatter") {
    drawScatterChart();
    requestAnimationFrame(() => scatterChart?.resize());
  } else {
    drawRankingChart();
    requestAnimationFrame(() => rankingChart?.resize());
  }
}

function enableTabs() {
  for (const tab of tabs) {
    tab.addEventListener("click", () => showTab(tab));
    tab.addEventListener("keydown", event => {
      let nextIndex;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = (tabs.indexOf(tab) + 1) % tabs.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = (tabs.indexOf(tab) - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      tabs[nextIndex].focus();
      showTab(tabs[nextIndex]);
    });
  }
}

async function prepareCharts() {
  if (!window.Papa) {
    status.textContent =
      "Papa Parse를 불러오지 못했습니다. data/papaparse.min.js 경로를 확인하세요.";
    return;
  }

  if (!window.Chart) {
    status.textContent =
      "Chart.js를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 페이지를 새로고침하세요.";
    return;
  }

  try {
    const [employmentResult, rateResult] = await Promise.all([
      loadCsv(employmentCsvPath),
      loadCsv(rateCsvPath)
    ]);
    const employmentFields = employmentResult.meta.fields || [];
    const rateFields = rateResult.meta.fields || [];
    const requiredEmploymentFields = [
      "시도별(1)",
      "시도별(2)",
      "연령계층별(1)",
      ...quarterMonths
    ];
    const requiredRateFields = ["시도", "연령계층별", "시점", "고용률(%)"];

    if (!requiredEmploymentFields.every(field => employmentFields.includes(field))) {
      status.textContent =
        "취업자 CSV에 필요한 열이 없습니다. 시도별(1), 시도별(2), 연령계층별(1), 2026.04~2026.06 열을 확인하세요.";
      return;
    }

    if (!requiredRateFields.every(field => rateFields.includes(field))) {
      status.textContent =
        "고용률 CSV에 필요한 열이 없습니다. 시도, 연령계층별, 시점, 고용률(%) 열을 확인하세요.";
      return;
    }

    const problems = [];
    const rateByRegion = new Map();
    const duplicateRateRegions = new Set();

    for (const row of rateResult.data) {
      if (row["연령계층별"]?.trim() !== targetAge ||
          row["시점"]?.trim() !== targetQuarter ||
          row["시도"]?.trim() === "계") {
        continue;
      }

      const region = row["시도"]?.trim();
      if (!region) {
        problems.push("고용률 자료에 시도 이름이 없는 행이 있습니다.");
        continue;
      }

      if (rateByRegion.has(region)) {
        duplicateRateRegions.add(region);
        rateByRegion.delete(region);
        continue;
      }

      const parsedRate = parseNumber(row["고용률(%)"]);
      if (parsedRate.problem) {
        problems.push(`${region} 고용률: ${parsedRate.problem}`);
        continue;
      }

      rateByRegion.set(region, parsedRate.value);
    }

    for (const region of duplicateRateRegions) {
      problems.push(`${region}의 고용률 자료가 중복되어 해당 지역을 제외했습니다.`);
    }

    for (const row of employmentResult.data) {
      if (row["연령계층별(1)"]?.trim() !== targetAge ||
          row["시도별(2)"]?.trim() !== "소계") {
        continue;
      }

      const region = row["시도별(1)"]?.trim();
      if (!region || region === "계") {
        continue;
      }

      const monthlyValues = quarterMonths.map(month => parseNumber(row[month]));
      const invalidMonth = monthlyValues.findIndex(value => value.problem);
      if (invalidMonth !== -1) {
        problems.push(
          `${region} 취업자 수 ${quarterMonths[invalidMonth]}: ${monthlyValues[invalidMonth].problem}`
        );
        continue;
      }

      if (!rateByRegion.has(region)) {
        problems.push(`${region}: 같은 시도·연령·분기의 고용률 값을 찾지 못해 제외했습니다.`);
        continue;
      }

      const averageEmployment = monthlyValues.reduce((total, item) => total + item.value, 0) /
        monthlyValues.length;
      regionPoints.push({
        x: averageEmployment,
        y: rateByRegion.get(region),
        region
      });
    }

    if (regionPoints.length === 0) {
      status.textContent =
        `함께 표시할 지역이 없습니다. 두 CSV의 시도 이름, ${targetAge}, ${targetQuarter} 및 숫자 값을 확인하세요.`;
      if (problems.length > 0) {
        status.textContent += ` 확인 사항: ${problems.join(" / ")}`;
      }
      return;
    }

    enableTabs();
    showTab(tabs[0]);
    status.textContent = problems.length > 0
      ? `${regionPoints.length}개 시도를 표시했습니다. 빈 값이나 숫자가 아닌 값은 0으로 바꾸지 않고 제외했습니다. 확인 사항: ${problems.join(" / ")}`
      : `${regionPoints.length}개 시도를 표시했습니다. 전국 합계와 하위 지역은 제외하고, 두 자료의 시도명을 일치시켰습니다.`;
  } catch (error) {
    status.textContent = error.message;
  }
}

prepareCharts();
