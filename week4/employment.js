// =========================================================
// 4주차 실습 과제 2 · CSV 파일을 읽어서 산업별 취업자 보여주기
// =========================================================
console.log("JavaScript 연결 성공!");

// ---------------------------------------------------------
// 1. 설정
// ---------------------------------------------------------

// 같은 폴더에 둔 CSV 파일 이름
const CSV_FILE = "employment.csv";

// CSV 2행에 적힌 항목 이름 → 코드에서 부를 짧은 이름
// KOSIS가 "취업자 (천명) (천명)"처럼 단위를 두 번 붙여 내보내서, 글자 그대로 적어 둔다.
const COLUMNS = {
  total:     "취업자 (천명) (천명)",
  hours:     "주당 평균 취업시간",
  age15:     "연령(15~29세)",
  age30:     "연령(30~39세)",
  age40:     "연령(40~49세)",
  age50:     "연령(50~59세)",
  age60:     "연령(60세 이상)",
  eduLow:    "교육정도(중졸이하)",
  eduHigh:   "교육정도(고졸)",
  eduUniv:   "교육정도(대졸이상)",
  regular:   "종사상지위(상용근로자)",
  temporary: "종사상지위(임시·일용근로자)",
  nonWage:   "종사상지위(비임금근로자)"
};

// 자세히 보기에서 묶어 보여 줄 세 그룹. 한 그룹을 모두 더하면 그 산업의 취업자 전체가 된다.
const GROUPS = [
  {
    title: "연령대",
    parts: [
      { key: "age15", label: "15~29세" },
      { key: "age30", label: "30~39세" },
      { key: "age40", label: "40~49세" },
      { key: "age50", label: "50~59세" },
      { key: "age60", label: "60세 이상" }
    ]
  },
  {
    title: "교육 정도",
    parts: [
      { key: "eduLow",  label: "중졸 이하" },
      { key: "eduHigh", label: "고졸" },
      { key: "eduUniv", label: "대졸 이상" }
    ]
  },
  {
    title: "종사상 지위",
    parts: [
      { key: "regular",   label: "상용근로자" },
      { key: "temporary", label: "임시·일용근로자" },
      { key: "nonWage",   label: "비임금근로자" }
    ]
  }
];

// 그래프에 쓸 짧은 산업 이름. CSV의 산업 이름 끝 괄호 안 코드(산업분류 번호)로 찾는다.
// 여기에 없는 산업은 원래 이름을 그대로 쓴다.
const SHORT_NAMES = {
  "01~03": "농림어업",
  "05~08": "광업",
  "10~34": "제조업",
  "35":    "전기·가스·증기",
  "36~39": "수도·하수·폐기물",
  "41~42": "건설업",
  "45~47": "도소매업",
  "49~52": "운수·창고업",
  "55~56": "숙박·음식점업",
  "58~63": "정보통신업",
  "64~66": "금융·보험업",
  "68":    "부동산업",
  "70~73": "전문·과학·기술",
  "74~76": "사업시설 관리·지원",
  "84":    "공공 행정·국방",
  "85":    "교육 서비스업",
  "86~87": "보건·사회복지",
  "90~91": "예술·스포츠·여가",
  "94~96": "협회·수리·개인 서비스",
  "97~98": "가구 내 고용",
  "99":    "국제·외국 기관"
};

// ---------------------------------------------------------
// 2. 지금 화면의 상태
// ---------------------------------------------------------
const state = {
  data: null,      // CSV를 정리한 결과 { periods, total, industries }
  period: null,    // 지금 보고 있는 기간 (예: "2025.2/2")
  selected: null   // 지금 고른 산업 (처음에는 전체 산업)
};

// ---------------------------------------------------------
// 3. CSV 글자 → 자바스크립트 데이터
// ---------------------------------------------------------

