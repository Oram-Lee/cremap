// 전역 데이터 저장소 - 완전 수정 버전
const DataManager = {
    cache: null,
    excelData: null,
    selectedBuildings: new Set(),
    currentResults: [],
    isInitialized: false,
    
    // Google Drive 파일 ID (업데이트 필요!)
    SPREADSHEET_ID: 'YOUR_GOOGLE_DRIVE_FILE_ID', // 여기에 실제 파일 ID 입력
    
    // 캐시 데이터 로드
    async loadCache() {
        try {
            console.log('📁 캐시 데이터 로드 시도...');
            const response = await fetch('data/cache_data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.cache = await response.json();
            
            // 마지막 업데이트 시간 표시
            const lastUpdatedElement = document.getElementById('lastUpdated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = 
                    `마지막 업데이트: ${this.cache.last_updated || '알 수 없음'}`;
            }
            
            console.log('✅ 캐시 데이터 로드 완료:', {
                buildings: this.cache.buildings?.length || 0,
                districts: this.cache.districts?.length || 0,
                stations: this.cache.stations?.length || 0
            });
            
            return true;
        } catch (error) {
            console.warn('⚠️ 캐시 로드 실패, 기본 데이터 사용:', error.message);
            
            // 기본 데이터로 대체
            this.cache = {
                buildings: ['강남빌딩', '서초빌딩', '역삼빌딩', '논현빌딩', '삼성빌딩'],
                districts: ['강남구', '서초구', '송파구', '영등포구', '마포구'],
                dongs: ['역삼동', '논현동', '삼성동', '청담동', '압구정동'],
                stations: ['강남역', '역삼역', '선릉역', '삼성역', '종각역'],
                last_updated: new Date().toISOString()
            };
            
            const lastUpdatedElement = document.getElementById('lastUpdated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = '기본 데이터 사용중';
            }
            
            return false;
        }
    },
    
    // Google Sheets 데이터 로드
    async loadExcelData() {
        try {
            console.log('📊 Excel 데이터 로드 시도...');
            
            // Google Sheets API v4 사용
            const apiKey = 'YOUR_GOOGLE_API_KEY'; // Google API 키 필요
            const ranges = ['빌딩정보!A:ZZ', '공실정보!A:ZZ'];
            
            const promises = ranges.map(range => {
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${range}?key=${apiKey}`;
                return fetch(url).then(r => r.json());
            });
            
            const [buildingData, vacancyData] = await Promise.all(promises);
            
            // 데이터 파싱
            this.excelData = {
                buildings: this.parseSheetData(buildingData),
                vacancies: this.parseSheetData(vacancyData)
            };
            
            console.log('✅ Excel 데이터 로드 완료:', {
                buildings: this.excelData.buildings.length,
                vacancies: this.excelData.vacancies.length
            });
            
            return true;
        } catch (error) {
            console.warn('⚠️ Excel 데이터 로드 실패, 로컬 데이터 시도:', error.message);
            
            // 대체 방법: 로컬 JSON 파일 사용 (개발용)
            try {
                const response = await fetch('data/excel_data.json');
                if (response.ok) {
                    const rawData = await response.json();
                    
                    // excel_data.json 구조 분석 및 데이터 분리
                    if (rawData.buildings && Array.isArray(rawData.buildings)) {
                        const buildings = [];
                        const vacancies = [];
                        
                        // 데이터 분리 로직
                        rawData.buildings.forEach(item => {
                            // 공실 데이터 판별 기준
                            const isVacancy = item['공실층'] || 
                                            item['공실전용면적(평)'] || 
                                            item['임대료'] || 
                                            item['보증금'] ||
                                            item['입주시기'];
                            
                            // 빌딩 데이터 판별 기준
                            const isBuilding = (item['빌딩규모'] || 
                                              item['연면적'] || 
                                              item['기준층전용면적'] ||
                                              item['준공연도'] ||
                                              item['엘리베이터']) &&
                                              !isVacancy; // 공실 데이터가 아닌 경우만
                            
                            if (isVacancy) {
                                // 공실 데이터에 빌딩 정보가 없는 경우 추가
                                if (!item['주소'] && item['빌딩명']) {
                                    // 같은 빌딩명의 빌딩 정보에서 주소와 인근역 정보 가져오기
                                    const buildingInfo = rawData.buildings.find(b => 
                                        b['빌딩명'] === item['빌딩명'] && 
                                        b['출처회사'] === item['출처회사'] &&
                                        (b['빌딩규모'] || b['연면적'])
                                    );
                                    
                                    if (buildingInfo) {
                                        item['주소'] = buildingInfo['주소'] || '';
                                        item['인근역'] = item['인근역'] || buildingInfo['인근역'] || '';
                                    }
                                }
                                vacancies.push(item);
                            } else if (isBuilding) {
                                buildings.push(item);
                            }
                            // 애매한 경우 (빌딩/공실 정보가 모두 없는 경우)
                            else if (item['빌딩명'] && item['주소']) {
                                buildings.push(item);
                            }
                        });
                        
                        this.excelData = {
                            buildings: buildings,
                            vacancies: vacancies,
                            raw: rawData.buildings // 원본 데이터 보관
                        };
                        
                        console.log('✅ 로컬 Excel 데이터 사용:', {
                            전체: rawData.buildings.length,
                            빌딩: buildings.length,
                            공실: vacancies.length
                        });
                        
                        // 데이터 검증 로그
                        if (buildings.length > 0) {
                            console.log('📋 빌딩 데이터 샘플:', buildings[0]);
                        }
                        if (vacancies.length > 0) {
                            console.log('📋 공실 데이터 샘플:', vacancies[0]);
                        }
                        
                        return true;
                    } else {
                        // 예상과 다른 구조인 경우
                        console.warn('⚠️ excel_data.json 구조가 예상과 다릅니다:', rawData);
                        this.excelData = rawData;
                        return true;
                    }
                }
            } catch (localError) {
                console.warn('⚠️ 로컬 데이터도 로드 실패:', localError.message);
            }
            
            // 최종 대체: 샘플 데이터
            this.excelData = {
                buildings: this.generateSampleBuildingData(),
                vacancies: this.generateSampleVacancyData()
            };
            
            console.log('📝 샘플 데이터 사용');
            return false;
        }
    },
    
    // 샘플 빌딩 데이터 생성
    generateSampleBuildingData() {
        return [
            {
                '빌딩명': '강남파이낸스센터',
                '주소': '서울시 강남구 테헤란로 152',
                '기준층전용면적': '500',
                '빌딩규모': 'B6/38F',
                '연면적': '82,742',
                '출처회사': 'CBRE'
            },
            {
                '빌딩명': '역삼IT타워',
                '주소': '서울시 강남구 역삼동 123-45',
                '기준층전용면적': '300',
                '빌딩규모': 'B4/25F',
                '연면적': '45,320',
                '출처회사': 'ACT'
            },
            {
                '빌딩명': '선릉비즈센터',
                '주소': '서울시 강남구 선릉로 100',
                '기준층전용면적': '400',
                '빌딩규모': 'B5/30F',
                '연면적': '65,480',
                '출처회사': 'KTG'
            }
        ];
    },
    
    // 샘플 공실 데이터 생성
    generateSampleVacancyData() {
        return [
            {
                '빌딩명': '강남파이낸스센터',
                '주소': '서울시 강남구 테헤란로 152',
                '인근역': '강남역 도보 3분',
                '공실층': '15F',
                '공실전용면적(평)': '150',
                '임대료': '85,000',
                '보증금': '10,000,000',
                '출처회사': 'CBRE'
            },
            {
                '빌딩명': '역삼IT타워',
                '주소': '서울시 강남구 역삼동 123-45',
                '인근역': '역삼역 도보 5분',
                '공실층': '8F',
                '공실전용면적(평)': '80',
                '임대료': '75,000',
                '보증금': '8,000,000',
                '출처회사': 'ACT'
            },
            {
                '빌딩명': '선릉비즈센터',
                '주소': '서울시 강남구 선릉로 100',
                '인근역': '선릉역 도보 2분',
                '공실층': '12F',
                '공실전용면적(평)': '120',
                '임대료': '80,000',
                '보증금': '9,000,000',
                '출처회사': 'KTG'
            },
            {
                '빌딩명': '강남파이낸스센터',
                '주소': '서울시 강남구 테헤란로 152',
                '인근역': '강남역 도보 3분',
                '공실층': '20F',
                '공실전용면적(평)': '200',
                '임대료': '90,000',
                '보증금': '12,000,000',
                '출처회사': 'CBRE'
            }
        ];
    },
    
    // Google Sheets 데이터 파싱
    parseSheetData(sheetData) {
        if (!sheetData || !sheetData.values || sheetData.values.length < 2) {
            return [];
        }
        
        const headers = sheetData.values[0];
        const rows = sheetData.values.slice(1);
        
        return rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        }).filter(obj => Object.values(obj).some(value => value.trim())); // 빈 행 제거
    },
    
    // 검색 실행 - 빌딩과 공실 모두 검색 가능하도록 수정
    search(criteria) {
        if (!this.isInitialized) {
            console.warn('⚠️ DataManager가 초기화되지 않았습니다.');
            return [];
        }
        
        this.showLoading(true);
        
        try {
            // 검색 유형에 따라 다른 데이터셋 사용
            const searchType = criteria.searchType || 'vacancy'; // 기본값: 공실 검색
            let results = [];
            
            if (searchType === 'building') {
                // 빌딩 검색
                results = [...this.excelData.buildings];
                
                // 빌딩명 검색
                if (criteria.buildingName && criteria.buildingName.trim()) {
                    const searchTerm = criteria.buildingName.toLowerCase().trim();
                    results = results.filter(item => 
                        item['빌딩명'] && item['빌딩명'].toLowerCase().includes(searchTerm)
                    );
                }
                
                // 주소 검색
                if (criteria.district && criteria.district.trim()) {
                    const searchTerm = criteria.district.toLowerCase().trim();
                    results = results.filter(item => 
                        item['주소'] && item['주소'].toLowerCase().includes(searchTerm)
                    );
                }
                
                // 빌딩 규모 필터
                if (criteria.buildingScale && criteria.buildingScale.trim()) {
                    const searchTerm = criteria.buildingScale.toLowerCase().trim();
                    results = results.filter(item => 
                        item['빌딩규모'] && item['빌딩규모'].toLowerCase().includes(searchTerm)
                    );
                }
                
            } else {
                // 공실 검색 (기본)
                results = [...this.excelData.vacancies];
                
                // 빌딩명 검색
                if (criteria.buildingName && criteria.buildingName.trim()) {
                    const searchTerm = criteria.buildingName.toLowerCase().trim();
                    results = results.filter(item => 
                        item['빌딩명'] && item['빌딩명'].toLowerCase().includes(searchTerm)
                    );
                }
                
                // 지역명 검색
                if (criteria.district && criteria.district.trim()) {
                    const searchTerm = criteria.district.toLowerCase().trim();
                    results = results.filter(item => 
                        item['주소'] && item['주소'].toLowerCase().includes(searchTerm)
                    );
                }
                
                // 역명 검색
                if (criteria.station && criteria.station.trim()) {
                    const stationTerm = criteria.station.toLowerCase().trim();
                    results = results.filter(item => {
                        if (!item['인근역']) return false;
                        const nearbyStation = item['인근역'].toLowerCase();
                        
                        // 역명 포함 여부 확인
                        if (!nearbyStation.includes(stationTerm)) return false;
                        
                        // 도보시간 필터링
                        if (criteria.walkingTime && criteria.walkingTime.trim()) {
                            const walkingTime = parseInt(criteria.walkingTime);
                            const match = nearbyStation.match(/(\d+)분/);
                            if (match) {
                                const itemWalkingTime = parseInt(match[1]);
                                return itemWalkingTime <= walkingTime;
                            }
                        }
                        
                        return true;
                    });
                }
                
                // 공실 면적 검색
                if (criteria.vacancyAreaFrom || criteria.vacancyAreaTo) {
                    results = results.filter(item => {
                        const areaStr = item['공실전용면적(평)'] || '';
                        // '@' 기호 제거 및 숫자 추출
                        const area = parseFloat(areaStr.replace('@', '').replace(/,/g, ''));
                        if (isNaN(area)) return false;
                        
                        if (criteria.vacancyAreaFrom && area < parseFloat(criteria.vacancyAreaFrom)) return false;
                        if (criteria.vacancyAreaTo && area > parseFloat(criteria.vacancyAreaTo)) return false;
                        
                        return true;
                    });
                }
                
                // 기준층 면적 검색
                if (criteria.buildingAreaFrom || criteria.buildingAreaTo) {
                    // 빌딩 정보와 매칭
                    const buildingMap = new Map();
                    this.excelData.buildings.forEach(building => {
                        const key = `${building['빌딩명']}_${building['출처회사']}`;
                        buildingMap.set(key, building);
                    });
                    
                    results = results.filter(item => {
                        const key = `${item['빌딩명']}_${item['출처회사']}`;
                        const buildingInfo = buildingMap.get(key);
                        
                        if (!buildingInfo || !buildingInfo['기준층전용면적']) return false;
                        
                        const area = parseFloat(buildingInfo['기준층전용면적'].replace(/,/g, ''));
                        if (isNaN(area)) return false;
                        
                        if (criteria.buildingAreaFrom && area < parseFloat(criteria.buildingAreaFrom)) return false;
                        if (criteria.buildingAreaTo && area > parseFloat(criteria.buildingAreaTo)) return false;
                        
                        // 기준층 면적 정보 추가
                        item['기준층전용면적'] = buildingInfo['기준층전용면적'];
                        return true;
                    });
                }
            }
            
            this.currentResults = results;
            console.log(`🔍 검색 완료: ${results.length}개 결과 (${searchType} 검색)`);
            
            return results;
        } catch (error) {
            console.error('❌ 검색 실행 중 오류:', error);
            this.currentResults = [];
            return [];
        } finally {
            this.showLoading(false);
        }
    },
    
    // 로딩 표시
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('d-none');
            } else {
                overlay.classList.add('d-none');
            }
        }
    },
    
    // 선택된 빌딩 추가/제거
    toggleBuildingSelection(buildingData) {
        if (!buildingData || !buildingData.빌딩명) return;
        
        const key = `${buildingData.빌딩명}_${buildingData.주소 || ''}`;
        
        if (this.selectedBuildings.has(key)) {
            this.selectedBuildings.delete(key);
        } else {
            this.selectedBuildings.add(key);
        }
        
        this.updateSelectedBuildingsDisplay();
    },
    
    // 선택된 빌딩 표시 업데이트
    updateSelectedBuildingsDisplay() {
        const section = document.getElementById('selectedBuildingsSection');
        const list = document.getElementById('selectedBuildingsList');
        const count = document.getElementById('selectedCount');
        
        if (!section || !list || !count) return;
        
        count.textContent = this.selectedBuildings.size;
        
        if (this.selectedBuildings.size > 0) {
            section.classList.remove('d-none');
            
            list.innerHTML = Array.from(this.selectedBuildings).map(key => {
                const [name, address] = key.split('_');
                return `
                    <span class="selected-building-tag">
                        ${name}
                        <button onclick="DataManager.removeSelectedBuilding('${key.replace(/'/g, "\\'")}')">&times;</button>
                    </span>
                `;
            }).join('');
        } else {
            section.classList.add('d-none');
        }
    },
    
    // 선택된 빌딩 제거
    removeSelectedBuilding(key) {
        this.selectedBuildings.delete(key);
        this.updateSelectedBuildingsDisplay();
        
        // 체크박스 업데이트
        const checkbox = document.querySelector(`input[data-building-key="${key}"]`);
        if (checkbox) {
            checkbox.checked = false;
            const row = checkbox.closest('tr');
            if (row) row.classList.remove('table-warning');
        }
    },
    
    // 초기화
    async init() {
        try {
            console.log('🚀 DataManager 초기화 시작...');
            
            // 캐시 데이터 로드
            const cacheLoaded = await this.loadCache();
            
            // Excel 데이터 로드
            const excelLoaded = await this.loadExcelData();
            
            this.isInitialized = true;
            
            console.log('✅ DataManager 초기화 완료:', {
                cache: cacheLoaded ? '성공' : '기본값 사용',
                excel: excelLoaded ? '성공' : '샘플 데이터 사용',
                buildings: this.excelData?.buildings?.length || 0,
                vacancies: this.excelData?.vacancies?.length || 0
            });
            
            return true;
        } catch (error) {
            console.error('❌ DataManager 초기화 실패:', error);
            this.isInitialized = false;
            return false;
        }
    }
};

// 전역 함수로 노출
window.DataManager = DataManager;

// 페이지 로드시 초기화 - DOM 준비 후 안전하게 실행
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📄 DOM 로드 완료, DataManager 초기화...');
        await DataManager.init();
        
        // 다른 매니저들이 DataManager 초기화를 기다릴 수 있도록 이벤트 발생
        window.dispatchEvent(new CustomEvent('dataManagerReady', {
            detail: { 
                success: DataManager.isInitialized,
                cache: DataManager.cache,
                excelData: DataManager.excelData 
            }
        }));
        
    } catch (error) {
        console.error('❌ 초기화 중 치명적 오류:', error);
    }
});