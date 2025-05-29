// 전역 데이터 저장소
const DataManager = {
    cache: null,
    excelData: null,
    selectedBuildings: new Set(),
    currentResults: [],
    
    // Google Drive 파일 ID (업데이트 필요!)
    SPREADSHEET_ID: 'YOUR_GOOGLE_DRIVE_FILE_ID', // 여기에 실제 파일 ID 입력
    
    // 캐시 데이터 로드
    async loadCache() {
        try {
            const response = await fetch('data/cache_data.json');
            this.cache = await response.json();
            
            // 마지막 업데이트 시간 표시
            document.getElementById('lastUpdated').textContent = 
                `마지막 업데이트: ${this.cache.last_updated}`;
            
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
    
    // Google Sheets 데이터 로드
    async loadExcelData() {
        try {
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
            
            console.log('Excel 데이터 로드 완료:', {
                buildings: this.excelData.buildings.length,
                vacancies: this.excelData.vacancies.length
            });
            
            return true;
        } catch (error) {
            console.error('Excel 데이터 로드 실패:', error);
            
            // 대체 방법: 로컬 JSON 파일 사용 (개발용)
            try {
                const response = await fetch('data/excel_data.json');
                this.excelData = await response.json();
                console.log('로컬 데이터 사용');
                return true;
            } catch (localError) {
                console.error('로컬 데이터도 로드 실패:', localError);
                return false;
            }
        }
    },
    
    // Google Sheets 데이터 파싱
    parseSheetData(sheetData) {
        if (!sheetData.values || sheetData.values.length < 2) return [];
        
        const headers = sheetData.values[0];
        const rows = sheetData.values.slice(1);
        
        return rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    },
    
    // 검색 실행
    search(criteria) {
        this.showLoading(true);
        
        let results = [...this.excelData.vacancies];
        
        // 빌딩명 검색
        if (criteria.buildingName) {
            const searchTerm = criteria.buildingName.toLowerCase();
            results = results.filter(item => 
                item['빌딩명'] && item['빌딩명'].toLowerCase().includes(searchTerm)
            );
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
                const area = parseFloat(item['공실전용면적(평)']);
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
                
                if (!buildingInfo || !buildingInfo['기준층 전용면적']) return false;
                
                const area = parseFloat(buildingInfo['기준층 전용면적']);
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
        
        return results;
    },
    
    // 로딩 표시
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('d-none');
        } else {
            overlay.classList.add('d-none');
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
        
        count.textContent = this.selectedBuildings.size;
        
        if (this.selectedBuildings.size > 0) {
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
        if (checkbox) checkbox.checked = false;
    },
    
    // 초기화
    async init() {
        const cacheLoaded = await this.loadCache();
        if (!cacheLoaded) return false;
        
        // 실제 구현시에는 loadExcelData() 사용
        // const excelLoaded = await this.loadExcelData();
        
        // 개발용 임시 데이터
        this.excelData = {
            buildings: [],
            vacancies: []
        };
        
        return true;
    }
};

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await DataManager.init();
});