// 파일 내용(바이트)을 글자로 바꾼다.
// 이 CSV는 UTF-8이지만, 엑셀에서 저장한 한글 CSV는 EUC-KR이라 UTF-8로 읽으면 한글이 깨진다.
// UTF-8로 읽다가 맞지 않는 글자가 나오면(fatal) EUC-KR로 다시 읽는다.
function decodeText(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    return new TextDecoder("euc-kr").decode(bytes);
  }
}

// CSV 한 줄 → 칸 배열
// "농업, 임업 및 어업(01~03)"처럼 따옴표 안에 쉼표가 있어서 split(",")만 쓰면 칸이 밀린다.
function parseLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;          // 따옴표를 만나면 '따옴표 안/밖'을 뒤집는다
    } else if (ch === "," && !inQuotes) {
      cells.push(cell);              // 따옴표 밖의 쉼표에서만 칸을 나눈다
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

// "4364" → 4364. "-"(해당 없음)처럼 숫자가 아닌 칸은 0으로 본다.
function toNumber(text) {
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

// "제 조 업(10~34)" → { name: "제조업", code: "10~34" }
function splitName(text) {
  const match = text.match(/^(.*)\(([\d~]+)\)$/);
  let name = (match ? match[1] : text).trim();
  const code = match ? match[2] : "";

  // KOSIS는 짧은 이름을 "제 조 업"처럼 한 글자씩 띄워 둔다. 조각이 모두 한 글자면 붙인다.
  const pieces = name.split(/\s+/);
  if (pieces.every(function (piece) { return piece.length === 1; })) {
    name = pieces.join("");
  }
  return { name: name, code: code };
}

// "2025.1/2" → { key: "2025.1/2", label: "2025 상반기", short: "상반기" }
function makePeriod(key) {
  const match = key.match(/^(\d{4})\.([12])\/2$/);
  if (!match) {
    return { key: key, label: key, short: key };
  }
  const half = match[2] === "1" ? "상반기" : "하반기";
  return { key: key, label: match[1] + " " + half, short: half };
}

// CSV 전체 글자 → { periods, total, industries }
function buildData(text) {
  const lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ""; });
  const rows = lines.map(parseLine);
  if (rows.length < 3) {
    throw new Error("CSV에 데이터 줄이 없습니다.");
  }
  const periodRow = rows[0];   // 1행: 산업별, 2025.1/2, 2025.1/2, ... (기간)
  const headerRow = rows[1];   // 2행: 산업별, 취업자, 연령(15~29세), RSE, ... (항목 이름)

  // (1) 1행에서 겹치는 기간을 빼면 기간 목록이 된다 → ["2025.1/2", "2025.2/2"]
  const periodKeys = [...new Set(periodRow.slice(1))];
  if (periodKeys.length === 0) {
    throw new Error("CSV 1행에서 기간을 찾지 못했습니다.");
  }

  // (2) "기간|항목 이름" → 몇 번째 칸인지 적어 둔다.
  //     상반기와 하반기의 RSE 칸 개수가 달라서, 칸 번호를 숫자로 외워 두면 하반기 값이 밀린다.
  //     (RSE = 상대표준오차. 값을 얼마나 믿을 수 있는지 표시하는 칸이라 여기서는 쓰지 않는다)
  const columnOf = {};
  for (let c = 1; c < headerRow.length; c++) {
    columnOf[periodRow[c] + "|" + headerRow[c]] = c;
  }

  // (3) 3행부터 한 줄이 산업 하나. 맨 처음 "계" 줄은 모든 산업의 합계다.
  const items = rows.slice(2).map(function (cells) {
    return makeItem(cells, periodKeys, columnOf);
  });

  const total = items[0];
  total.name = "전체 산업";
  total.short = "전체 산업";

  return {
    periods: periodKeys.map(makePeriod),
    total: total,
    industries: items.slice(1)
  };
}

