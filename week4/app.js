// =========================================================
// 4주차 실습 과제 1 · 장소 버튼 + Google 지도 연결
// =========================================================
console.log("JavaScript 연결 성공!");

// ---------------------------------------------------------
// 1. 장소 데이터 세 개
//    id      : HTML의 <section id="..."> 와 반드시 같아야 함
//    name    : 버튼에 찍힐 글자
//    query   : '새 창에서 열기' 링크에 쓸 검색어(좌표)
//    embed   : iframe에 넣을 지도 주소
//    accent  : 이 장소를 고르면 쓸 강조색
// ---------------------------------------------------------
const places = [
  {
    id: "khall",
    name: "김수환관",
    query: "37.4853297,126.8034948",
    embed: "https://maps.google.com/maps?q=37.4853297,126.8034948&hl=ko&z=18&output=embed",
    accent: "#2A9D8F"
  },
  {
    id: "concert",
    name: "콘서트홀",
    query: "37.4880842,126.7994535",
    embed: "https://maps.google.com/maps?q=37.4880842,126.7994535&hl=ko&z=18&output=embed",
    accent: "#D2691E"
  },
  {
    id: "smurfs",
    name: "스머프 동산",
    query: "37.4868220,126.8019315",
    embed: "https://maps.google.com/maps?q=37.4868220,126.8019315&hl=ko&z=18&output=embed",
    accent: "#0288D1"
  }
];

// ---------------------------------------------------------
// 2. 장소 하나를 선택했을 때 화면을 바꾸는 함수
// ---------------------------------------------------------
function selectPlace(place) {

  // (1) 세 개의 section 중 고른 것만 보이게 한다.
  //     hidden = true  -> 숨김 / hidden = false -> 보임
  for (const section of document.querySelectorAll(".place")) {
    section.hidden = section.id !== place.id;
  }

  // (2) 버튼 중 고른 것만 '눌린 상태'로 표시한다.
  //     aria-pressed는 화면에도 보이고 스크린 리더에도 전달된다.
  for (const button of document.querySelectorAll("#buttons button")) {
    button.setAttribute("aria-pressed", String(button.dataset.place === place.id));
  }

  // (3) 지도를 바꾼다. iframe의 src를 갈아끼우면 페이지 새로고침 없이 지도만 교체된다.
  const map = document.querySelector("#map");
  map.src = place.embed;
  map.title = place.name + " Google 지도";

  // (4) '새 창에서 열기' 링크도 같은 장소로 맞춘다.
  //     encodeURIComponent는 공백·한글을 주소에 넣을 수 있는 형태로 바꿔준다.
  document.querySelector("#map-link").href =
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.query);
  document.querySelector("#map-link").textContent =
    place.name + " 위치를 Google 지도에서 열기";

  // (5) 지도 위에 얹은 핀의 이름표도 바꾼다.
  document.querySelector("#map-pin-label").textContent = place.name;

  // (6) 지도 제목과 강조색도 장소에 맞게 바꾼다.
  document.querySelector("#map-heading").textContent = place.name + " 위치";
  document.body.style.setProperty("--accent", place.accent);
}

// ---------------------------------------------------------
// 3. places 배열을 돌면서 버튼을 자동으로 만든다.
//    장소를 추가하고 싶으면 위 배열에 하나 더 넣기만 하면 된다.
// ---------------------------------------------------------
for (const place of places) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = place.name;
  button.dataset.place = place.id;          // HTML에 data-place="khall" 로 들어간다

  button.addEventListener("click", function () {
    selectPlace(place);                      // 클릭되면 위 함수를 실행
  });

  document.querySelector("#buttons").append(button);
}

// ---------------------------------------------------------
// 4. 첫 접속에도 한 장소가 선택되어 있도록 첫 번째 장소를 실행해 둔다.
// ---------------------------------------------------------
selectPlace(places[0]);
