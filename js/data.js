// 전역 데이터 저장소
const DataManager = {
    cache: null,
    excelData: null,
    selectedBuildings: new Set(),
    currentResults: [],
    
    // 캐시 데이터 로드
    async loadCache() {
        try {
            const response = await fetch('data/cache_data.json');
            this.cache = await response.json();
            
            // 마지막 업데이트 시간 표시
            const lastUpdatedEl = document.getElementById('lastUpdated');
            if (lastUpdatedEl) {
                lastUpdatedEl.textContent = `마지막 업데이트: ${this.cache.last_updated}`;
            }
            
            console.log('캐시 데이터 로드 완료:', {
                buildings: this.cache.buildings.length,
                districts: this.cache.districts.length,
                stations: this.cache.stations.length
            });
            
            return true;
        } catch (error) {
            console.error('캐시 로드 실패:', error);
            alert('데이터를 로드하는데 실패했습니다. 페이지를 새로고침해주세요.');
            return false;
        }
    },
    
    // Excel 데이터 로드 (JSON 파일에서)
    async loadExcelData() {
        try {
            console.log('JSON 파일에서 데이터 로드 시작...');
            const response = await fetch('data/excel_data.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.excelData = await response.json();
            
            console.log('Excel 데이터 로드 완료:', {
                buildings: this.excelData.buildings ? this.excelData.buildings.length : 0,
                vacancies: this.excelData.vacancies ? this.excelData.vacancies.length : 0
            });
            
            // 데이터 확인
            if (!this.excelData.vacancies || this.excelData.vacancies.length === 0) {
                console.warn('⚠️ 공실 데이터가 없습니다!');
                
                // buildings 배열에서 공실 정보 확인
                const vacanciesInBuildings = this.excelData.buildings.filter(b => 
                    b['공실층'] || b['공실전용면적(평)']
                );
                
                if (vacanciesInBuildings.length > 0) {
                    console.log(`buildings 배열에서 ${vacanciesInBuildings.length}개의 공실 정보 발견`);
                    // buildings 배열의 공실 정보를 vacancies로 복사
                    this.excelData.vacancies = vacanciesInBuildings;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Excel 데이터 로드 실패:', error);
            alert('데이터를 로드하는데 실패했습니다. excel_data.json 파일을 확인하세요.');
            return false;
        }
    },
    
    // 검색 실행
    search(criteria) {
        if (!this.excelData) {
            alert('데이터가 아직 로드되지 않았습니다.');
            return [];
        }
        
        this.showLoading(true);
        
        // vacancies가 없으면 buildings에서 검색
        let searchArray = this.excelData.vacancies && this.excelData.vacancies.length > 0 
            ? this.excelData.vacancies 
            : this.excelData.buildings;
        
        let results = [...searchArray];
        
        // 빌딩명 검색
        if (criteria.buildingName) {
            const searchTerm = criteria.buildingName.toLowerCase();
            results = results.filter(item => 
                item['빌딩명'] && item['빌딩명'].toLowerCase().includes(searchTerm)
            );
            console.log(`빌딩명 '${criteria.buildingName}' 검색 결과: ${results.length}개`);
        }
        
        // 지역명 검색
        if (criteria.district) {
            const searchTerm = criteria.district.toLowerCase();
            results = results.filter(item => 
                item['주소'] && item['주소'].toLowerCase().includes(searchTerm)
            );
        }
        
        // 역명 검색
        if (criteria.station) {
            const stationTerm = criteria.station.toLowerCase();
            results = results.filter(item => {
                if (!item['인근역']) return false;
                const nearbyStation = item['인근역'].toLowerCase();
                
                // 역명 포함 여부 확인
                if (!nearbyStation.includes(stationTerm)) return false;
                
                // 도보시간 필터링
                if (criteria.walkingTime) {
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
                const area = parseFloat(item['공실전용면적(평)']) || parseFloat(item['공실임대면적(평)']);
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
                
                const area = parseFloat(buildingInfo['기준층 전용면적']) || 
                           parseFloat(buildingInfo['기준층전용면적']) || 
                           parseFloat(buildingInfo['기준층면적']);
                           
                if (isNaN(area)) return false;
                
                if (criteria.buildingAreaFrom && area < parseFloat(criteria.buildingAreaFrom)) return false;
                if (criteria.buildingAreaTo && area > parseFloat(criteria.buildingAreaTo)) return false;
                
                // 기준층 면적 정보 추가
                item['기준층전용면적'] = area;
                return true;
            });
        }
        
        this.currentResults = results;
        this.showLoading(false);
        
        console.log(`최종 검색 결과: ${results.length}개`);
        return results;
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
        const key = `${buildingData.빌딩명}_${buildingData.주소}`;
        
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
        
        if (count) count.textContent = this.selectedBuildings.size;
        
        if (this.selectedBuildings.size > 0 && section && list) {
            section.classList.remove('d-none');
            
            list.innerHTML = Array.from(this.selectedBuildings).map(key => {
                const [name, address] = key.split('_');
                return `
                    <span class="selected-building-tag">
                        ${name}
                        <button onclick="DataManager.removeSelectedBuilding('${key}')">&times;</button>
                    </span>
                `;
            }).join('');
        } else if (section) {
            section.classList.add('d-none');
        }
    },
    
    // 선택된 빌딩 제거
    removeSelectedBuilding(key) {
        this.selectedBuildings.delete(key);
        this.updateSelectedBuildingsDisplay();
        
        // 체크박스 업데이트
        const checkbox = document.querySelector(`input[data-building-key="${key}"]`);
        if (checkbox) checkbox.checked = false;
    },
    
    // 초기화
    async init() {
        console.log('DataManager 초기화 시작...');
        
        const cacheLoaded = await this.loadCache();
        if (!cacheLoaded) {
            console.error('캐시 로드 실패');
            return false;
        }
        
        // JSON 파일에서 Excel 데이터 로드
        const excelLoaded = await this.loadExcelData();
        if (!excelLoaded) {
            console.error('Excel 데이터 로드 실패');
            return false;
        }
        
        console.log('DataManager 초기화 완료!');
        return true;
    }
};

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('페이지 로드 완료, 초기화 시작...');
    const success = await DataManager.init();
    if (success) {
        console.log('시스템 준비 완료!');
    }
});