// CSV 한 줄(칸 배열) → 산업 하나
// values["2025.2/2"].total 처럼 기간과 짧은 이름으로 값을 꺼낼 수 있게 만든다.
function makeItem(cells, periodKeys, columnOf) {
  const { name, code } = splitName(cells[0]);
  const item = { name: name, code: code, short: SHORT_NAMES[code] || name, values: {} };

  for (const period of periodKeys) {
    const values = {};
    for (const key in COLUMNS) {
      const c = columnOf[period + "|" + COLUMNS[key]];
      if (c === undefined) {
        throw new Error("CSV에서 '" + COLUMNS[key] + "' 칸을 찾지 못했습니다.");
      }
      values[key] = toNumber(cells[c]);
    }
    item.values[period] = values;
  }
  return item;
}

// ---------------------------------------------------------
// 4. 작은 도우미 함수
// ---------------------------------------------------------

// 4364 → "4,364"
function formatNumber(number) {
  return number.toLocaleString("ko-KR");
}

// 0.1503 → "15.0%"
function formatPercent(ratio) {
  return (ratio * 100).toFixed(1) + "%";
}

// 4364 → "4,364천 명"
// \u00A0은 줄이 바뀌지 않는 띄어쓰기. 좁은 화면에서 "4,364천"과 "명"이 두 줄로 갈라지지 않게 한다.
function formatPeople(number) {
  return formatNumber(number) + "천\u00A0명";
}

// 태그 만들기 + class + 글자를 한 줄로.
// CSV에서 온 글자는 innerHTML이 아니라 textContent로 넣어야 안전하다.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setText(selector, text) {
  document.querySelector(selector).textContent = text;
}

// 늘었으면 빨간 ▲, 줄었으면 파란 ▼ (우리나라 통계·주식 표기 습관)
// diff는 방향을 정하는 데만 쓰고, 화면에 찍을 글자(text)는 따로 받는다.
function changeBadge(diff, text) {
  if (diff > 0) return el("span", "change up", "▲ " + text);
  if (diff < 0) return el("span", "change down", "▼ " + text);
  return el("span", "change", text);
}

// 첫 기간과 마지막 기간 (상반기, 하반기)
function firstPeriod() { return state.data.periods[0]; }
function lastPeriod() { return state.data.periods[state.data.periods.length - 1]; }

// 지금 고른 기간의 값 묶음
function valuesOf(item) {
  return item.values[state.period];
}

// 상반기 → 하반기에 몇 천 명이 늘었나(+) 줄었나(-)
function changeOf(item) {
  return item.values[lastPeriod().key].total - item.values[firstPeriod().key].total;
}

// 이 산업 취업자 중 key 항목이 차지하는 비율 (0~1)
function shareOf(values, key) {
  return values.total > 0 ? values[key] / values.total : 0;
}

// ---------------------------------------------------------
// 5. 화면 그리기
// ---------------------------------------------------------

// (1) 맨 위 요약 숫자 네 개. 가장 최근 기간 기준이다.
function renderSummary() {
  const { total, industries } = state.data;
  const last = lastPeriod().key;
  const since = " (" + firstPeriod().short + "\u00A0대비)";

  // 정렬하면 원래 배열 순서가 바뀌므로 [...배열]로 복사해서 정렬한다
  const biggest = [...industries].sort(function (a, b) {
    return b.values[last].total - a.values[last].total;
  })[0];
  const byChange = [...industries].sort(function (a, b) {
    return changeOf(b) - changeOf(a);
  });
  const grew = byChange[0];
  const shrank = byChange[byChange.length - 1];

  const tiles = [
    { label: "전체 취업자", value: formatPeople(total.values[last].total), diff: changeOf(total) },
    {
      label: "취업자가 가장 많은 산업",
      value: biggest.short,
      sub: formatPeople(biggest.values[last].total) + " · 전체의\u00A0" +
        formatPercent(biggest.values[last].total / total.values[last].total)
    },
    { label: "가장 많이 늘어난 산업", value: grew.short, diff: changeOf(grew) },
    { label: "가장 많이 줄어든 산업", value: shrank.short, diff: changeOf(shrank) }
  ];

  setText("#summary-title", lastPeriod().label + " 요약");
  const list = document.querySelector("#summary");
  list.replaceChildren();

  for (const tile of tiles) {
    const sub = el("p", "kpi-sub", tile.sub);
    if (tile.diff !== undefined) {
      sub.append(changeBadge(tile.diff, formatPeople(Math.abs(tile.diff))), since);
    }
    const li = el("li", "kpi");
    li.append(el("p", "kpi-label", tile.label), el("p", "kpi-value", tile.value), sub);
    list.append(li);
  }
}

