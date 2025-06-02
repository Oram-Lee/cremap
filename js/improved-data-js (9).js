// data.js - 개선된 데이터 관리 모듈
const DataManager = (() => {
    let instance = null;
    
    class DataManagerClass {
        constructor() {
            if (instance) {
                return instance;
            }
            
            this.excelData = { vacancies: [], buildings: [] };
            this.cacheData = {};
            this.currentResults = [];
            this.isInitialized = false;
            
            instance = this;
        }
        
        // 캐시 데이터 로드
        async loadCacheData() {
            console.log('📁 캐시 데이터 로드 시도...');
            try {
                const response = await fetch('./assets/data/cache_20241213.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                this.cacheData = data;
                console.log('✅ 캐시 데이터 로드 완료:', data);
                return data;
            } catch (error) {
                console.error('❌ 캐시 데이터 로드 실패:', error);
                return null;
            }
        }
        
        // Excel 데이터에서 검색 수행 (원래 방식)
        searchInExcelData(searchType, criteria) {
            // vacancies와 buildings 모두 검색
            let searchArray = [];
            
            if (searchType === 'vacancies') {
                // vacancies와 buildings 합치기
                searchArray = [
                    ...(this.excelData.vacancies || []),
                    ...(this.excelData.buildings || [])
                ];
                console.log(`통합 검색: vacancies(${this.excelData.vacancies?.length}개) + buildings(${this.excelData.buildings?.length}개)`);
            } else {
                searchArray = this.excelData[searchType] || [];
            }
            
            // 기존 searchInArray 로직 사용
            return this.searchInArray(searchArray, criteria, searchType);
        }
        
        // Excel 데이터 로드
        async loadExcelData() {
            console.log('📊 Excel 데이터 로드 시도...');
            try {
                const response = await fetch('./assets/data/excel_data.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // 데이터가 배열인지 확인
                if (data.vacancies && Array.isArray(data.vacancies)) {
                    this.excelData.vacancies = data.vacancies;
                }
                if (data.buildings && Array.isArray(data.buildings)) {
                    this.excelData.buildings = data.buildings;
                }
                
                console.log('✅ Excel 데이터 로드 완료:', data);
                return data;
            } catch (error) {
                console.error('❌ Excel 데이터 로드 실패:', error);
                console.log('📝 샘플 데이터 사용');
                this.excelData.vacancies = this.generateSampleVacancyData();
                return this.excelData;
            }
        }
        
        // 샘플 공실 데이터 생성
        generateSampleVacancyData() {
            return [
                {
                    '빌딩명': '강남파이낸스센터',
                    '주소': '서울시 강남구 테헤란로 152',
                    '인근역': '- 2호선 강남역 도보 3분',
                    '공실층': '15F',
                    '공실전용면적(평)': '150',
                    '임대료': '85,000',
                    '보증금': '10,000,000',
                    '출처회사': 'CBRE'
                },
                {
                    '빌딩명': '역삼IT타워',
                    '주소': '서울시 강남구 역삼동 123-45',
                    '인근역': '- 2호선 역삼역 도보 5분',
                    '공실층': '8F',
                    '공실전용면적(평)': '80',
                    '임대료': '75,000',
                    '보증금': '8,000,000',
                    '출처회사': 'ACT'
                },
                {
                    '빌딩명': '광화문D타워',
                    '주소': '서울시 종로구 세종대로 21',
                    '인근역': '- 5호선 광화문역 도보 1분',
                    '공실층': '18F',
                    '공실전용면적(평)': '250',
                    '임대료': '95,000',
                    '보증금': '15,000,000',
                    '출처회사': 'CBRE'
                },
                {
                    '빌딩명': '광화문센터빌딩',
                    '주소': '서울시 종로구 종로1길 50',
                    '인근역': '- 5호선 광화문역 도보 3분',
                    '공실층': '12F',
                    '공실전용면적(평)': '180',
                    '임대료': '88,000',
                    '보증금': '12,000,000',
                    '출처회사': 'JLL'
                },
                {
                    '빌딩명': '세종로타워',
                    '주소': '서울시 종로구 세종대로 175',
                    '인근역': '- 5호선 광화문역 도보 5분',
                    '공실층': '25F',
                    '공실전용면적(평)': '300',
                    '임대료': '100,000',
                    '보증금': '18,000,000',
                    '출처회사': 'KTG'
                }
            ];
        }
        
        // 검색 실행
        search(criteria) {
            if (!this.isInitialized) {
                console.warn('⚠️ DataManager가 초기화되지 않았습니다.');
                alert('데이터가 아직 로드되지 않았습니다.');
                return [];
            }
            
            this.showLoading(true);
            
            try {
                let allResults = [];
                
                // vacancies 검색
                if (this.excelData.vacancies && this.excelData.vacancies.length > 0) {
                    console.log(`📋 vacancies 검색 (${this.excelData.vacancies.length}개)`);
                    const vacancyResults = this.searchInArray(this.excelData.vacancies, criteria, 'vacancy');
                    allResults = allResults.concat(vacancyResults);
                }
                
                // buildings 검색
                if (this.excelData.buildings && this.excelData.buildings.length > 0) {
                    console.log(`🏢 buildings 검색 (${this.excelData.buildings.length}개)`);
                    const buildingResults = this.searchInArray(this.excelData.buildings, criteria, 'building');
                    allResults = allResults.concat(buildingResults);
                }
                
                this.currentResults = allResults;
                console.log(`📊 통합 검색 결과: 총 ${allResults.length}개 (vacancies + buildings)`);
                
                return allResults;
            } catch (error) {
                console.error('❌ 검색 실행 중 오류:', error);
                alert('검색 중 오류가 발생했습니다.');
                return [];
            } finally {
                this.showLoading(false);
            }
        }
        
        // 배열에서 실제 검색 수행
        searchInArray(searchArray, criteria, dataType) {
            if (!searchArray || searchArray.length === 0) {
                console.log(`⚠️ ${dataType} 데이터가 비어있습니다.`);
                return [];
            }
            
            let results = [...searchArray];
            
            // 데이터 타입 추가 (vacancy 또는 building)
            results = results.map(item => ({
                ...item,
                _dataType: dataType
            }));
            
            // 빌딩명 검색
            if (criteria.buildingName && criteria.buildingName.trim()) {
                const searchTerm = criteria.buildingName.toLowerCase().trim();
                results = results.filter(item => 
                    item['빌딩명'] && item['빌딩명'].toLowerCase().includes(searchTerm)
                );
                console.log(`빌딩명 '${criteria.buildingName}' 검색 결과 - ${dataType}: ${results.length}개`);
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
                
                console.log(`🔍 역명 검색 시작: "${criteria.station}" → 정규화: "${normalizedSearch}"`);
                
                // 디버깅을 위해 처음 몇 개 인근역 데이터 출력
                const sampleStations = results.slice(0, 5).map(item => item['인근역']).filter(Boolean);
                console.log('샘플 인근역 데이터:', sampleStations);
                
                if (results.length > 0) {
                    console.log(`${dataType}의 첫 번째 데이터 항목:`, JSON.stringify(results[0], null, 2));
                    console.log('데이터 키 목록:', Object.keys(results[0]));
                    
                    // 인근역 관련 필드 찾기
                    const possibleStationFields = Object.keys(results[0]).filter(key => 
                        key.includes('역') || key.includes('station') || key.includes('지하철') || 
                        key.includes('metro') || key.includes('subway')
                    );
                    console.log('역 관련 가능한 필드들:', possibleStationFields);
                    
                    // 모든 필드의 샘플 값 보기
                    console.log('=== 첫 번째 항목의 모든 필드 값 ===');
                    Object.keys(results[0]).forEach(key => {
                        console.log(`${key}: "${results[0][key]}"`);
                    });
                }
                
                results = results.filter(item => {
                    if (!item['인근역']) return false;
                    const nearbyStation = item['인근역'].toLowerCase();
                    
                    // 더 유연한 매칭 - "광화문" 또는 "광화문역" 모두 검색 가능
                    const isMatched = nearbyStation.includes(normalizedSearch) || 
                                     nearbyStation.includes(stationTerm) ||
                                     nearbyStation.includes(normalizedSearch + '역');
                    
                    // 광화문 관련 디버깅
                    if (normalizedSearch === '광화문' && nearbyStation.includes('광화문')) {
                        console.log(`✅ 광화문 매칭 발견: "${item['인근역']}" (빌딩: ${item['빌딩명']})`);
                    }
                    
                    // 강남 vs 광화문 비교 디버깅
                    if (normalizedSearch === '광화문' || normalizedSearch === '강남') {
                        if (nearbyStation.includes(normalizedSearch)) {
                            console.log(`🔍 ${normalizedSearch} 데이터 발견:`, {
                                빌딩명: item['빌딩명'],
                                인근역: item['인근역'],
                                인근역길이: item['인근역'].length,
                                인근역타입: typeof item['인근역']
                            });
                        }
                    }
                    
                    if (!isMatched) return false;
                    
                    // 도보시간 필터링 - 복수 역 정보 처리
                    if (criteria.walkingTime && criteria.walkingTime.trim()) {
                        const walkingTime = parseInt(criteria.walkingTime);
                        
                        // 여러 역이 있는 경우 각각 체크 (쉼표로 구분)
                        const stationParts = nearbyStation.split(',');
                        
                        // 검색한 역에 해당하는 부분만 찾기
                        const relevantPart = stationParts.find(part => 
                            part.includes(normalizedSearch) || 
                            part.includes(stationTerm) ||
                            part.includes(normalizedSearch + '역')
                        );
                        
                        if (relevantPart) {
                            const match = relevantPart.match(/(\d+)분/);
                            if (match) {
                                const itemWalkingTime = parseInt(match[1]);
                                return itemWalkingTime <= walkingTime;
                            }
                        }
                    }
                    
                    return true;
                });
                
                console.log(`${normalizedSearch} 검색 결과 - ${dataType}: ${results.length}개`);
                
                // 검색 결과가 0개일 때 추가 분석
                if (results.length === 0) {
                    console.log('⚠️ 검색 결과가 없습니다. 데이터 분석 중...');
                    
                    // 전체 데이터에서 광화문 관련 항목 찾기
                    const gwangwhamunData = searchArray.filter(item => {
                        const nearbyStation = (item['인근역'] || '').toLowerCase();
                        return nearbyStation.includes('광화문');
                    });
                    
                    console.log(`전체 데이터 중 '광화문' 포함 항목: ${gwangwhamunData.length}개`);
                    
                    if (gwangwhamunData.length > 0) {
                        console.log('광화문 포함 샘플:', gwangwhamunData.slice(0, 3).map(item => ({
                            빌딩명: item['빌딩명'],
                            인근역: item['인근역']
                        })));
                    }
                    
                    // JSON 구조 확인
                    console.log('\n📂 JSON 데이터 구조 확인:');
                    console.log('전체 키:', Object.keys(this.excelData));
                    console.log(`vacancies 타입: ${Array.isArray(this.excelData.vacancies) ? 'Array' : typeof this.excelData.vacancies}`);
                    console.log(`buildings 타입: ${Array.isArray(this.excelData.buildings) ? 'Array' : typeof this.excelData.buildings}`);
                    
                    // 다른 주요 역들 확인
                    const majorStations = ['강남', '역삼', '삼성', '종로', '시청', '을지로'];
                    console.log('\n=== 주요 역별 데이터 개수 ===');
                    majorStations.forEach(station => {
                        const count = searchArray.filter(item => 
                            (item['인근역'] || '').toLowerCase().includes(station)
                        ).length;
                        console.log(`${station}: ${count}개`);
                    });
                    
                    // 전체 인근역 필드가 있는 데이터 개수
                    const withStationInfo = searchArray.filter(item => item['인근역'] && item['인근역'].trim()).length;
                    console.log(`\n인근역 정보가 있는 전체 데이터: ${withStationInfo}개 / ${searchArray.length}개`);
                }
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
            
            console.log(`🔍 ${dataType} 최종 검색 결과: ${results.length}개`);
            
            return results;
        }
        
        // 지도 검색
        searchMap(criteria) {
            console.log('🗺️ 지도 검색 시작:', criteria);
            // 캐시 데이터(buildings) 사용
            let results = this.cacheData.buildings || [];
            
            // 빌딩명 필터링
            if (criteria.buildingName) {
                results = results.filter(building => 
                    building.building_name.toLowerCase().includes(criteria.buildingName.toLowerCase())
                );
            }
            
            // 지역명 필터링
            if (criteria.district) {
                results = results.filter(building => 
                    building.address.toLowerCase().includes(criteria.district.toLowerCase())
                );
            }
            
            console.log(`🗺️ 지도 검색 결과: ${results.length}개`);
            return results;
        }
        
        // PDF 검색
        searchPDF(keyword) {
            console.log('📄 PDF 검색:', keyword);
            // PDF 검색은 pdf-search-manager.js에서 처리
            if (window.PDFSearchManager) {
                return window.PDFSearchManager.search(keyword);
            }
            return [];
        }
        
        // 로딩 표시
        showLoading(show) {
            const loadingDiv = document.getElementById('loading');
            if (loadingDiv) {
                loadingDiv.style.display = show ? 'block' : 'none';
            }
        }
        
        // 초기화
        async initialize() {
            console.log('🚀 DataManager 초기화 시작...');
            
            try {
                const [cacheResult, excelResult] = await Promise.all([
                    this.loadCacheData(),
                    this.loadExcelData()
                ]);
                
                const status = {
                    cache: cacheResult ? '성공' : '실패',
                    excel: excelResult ? '성공' : '실패',
                    vacancies: this.excelData.vacancies?.length || 0,
                    buildings: this.excelData.buildings?.length || 0
                };
                
                this.isInitialized = true;
                console.log('✅ DataManager 초기화 완료:', status);
                
                return status;
            } catch (error) {
                console.error('❌ DataManager 초기화 실패:', error);
                this.isInitialized = false;
                throw error;
            }
        }
    }
    
    // 싱글톤 인스턴스 반환
    return {
        getInstance: () => {
            if (!instance) {
                instance = new DataManagerClass();
            }
            return instance;
        }
    };
})();

// 전역 객체로 노출
window.DataManager = DataManager.getInstance();

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM 로드 완료, DataManager 초기화...');
    
    try {
        await window.DataManager.initialize();
        console.log('✅ 시스템 준비 완료!');
    } catch (error) {
        console.error('❌ 시스템 초기화 실패:', error);
        alert('데이터 로드에 실패했습니다. 페이지를 새로고침해주세요.');
    }
});