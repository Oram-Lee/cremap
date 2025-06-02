// 전역 데이터 저장소 - 작동하는 완전한 버전
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
    
    // Excel 데이터 로드 (JSON 파일에서)
    async loadExcelData() {
        try {
            console.log('📊 Excel 데이터 로드 시도...');
            
            // 로컬 JSON 파일에서 직접 로드
            const response = await fetch('data/excel_data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.excelData = await response.json();
            
            console.log('✅ Excel 데이터 로드 완료:', {
                buildings: this.excelData.buildings ? this.excelData.buildings.length : 0,
                vacancies: this.excelData.vacancies ? this.excelData.vacancies.length : 0
            });
            
            // 데이터 확인 및 보정
            if (!this.excelData.vacancies || this.excelData.vacancies.length === 0) {
                console.warn('⚠️ 공실 데이터가 없습니다!');
                
                // buildings 배열에서 공실 정보 확인
                if (this.excelData.buildings && this.excelData.buildings.length > 0) {
                    const vacanciesInBuildings = this.excelData.buildings.filter(b => 
                        b['공실층'] || b['공실전용면적(평)'] || b['임대료'] || b['보증금']
                    );
                    
                    if (vacanciesInBuildings.length > 0) {
                        console.log(`📋 buildings 배열에서 ${vacanciesInBuildings.length}개의 공실 정보 발견`);
                        // buildings 배열의 공실 정보를 vacancies로 복사
                        this.excelData.vacancies = vacanciesInBuildings;
                    } else {
                        console.log('📋 buildings에 공실 정보가 없음, 전체를 사용');
                        this.excelData.vacancies = this.excelData.buildings;
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Excel 데이터 로드 실패:', error);
            
            // 샘플 데이터로 대체
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
    
    // 검색 실행
    search(criteria) {
        if (!this.isInitialized) {
            console.warn('⚠️ DataManager가 초기화되지 않았습니다.');
            alert('데이터가 아직 로드되지 않았습니다.');
            return [];
        }
        
        this.showLoading(true);
        
        try {
            // vacancies가 없거나 비어있으면 buildings에서 검색
            let searchArray = this.excelData.vacancies && this.excelData.vacancies.length > 0 
                ? this.excelData.vacancies 
                : this.excelData.buildings;
            
            console.log(`🔍 검색 대상: ${searchArray === this.excelData.vacancies ? 'vacancies' : 'buildings'} (${searchArray.length}개)`);
            
            let results = [...searchArray];
            
            // 빌딩명 검색
            if (criteria.buildingName && criteria.buildingName.trim()) {
                const searchTerm = criteria.buildingName.toLowerCase().trim();
                results = results.filter(item => 
                    item['빌딩명'] && item['빌딩명'].toLowerCase().includes(searchTerm)
                );
                console.log(`빌딩명 '${criteria.buildingName}' 검색 결과: ${results.length}개`);
            }
            
            // 지역명 검색
            if (criteria.district && criteria.district.trim()) {
                const searchTerm = criteria.district.toLowerCase().trim();
                results = results.filter(item => 
                    item['주소'] && item['주소'].toLowerCase().includes(searchTerm)
                );
            }
            
            // 역명 검색 - 개선된 버전
            if (criteria.station && criteria.station.trim()) {
                const stationTerm = criteria.station.toLowerCase().trim();
                
                // "역" 제거하여 유연한 검색
                const normalizedSearch = stationTerm.replace(/역$/g, '');
                
                results = results.filter(item => {
                    if (!item['인근역']) return false;
                    const nearbyStation = item['인근역'].toLowerCase();
                    
                    // 더 유연한 매칭 - "광화문" 또는 "광화문역" 모두 검색 가능
                    const isMatched = nearbyStation.includes(normalizedSearch) || 
                                     nearbyStation.includes(stationTerm) ||
                                     nearbyStation.includes(normalizedSearch + '역');
                    
                    if (!isMatched) return false;
                    
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
                
                console.log(`역명 '${criteria.station}' 검색 결과: ${results.length}개`);
            }
            
            // 공실 면적 검색
            if (criteria.vacancyAreaFrom || criteria.vacancyAreaTo) {
                results = results.filter(item => {
                    // 여러 필드명 체크
                    const areaStr = item['공실전용면적(평)'] || item['공실임대면적(평)'] || item['전용면적'] || '';
                    // '@' 기호 제거 및 숫자 추출
                    const area = parseFloat(areaStr.toString().replace('@', '').replace(/,/g, ''));
                    
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
                if (this.excelData.buildings) {
                    this.excelData.buildings.forEach(building => {
                        const key = `${building['빌딩명']}_${building['출처회사']}`;
                        buildingMap.set(key, building);
                    });
                }
                
                results = results.filter(item => {
                    const key = `${item['빌딩명']}_${item['출처회사']}`;
                    const buildingInfo = buildingMap.get(key) || item; // 자기 자신도 체크
                    
                    // 여러 필드명 체크
                    const area = parseFloat(buildingInfo['기준층 전용면적']) || 
                               parseFloat(buildingInfo['기준층전용면적']) || 
                               parseFloat(buildingInfo['기준층면적']) ||
                               0;
                               
                    if (area === 0) return false;
                    
                    if (criteria.buildingAreaFrom && area < parseFloat(criteria.buildingAreaFrom)) return false;
                    if (criteria.buildingAreaTo && area > parseFloat(criteria.buildingAreaTo)) return false;
                    
                    // 기준층 면적 정보 추가
                    item['기준층전용면적'] = area;
                    return true;
                });
            }
            
            this.currentResults = results;
            console.log(`🔍 최종 검색 결과: ${results.length}개`);
            
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
            if (!cacheLoaded) {
                console.warn('⚠️ 캐시 로드 실패, 계속 진행');
            }
            
            // Excel 데이터 로드
            const excelLoaded = await this.loadExcelData();
            if (!excelLoaded) {
                console.warn('⚠️ Excel 데이터 로드 실패, 샘플 데이터 사용');
            }
            
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
        const success = await DataManager.init();
        
        if (success) {
            console.log('✅ 시스템 준비 완료!');
        }
        
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