// (2) 기간 버튼. 과제 1의 장소 버튼처럼 데이터(기간 목록)를 보고 자동으로 만든다.
function renderPeriodButtons() {
  const box = document.querySelector("#period-buttons");
  box.replaceChildren();

  for (const period of state.data.periods) {
    const button = el("button", "", period.label);
    button.type = "button";
    button.dataset.period = period.key;
    button.addEventListener("click", function () {
      selectPeriod(period.key);
    });
    box.append(button);
  }
}

// (3) 막대그래프. 기간이 바뀔 때마다 순서가 달라질 수 있어서 통째로 다시 만든다.
function renderChart() {
  const { periods, total, industries } = state.data;
  const period = periods.find(function (p) { return p.key === state.period; });
  setText("#chart-sub", period.label + " · 많은 순 · 단위: 천 명");

  // 기간을 바꿔도 막대 길이를 서로 비교할 수 있게, 모든 기간을 통틀어 가장 큰 값을 기준으로 잡는다
  let max = 0;
  for (const item of industries) {
    for (const p of periods) {
      max = Math.max(max, item.values[p.key].total);
    }
  }

  const sorted = [...industries].sort(function (a, b) {
    return valuesOf(b).total - valuesOf(a).total;
  });

  const list = document.querySelector("#chart");
  list.replaceChildren(makeBarRow(total, 0));    // 맨 위: 전체 산업 (막대 없이 숫자만)
  for (const item of sorted) {
    list.append(makeBarRow(item, max));
  }
  markSelectedRow();
}

// 막대 한 줄 = 누를 수 있는 버튼 하나. max가 0이면 막대 없이 숫자만 넣는다.
function makeBarRow(item, max) {
  const value = valuesOf(item).total;
  const plot = el("span", "bar-plot");

  if (max > 0) {
    const bar = el("span", "bar");
    // CSS가 "숫자 붙일 자리를 뺀 폭 × --ratio"로 막대 길이를 정한다 (0 ~ 1)
    bar.style.setProperty("--ratio", value / max);
    plot.append(bar);
  }
  plot.append(el("span", "bar-value", formatNumber(value)));

  const button = el("button", "bar-row");
  button.type = "button";
  button.dataset.name = item.name;
  button.append(el("span", "bar-label", item.short), plot);
  button.addEventListener("click", function () {
    selectIndustry(item, true);
  });

  const li = el("li", max > 0 ? "" : "total-item");
  li.append(button);
  return li;
}

// 고른 산업의 막대만 '눌린 상태'로 표시한다
function markSelectedRow() {
  for (const button of document.querySelectorAll("#chart .bar-row")) {
    button.setAttribute("aria-pressed", String(button.dataset.name === state.selected.name));
  }
}

