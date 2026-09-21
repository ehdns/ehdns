 나만의 캠퍼스 핫스팟

가톨릭대학교 성심교정에서 저에게 의미 있는 세 장소를 소개하는 사이트입니다.
단순한 목록 대신, 캠퍼스 지도 위에서 장소를 직접 탐험하는 방식으로 만들었습니다.

- GitHub Pages URL: https://ehdns.github.io/ehdns/

페이지별 스타일

각 페이지의 `<body>`에 서로 다른 class를 붙이고,
CSS 선택자와 Cascade 원리를 이용해 페이지마다 다른 색이 적용되도록 했습니다.

프론트페이지 (index.html)

- 의도한 분위기: 탐험의 출발점. 어느 장소에도 치우치지 않는 깔끔하고 중립적인 느낌.
  지도가 주인공이어야 해서 배경과 글자는 최소한으로 두었습니다.
- 적용한 class: `.page-home`
- 적용한 CSS

css
body.page-home { background-color: #f7fafc; }  
body.page-home h1 { color: #2b6cb0; }          
```

- 이 페이지만의 구현: 지도 위 보물찾기
  - `.campus-map-container` → `position: relative` (핀들의 기준점)
  - `.map-target` → `position: absolute` + `%` 좌표로 건물 위에 배치
  - `.treasure-box` → 평소엔 `opacity: 0`, 마우스를 올리면 나타나는 말풍선
  - `cursor: url()` → 지도 안에서는 탐험가 커서, 장소를 찾으면 만세 커서로 변경

콘서트홀 (concerthall.html)

- 의도한 분위기: "음악", "으스스한 건물", "첫 가톨릭대의 추억".
  낡은 목관악기와 따뜻한 조명이 떠오르는 크림 + 딥 브라운 톤으로 잡았습니다.
- 적용한 class: `.page-concert`
- 적용한 CSS

css
body.page-concert { background-color: #FDF5E6; }  
body.page-concert h1 { color: #D2691E; }        
body.page-concert h2 {
  background-color: #F5DEB3;                      
  color: #8B4513;                                 
}
body.page-concert p, body.page-concert li { color: #5C4033; } 
body.page-concert .bottom-nav a { background-color: #D2691E; }
```

김수환관 (K-hall.html)

- 의도한 분위기: "캠퍼스의 심장", "밥·공부·헬스를 다 해결하는 곳".
  하루 종일 머무는 공간이라 편안하게 볼 수 있는 톤으로 잡았습니다.
- 적용한 class: `.page-khall`
- 적용한 CSS

css
body.page-khall { background-color: #F4F9F4; }  
body.page-khall h1 { color: #2A9D8F; }          
body.page-khall h2 {
  background-color: #D1E8E2;                    
  color: #197278;                               
}
body.page-khall p, body.page-khall li { color: #2F4F4F; }
body.page-khall .bottom-nav a { background-color: #2A9D8F; }
```

스머프 동산 (smurfs.html)

- 의도한 분위기: "맑은 날씨", "초록 언덕", "야외 피크닉".
  사진 속 풍경을 그대로 옮겨 배경은 하늘색, 강조 박스는 잔디색으로 대비를 주었습니다.
- 적용한 class: `.page-smurfs`
- 적용한 CSS

css
body.page-smurfs { background-color: #F0F8FF; }  
body.page-smurfs h1 { color: #0288D1; }          
body.page-smurfs h2 {
  background-color: #C8E6C9;                     
  color: #2E7D32;                                
}
body.page-smurfs p, body.page-smurfs li { color: #154360; }
body.page-smurfs .bottom-nav a { background-color: #0288D1; }
```

모바일 스타일

- 적용한 @media 조건: `@media (max-width: 600px)`
  (화면 가로 너비가 600px 이하일 때만 적용 = 스마트폰)

  이 조건이 작동하려면 모든 HTML의 `<head>`에 뷰포트 태그가 있어야 합니다.
  이게 없으면 스마트폰이 화면을 980px로 가정해 버려서 조건에 걸리지 않습니다.

html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

- 모바일에서 특별히 바뀌는 부분과 이유

  지도 핫스팟: 투명한 영역 + 마우스를 올리면 말풍선 
  보물상자 이미지(box.png) + 터치 시 바로 이동 -> 스마트폰에는 `:hover`가 없어서 숨겨진 영역을 찾을 방법이 없음 
 `display: none` 호버가 없으니 띄울 수 없고, 250px 말풍선은 좁은 화면을 넘침 
 커스텀 커서: 탐험가 / 만세 캐릭터 해제 -> 마우스 포인터 자체가 없음 
 사진  가로 2단  세로 1단 -> 좁은 화면에서 2단은 사진이 너무 작아짐 
 하단 이동 버튼:  가로 2개 + 세로로 꽉 차게 (높이 48px 이상) => 손가락은 마우스보다 뭉툭해 터치 영역이 커야 한다고 생각했기 때문
 안내 문구: "커서로 찾아 클릭하세요" -> "보물상자를 눌러보세요" 변경 (조작 방법이 다르기 때문)
 글자·여백 변경


- 휴대전화에서 네 페이지를 확인한 결과


  - 프론트페이지: 지도 위 세 곳에 보물상자가 정확히 올라왔고, 상자를 누르면 해당 장소 페이지로 이동했습니다.
  - 콘서트홀: 의도한 바로 페이지 테마 적용이 이루어졌습니다.
  - 김수환관: 처음에는 초록 테마가 적용되지 않았습니다. `<body>` class를 `page-k-hall`로 잘못 적어 CSS의 `page-khall`과 어긋나 있었고, 오타를 고쳐 해결했습니다.
  - 스머프 동산: 사진 2장이 세로로 쌓이고 하단 버튼이 세로로 꽉 차게 표시했습니다.
  - 네 페이지 모두 가로 스크롤이 생기지 않는 것을 확인했습니다.

### 출처

- 웹폰트: Google Fonts — [Gaegu](https://fonts.google.com/specimen/Gaegu), [Gamja Flower](https://fonts.google.com/specimen/Gamja+Flower)
  (손글씨 느낌으로 '누군가가 남긴 탐험 지도' 컨셉을 살리기 위해 사용)
- 캠퍼스 지도 (`cukmap.png`): 네이버 지도의 가톨릭대학교 성심교정 화면을 캡처하여 사용
- 김수환관 사진 (`k1.png`, `k2.png`): [가톨릭대 공식 네이버 블로그](https://blog.naver.com/ilovecuk/221675864799)
- 콘서트홀 외부 사진 (`ch2.png`): [가홍이 블로그](https://m.blog.naver.com/lovecuk/220000651251)
- 레슨실 내부 (`ch1.png`), 스머프 동산 (`sm1.png`, `sm2.png`): 본인 촬영
- 커서·보물상자 이미지 (`rjeek.png`, `ckwdma.png`, `box.png`): (ai 활용 이미지)
