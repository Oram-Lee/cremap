// 전역 데이터 저장소 - 작동하는 완전한 버전
const DataManager = {
    cache: null,
    excelData: null,
    mergedData: [],  // ⭐ 병합된 데이터 저장소 추가
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
    
    // Excel 데이터 로드 (JSON 파일에서) - ⭐ 병합 로직 추가
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
                        console.log('📋 buildings에 공실 정보가 없음, 빈 배열 사용');
                        this.excelData.vacancies = [];
                    }
                }
            }
            
            // ⭐ 데이터 병합 로직 추가
            this.mergeData();
            
            return true;
        } catch (error) {
            console.error('❌ Excel 데이터 로드 실패:', error);
            
            // 샘플 데이터로 대체
            this.excelData = {
                buildings: this.generateSampleBuildingData(),
                vacancies: this.generateSampleVacancyData()
            };
            
            // ⭐ 샘플 데이터도 병합
            this.mergeData();
            
            console.log('📝 샘플 데이터 사용');
            return false;
        }
    },
    
    // ⭐ 개선된 데이터 병합 메서드 - 양방향 데이터 보완
    mergeData() {
        console.group('🔄 데이터 병합 시작 (개선된 버전)');
        
        // 1단계: 빌딩 정보와 공실 정보를 Map으로 구성
        const buildingMap = new Map();
        const vacancyMap = new Map();
        
        // 빌딩 정보 Map 생성
        if (this.excelData.buildings) {
            this.excelData.buildings.forEach(building => {
                const cleanedName = building['빌딩명'] ? 
                    building['빌딩명'].replace(/[\u200B-\u200D\uFEFF\u202C]/g, '').trim() : '';
                const source = building['출처회사'] || building['출처'] || '';
                const key = `${cleanedName}_${source}`;
                
                if (!buildingMap.has(key)) {
                    buildingMap.set(key, []);
                }
                buildingMap.get(key).push(building);
            });
        }
        
        // 공실 정보 Map 생성
        if (this.excelData.vacancies) {
            this.excelData.vacancies.forEach(vacancy => {
                const cleanedName = vacancy['빌딩명'] ? 
                    vacancy['빌딩명'].replace(/[\u200B-\u200D\uFEFF\u202C]/g, '').trim() : '';
                const source = vacancy['출처회사'] || vacancy['출처'] || '';
                const key = `${cleanedName}_${source}`;
                
                if (!vacancyMap.has(key)) {
                    vacancyMap.set(key, []);
                }
                vacancyMap.get(key).push(vacancy);
            });
        }
        
        console.log(`📋 빌딩 맵 생성: ${buildingMap.size}개 고유 빌딩`);
        console.log(`📋 공실 맵 생성: ${vacancyMap.size}개 고유 빌딩`);
        
        // 2단계: 병합된 데이터 생성
        this.mergedData = [];
        const processedKeys = new Set();
        
        // 2-1: 공실이 있는 빌딩 처리 (기존 방식 + 개선)
        vacancyMap.forEach((vacancies, key) => {
            const buildingInfoList = buildingMap.get(key) || [];
            
            // 빌딩 정보를 통합 (여러 레코드가 있을 경우)
            const consolidatedBuildingInfo = this.consolidateBuildingInfo(buildingInfoList);
            
            vacancies.forEach(vacancy => {
                // 병합 객체 생성
                const merged = { ...consolidatedBuildingInfo };
                
                // 공실 정보로 덮어쓰기 (빈 값 제외)
                Object.keys(vacancy).forEach(field => {
                    const value = vacancy[field];
                    if (value !== '' && value !== null && value !== undefined) {
                        merged[field] = value;
                    }
                });
                
                // 빈 필드 양방향 보완
                this.fillMissingFields(merged, consolidatedBuildingInfo, vacancy);
                
                // 정규화된 빌딩명 사용
                const [cleanedName, source] = key.split('_');
                merged.빌딩명 = cleanedName;
                
                this.mergedData.push(merged);
            });
            
            processedKeys.add(key);
        });
        
        // 2-2: 공실이 없는 빌딩도 추가 (새로운 기능)
        buildingMap.forEach((buildings, key) => {
            if (!processedKeys.has(key)) {
                // 공실 정보가 없는 빌딩
                const consolidatedBuildingInfo = this.consolidateBuildingInfo(buildings);
                
                // 같은 빌딩의 공실 정보가 있는지 다른 출처에서 확인
                const [cleanedName] = key.split('_');
                const relatedVacancyInfo = this.findRelatedVacancyInfo(cleanedName, vacancyMap);
                
                // 병합 객체 생성
                const merged = { ...consolidatedBuildingInfo };
                
                // 관련 공실 정보에서 주소, 인근역 등 보완
                if (relatedVacancyInfo) {
                    this.fillMissingFields(merged, consolidatedBuildingInfo, relatedVacancyInfo);
                }
                
                // 정규화된 빌딩명 사용
                merged.빌딩명 = cleanedName;
                
                // 공실 정보가 없음을 표시
                if (!merged['공실층']) merged['공실층'] = '-';
                if (!merged['공실전용면적(평)']) merged['공실전용면적(평)'] = '-';
                if (!merged['공실임대면적(평)']) merged['공실임대면적(평)'] = '-';
                
                this.mergedData.push(merged);
            }
        });
        
        console.log(`✅ 데이터 병합 완료: ${this.mergedData.length}개 레코드`);
        console.log(`   - 공실 있는 빌딩: ${processedKeys.size}개`);
        console.log(`   - 공실 없는 빌딩: ${buildingMap.size - processedKeys.size}개`);
        
        // 병합 결과 샘플 출력
        if (this.mergedData.length > 0) {
            console.log('병합 결과 샘플 (첫 5개):');
            this.mergedData.slice(0, 5).forEach((item, index) => {
                console.log(`[${index + 1}] 빌딩: ${item.빌딩명}, 층: ${item.공실층}, 주소: ${item.주소 ? '있음' : '없음'}, 인근역: ${item.인근역 ? '있음' : '없음'}`);
            });
        }
        
        console.groupEnd();
    },
    
    // 여러 빌딩 정보를 하나로 통합
    consolidateBuildingInfo(buildingList) {
        if (buildingList.length === 0) return {};
        if (buildingList.length === 1) return { ...buildingList[0] };
        
        // 첫 번째 빌딩 정보를 기본으로
        const consolidated = { ...buildingList[0] };
        
        // 나머지 빌딩 정보에서 빈 필드 채우기
        for (let i = 1; i < buildingList.length; i++) {
            const building = buildingList[i];
            Object.keys(building).forEach(field => {
                const value = building[field];
                if (value && value !== '' && (!consolidated[field] || consolidated[field] === '')) {
                    consolidated[field] = value;
                }
            });
        }
        
        return consolidated;
    },
    
    // 같은 빌딩명의 다른 출처 공실 정보 찾기
    findRelatedVacancyInfo(buildingName, vacancyMap) {
        let relatedInfo = null;
        
        vacancyMap.forEach((vacancies, key) => {
            const [name] = key.split('_');
            if (name === buildingName && vacancies.length > 0) {
                // 가장 완전한 정보를 가진 공실 데이터 선택
                const bestVacancy = vacancies.reduce((best, current) => {
                    const bestFieldCount = Object.values(best).filter(v => v && v !== '').length;
                    const currentFieldCount = Object.values(current).filter(v => v && v !== '').length;
                    return currentFieldCount > bestFieldCount ? current : best;
                });
                
                if (!relatedInfo || Object.values(bestVacancy).filter(v => v && v !== '').length > 
                    Object.values(relatedInfo).filter(v => v && v !== '').length) {
                    relatedInfo = bestVacancy;
                }
            }
        });
        
        return relatedInfo;
    },
    
    // 빈 필드 양방향 보완
    fillMissingFields(merged, buildingInfo, vacancyInfo) {
        const fieldsToFill = ['주소', '인근역', '연락처', '엘리베이터', '주차대수', '빌딩규모', '연면적'];
        
        fieldsToFill.forEach(field => {
            if (!merged[field] || merged[field] === '') {
                // 먼저 빌딩 정보에서 찾기
                if (buildingInfo && buildingInfo[field] && buildingInfo[field] !== '') {
                    merged[field] = buildingInfo[field];
                }
                // 없으면 공실 정보에서 찾기
                else if (vacancyInfo && vacancyInfo[field] && vacancyInfo[field] !== '') {
                    merged[field] = vacancyInfo[field];
                }
            }
        });
    },
    
    // 샘플 빌딩 데이터 생성
    generateSampleBuildingData() {
        return [
            {
                '빌딩명': '강남파이낸스센터',
                '주소': '서울시 강남구 테헤란로 152',
                '인근역': '- 2호선 강남역 도보 3분',
                '기준층전용면적': '500',
                '빌딩규모': 'B6/38F',
                '연면적': '82,742',
                '출처회사': 'CBRE'
            },
            {
                '빌딩명': '역삼IT타워',
                '주소': '서울시 강남구 역삼동 123-45',
                '인근역': '- 2호선 역삼역 도보 5분',
                '기준층전용면적': '300',
                '빌딩규모': 'B4/25F',
                '연면적': '45,320',
                '출처회사': 'ACT'
            },
            {
                '빌딩명': '선릉비즈센터',
                '주소': '서울시 강남구 선릉로 100',
                '인근역': '- 분당선 선릉역 도보 2분',
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
                '공실층': '15F',
                '공실전용면적(평)': '150',
                '공실임대면적(평)': '210',
                '임대료': '85,000',
                '관리비': '25,000',
                '보증금': '10,000,000',
                '입주시기': '즉시',
                '출처회사': 'CBRE'
            },
            {
                '빌딩명': '역삼IT타워',
                '공실층': '8F',
                '공실전용면적(평)': '80',
                '공실임대면적(평)': '120',
                '임대료': '75,000',
                '관리비': '20,000',
                '보증금': '8,000,000',
                '입주시기': '협의',
                '출처회사': 'ACT'
            },
            {
                '빌딩명': '선릉비즈센터',
                '공실층': '12F',
                '공실전용면적(평)': '200',
                '공실임대면적(평)': '280',
                '임대료': '90,000',
                '관리비': '30,000',
                '보증금': '12,000,000',
                '입주시기': '24년 12월',
                '출처회사': 'KTG'
            }
        ];
    },
    
    // 검색 실행 - ⭐ mergedData 사용하도록 수정
    search(criteria) {
        if (!this.isInitialized) {
            console.warn('⚠️ DataManager가 초기화되지 않았습니다.');
            alert('데이터가 아직 로드되지 않았습니다.');
            return [];
        }
        
        this.showLoading(true);
        
        try {
            // ⭐ mergedData 사용
            let results = [...this.mergedData];
            
            console.log(`🔍 병합 데이터 검색 시작: ${results.length}개`);
            
            // 빌딩명 검색 - ⭐ 보이지 않는 문자 제거 로직 추가
            if (criteria.buildingName && criteria.buildingName.trim()) {
                // 보이지 않는 문자 제거
                const searchTerm = criteria.buildingName
                    .replace(/[\u200B-\u200D\uFEFF\u202C]/g, '') // 보이지 않는 문자 제거
                    .toLowerCase()
                    .trim();
                
                results = results.filter(item => {
                    if (!item['빌딩명']) return false;
                    
                    // 데이터의 빌딩명도 정규화
                    const normalizedItemName = item['빌딩명']
                        .replace(/[\u200B-\u200D\uFEFF\u202C]/g, '')
                        .toLowerCase();
                    
                    return normalizedItemName.includes(searchTerm);
                });
                
                console.log(`빌딩명 '${searchTerm}' 검색 결과: ${results.length}개`);
            }
            
            // 지역명 검색
            if (criteria.district && criteria.district.trim()) {
                const searchTerm = criteria.district.toLowerCase().trim();
                results = results.filter(item => 
                    item['주소'] && item['주소'].toLowerCase().includes(searchTerm)
                );
                console.log(`지역명 '${criteria.district}' 검색 결과: ${results.length}개`);
            }
            
            // 역명 검색 - ⭐ 정확한 역명만 매칭하도록 완전히 수정
            if (criteria.station && criteria.station.trim()) {
                const stationTerm = criteria.station.toLowerCase().trim();
                const normalizedSearch = stationTerm.replace(/역$/g, '');
                
                results = results.filter(item => {
                    if (!item['인근역']) return false;
                    
                    const nearbyStation = item['인근역'].toLowerCase();
                    
                    // 역명이 정확히 매칭되는지 확인
                    // 1. "역" 단위로 분리 (예: "강남역", "강남구청역" 등)
                    const stationPattern = /([가-힣a-zA-Z0-9]+역)/g;
                    const stations = nearbyStation.match(stationPattern) || [];
                    
                    // 2. 추출된 역명 중에서 정확히 매칭되는지 확인
                    const isMatch = stations.some(station => {
                        const stationName = station.replace(/역$/g, '');
                        // 정확한 매칭만 허용
                        return stationName === normalizedSearch || 
                               station === stationTerm ||
                               station === (normalizedSearch + '역');
                    });
                    
                    // 도보시간 필터링
                    if (isMatch && criteria.walkingTime && criteria.walkingTime.trim()) {
                        const walkingTime = parseInt(criteria.walkingTime);
                        const match = nearbyStation.match(/(\d+)분/);
                        if (match) {
                            const buildingWalkTime = parseInt(match[1]);
                            if (buildingWalkTime > walkingTime) {
                                return false;
                            }
                        }
                    }
                    
                    return isMatch;
                });
                
                console.log(`역명 '${criteria.station}' 검색 결과: ${results.length}개`);
            }
            
            // 공실 면적 검색
            if (criteria.vacancyAreaFrom || criteria.vacancyAreaTo) {
                results = results.filter(item => {
                    // 여러 필드명 체크
                    const areaStr = item['공실전용면적(평)'] || item['공실임대면적(평)'] || item['전용면적'] || '';
                    
                    // 면적이 '-' 인 경우 제외 (공실 정보 없음)
                    if (areaStr === '-' || areaStr === '') return false;
                    
                    // '@' 기호 제거 및 숫자 추출
                    const area = parseFloat(areaStr.toString().replace('@', '').replace(/,/g, ''));
                    
                    if (isNaN(area)) return false;
                    
                    if (criteria.vacancyAreaFrom && area < parseFloat(criteria.vacancyAreaFrom)) return false;
                    if (criteria.vacancyAreaTo && area > parseFloat(criteria.vacancyAreaTo)) return false;
                    
                    return true;
                });
                console.log(`면적 조건 검색 결과: ${results.length}개`);
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
                vacancies: this.excelData?.vacancies?.length || 0,
                merged: this.mergedData?.length || 0  // ⭐ 병합 데이터 개수 추가
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
                excelData: DataManager.excelData,
                mergedData: DataManager.mergedData  // ⭐ 병합 데이터도 전달
            }
        }));
        
    } catch (error) {
        console.error('❌ 초기화 중 치명적 오류:', error);
    }
});