// (4) 자세히 보기
function renderDetail() {
  const { total } = state.data;
  const item = state.selected;
  const isTotal = item === total;
  const values = valuesOf(item);
  const all = valuesOf(total);
  const first = firstPeriod();
  const last = lastPeriod();

  // 제목
  setText("#detail-eyebrow", isTotal ? "모든 산업 합계" : "선택한 산업");
  setText("#detail-name", item.name);
  setText("#detail-code", "한국표준산업분류 " + item.code);
  document.querySelector("#detail-code").hidden = isTotal;

  // 숫자 세 개
  setText("#stat-total", formatPeople(values.total));
  setText("#stat-total-sub", isTotal ? "모든 산업" : "전체의 " + formatPercent(values.total / all.total));

  const diff = changeOf(item);
  setText("#stat-change-label", first.short + " → " + last.short);
  document.querySelector("#stat-change")
    .replaceChildren(changeBadge(diff, formatPeople(Math.abs(diff))));
  setText("#stat-change-sub",
    formatNumber(item.values[first.key].total) + " → " + formatNumber(item.values[last.key].total));

  setText("#stat-hours", values.hours + "시간");
  setText("#stat-hours-sub", isTotal ? "모든 산업 평균" : "전체 평균 " + all.hours + "시간");

  // 한 줄 요약
  setText("#detail-insight", isTotal
    ? "모든 산업을 합친 값입니다. 그래프에서 산업을 누르면 전체 산업과 비교해 볼 수 있습니다."
    : describeFeature(values, all));

  // 그룹별 비율 막대
  const box = document.querySelector("#detail-groups");
  box.replaceChildren();
  for (const group of GROUPS) {
    const list = el("ul", "share-list");
    for (const part of group.parts) {
      list.append(makeShareRow(part, values, all, isTotal));
    }
    box.append(el("h4", "group-title", group.title), list);
  }

  // 전체 산업을 볼 때는 비교 눈금이 없으므로 범례도 숨긴다
  document.querySelector("#detail-legend").hidden = isTotal;
}

// 비율 막대 한 줄: 이름 | 막대(+ 전체 산업 눈금) | 비율
function makeShareRow(part, values, all, isTotal) {
  const share = shareOf(values, part.key);
  const allShare = shareOf(all, part.key);

  const bar = el("span", "share-bar");
  bar.style.width = share * 100 + "%";
  const track = el("span", "share-track");
  track.append(bar);

  const value = el("span", "share-value", formatPercent(share));

  // 전체 산업의 비율 자리에 세로 눈금을 찍어 비교 기준으로 쓴다
  if (!isTotal) {
    const mark = el("span", "share-mark");
    mark.style.left = allShare * 100 + "%";
    mark.title = "전체 산업 " + formatPercent(allShare);
    track.append(mark);
    // 눈금은 눈으로만 보이므로, 화면 낭독기에는 글자로 알려 준다
    value.append(el("span", "sr-only", " (전체 산업 " + formatPercent(allShare) + ")"));
  }

  const li = el("li", "share-row");
  li.append(el("span", "share-label", part.label), track, value);
  return li;
}

// 전체 산업보다 비율이 가장 높은 항목을 찾아 한 문장으로 만든다
function describeFeature(values, all) {
  let best = null;
  for (const group of GROUPS) {
    for (const part of group.parts) {
      const gap = shareOf(values, part.key) - shareOf(all, part.key);
      if (best === null || gap > best.gap) {
        best = { group: group.title, label: part.label, gap: gap };
      }
    }
  }
  return best.group + "에서 ‘" + best.label + "’ 비율이 전체 산업보다 " +
    (best.gap * 100).toFixed(1) + "%p 높습니다.";
}

// (5) 원본 표: CSV 순서 그대로, 기간별 취업자와 증감
function renderTable() {
  const { periods, total, industries } = state.data;
  const table = document.querySelector("#table");

  const caption = el("caption", "sr-only", "산업별 취업자 수와 증감 (단위: 천 명)");

  const headRow = el("tr");
  const headers = ["산업"].concat(
    periods.map(function (p) { return p.label; }),
    ["증감", "증감률"]
  );
  for (const text of headers) {
    const th = el("th", "", text);
    th.scope = "col";
    headRow.append(th);
  }
  const thead = el("thead");
  thead.append(headRow);

  const tbody = el("tbody");
  for (const item of [total].concat(industries)) {
    const tr = el("tr", item === total ? "total-row" : "");

    // 넓은 화면에서는 원래 이름, 좁은 화면에서는 짧은 이름 (CSS가 둘 중 하나만 보여 준다)
    const nameCell = el("th");
    nameCell.scope = "row";
    nameCell.append(el("span", "name-full", item.name), el("span", "name-short", item.short));
    tr.append(nameCell);

    for (const p of periods) {
      tr.append(el("td", "", formatNumber(item.values[p.key].total)));
    }

    const diff = changeOf(item);
    const base = item.values[firstPeriod().key].total;
    const rate = base > 0 ? diff / base : 0;
    const diffCell = el("td");
    diffCell.append(changeBadge(diff, formatNumber(Math.abs(diff))));
    const rateCell = el("td");
    rateCell.append(changeBadge(rate, formatPercent(Math.abs(rate))));
    tr.append(diffCell, rateCell);

    tbody.append(tr);
  }

  table.replaceChildren(caption, thead, tbody);
}

