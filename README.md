# 임대안내문 통합검색 (Firebase 연동 버전)

Firebase Realtime Database와 연동된 임대안내문 검색 시스템입니다.

## 🔥 Firebase 연동 정보

- **Database URL**: `https://cre-unified-default-rtdb.asia-southeast1.firebasedatabase.app`
- **사용 컬렉션**: 
  - `vacancies`: 공실 정보
  - `buildings`: 빌딩 정보

## 📁 파일 구조

```
leasing-search/
├── index.html              # 메인 검색 페이지
├── image-viewer.html       # 이미지 뷰어 (팝업)
├── js/
│   ├── firebase-config.js  # Firebase 초기화 및 데이터 서비스
│   ├── search.js           # 검색 UI 컨트롤러
│   └── map.js              # 카카오맵 지도 관리
└── README.md
```

## 🚀 배포 방법

### GitHub Pages
1. GitHub 저장소 생성
2. 파일 업로드
3. Settings > Pages > Source를 main 브랜치로 설정

### 로컬 테스트
```bash
# Python 간이 서버
python -m http.server 8000

# Node.js (http-server)
npx http-server
```

## 🔍 주요 기능

### 검색 옵션
- **빌딩명 검색**: 빌딩명으로 검색 (자동완성 지원)
- **지역명 검색**: 구/동/주소로 검색
- **역명 검색**: 인근 역명으로 검색
- **면적 검색**: 전용면적 범위 지정
- **복합검색**: 모든 조건 조합

### 결과 표시
- 빌딩명, 주소, 인근역, 공실층, 면적, 출처 표시
- 이미지 뷰어로 임대안내문 확인
- 카카오맵으로 위치 확인
- 선택 빌딩 일괄 지도 표시

## 📊 데이터 구조

### vacancies 컬렉션
```json
{
  "buildingId": {
    "출처_날짜_층": {
      "buildingName": "빌딩명",
      "floor": "층",
      "exclusiveArea": 100.5,
      "rentArea": 200.3,
      "source": "출처회사",
      "pageImageUrl": "https://...",
      "moveInDate": "즉시",
      "depositPy": "680,000",
      "rentPy": "68,000",
      "maintenancePy": "33,000"
    }
  }
}
```

### buildings 컬렉션
```json
{
  "buildingId": {
    "name": "빌딩명",
    "address": "주소",
    "nearbyStation": "인근역",
    "coordinates": {
      "lat": 37.5665,
      "lng": 126.9780
    }
  }
}
```

## ⚙️ 커스터마이징

### Firebase 설정 변경
`js/firebase-config.js`에서 databaseURL 수정:
```javascript
const firebaseConfig = {
    databaseURL: "YOUR_FIREBASE_DATABASE_URL"
};
```

### 카카오맵 API 키 변경
`index.html`에서 appkey 수정:
```html
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_API_KEY&libraries=services"></script>
```

## 📝 변경 이력

- 2026-01-17: Firebase 연동 버전 초기 릴리즈
  - PDF 뷰어 → 이미지 뷰어로 변경
  - 정적 data.js → Firebase Realtime Database 연동
  - 실시간 데이터 검색 지원

## 🔗 관련 프로젝트

- CRE Portal v6: https://cre-unified-default-rtdb.asia-southeast1.firebasedatabase.app