// ---------------------------------------------------------
// 6. 버튼을 눌렀을 때
// ---------------------------------------------------------

// 기간 버튼
function selectPeriod(key) {
  state.period = key;
  for (const button of document.querySelectorAll("#period-buttons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.period === key));
  }
  renderChart();
  renderDetail();
}

// 막대(산업) 버튼
function selectIndustry(item, clickedByUser) {
  state.selected = item;
  markSelectedRow();
  renderDetail();

  // 좁은 화면(1단)에서는 자세히 보기가 그래프 아래에 있어서, 누르면 그쪽으로 내려 준다
  if (clickedByUser && window.matchMedia("(max-width: 760px)").matches) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector("#detail").scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
}

// ---------------------------------------------------------
// 7. CSV 읽어서 시작하기
// ---------------------------------------------------------

// CSV 글자로 화면 전체를 처음부터 그린다
function start(text, fileName) {
  state.data = buildData(text);            // CSV 모양이 다르면 여기서 오류가 나서 아래로 안 넘어간다
  state.period = lastPeriod().key;         // 처음에는 가장 최근 기간
  state.selected = state.data.total;       // 처음에는 전체 산업

  setText("#file-name", fileName);
  renderSummary();
  renderPeriodButtons();
  renderTable();
  selectPeriod(state.period);              // 기간 버튼 표시 + 그래프 + 자세히 보기

  document.querySelector("#status").hidden = true;
  for (const section of document.querySelectorAll("[data-needs-data]")) {
    section.hidden = false;
  }
}

function showError(message) {
  const status = document.querySelector("#status");
  status.textContent = message;
  status.classList.add("error");
  status.hidden = false;
}

// 바이트 → 글자 → 화면. 실패하면 이유를 화면에 보여 준다.
function openCSV(bytes, fileName) {
  try {
    start(decodeText(bytes), fileName);
  } catch (error) {
    console.error(error);
    showError("'" + fileName + "' 파일을 읽지 못했습니다. " + error.message);
  }
}

// (1) 처음 열 때: 같은 폴더의 employment.csv를 fetch로 가져온다.
//     fetch는 시간이 걸리는 일이라 await로 끝날 때까지 기다린다.
async function loadDefaultFile() {
  let bytes;
  try {
    const response = await fetch(CSV_FILE);
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    bytes = await response.arrayBuffer();
  } catch (error) {
    console.error(error);
    showError("'" + CSV_FILE + "' 파일을 불러오지 못했습니다. " +
      "HTML 파일을 더블클릭해서 열면(file://) 브라우저가 보안 때문에 fetch를 막습니다. " +
      "VS Code의 Live Server나 GitHub Pages 주소로 열거나, 위의 '다른 CSV 파일 열기'로 " +
      CSV_FILE + "를 직접 골라 주세요.");
    return;
  }
  openCSV(bytes, CSV_FILE);
}

// (2) '다른 CSV 파일 열기'로 고른 파일. 내 컴퓨터의 파일을 직접 읽으므로 더블클릭으로 연 페이지에서도 된다.
document.querySelector("#file-input").addEventListener("change", async function (event) {
  const file = event.target.files[0];
  if (!file) return;
  openCSV(await file.arrayBuffer(), file.name);
});

loadDefaultFile();
