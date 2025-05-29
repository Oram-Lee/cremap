// loadExcelData 함수만 수정 (나머지는 현재 코드 유지)
async loadExcelData() {
    try {
        console.log('📊 Excel 데이터 로드 시도...');
        
        // Google Sheets API는 건너뛰고 바로 로컬 파일 로드
        try {
            const response = await fetch('data/excel_data.json');
            if (response.ok) {
                // 단순하게 그대로 사용!
                this.excelData = await response.json();
                
                console.log('✅ 로컬 Excel 데이터 로드:', {
                    buildings: this.excelData.buildings ? this.excelData.buildings.length : 0,
                    vacancies: this.excelData.vacancies ? this.excelData.vacancies.length : 0
                });
                
                // 데이터 확인 및 보정
                if (!this.excelData.vacancies || this.excelData.vacancies.length === 0) {
                    console.warn('⚠️ vacancies 배열이 없거나 비어있음!');
                    
                    // buildings 배열에서 공실 정보 찾기
                    if (this.excelData.buildings && this.excelData.buildings.length > 0) {
                        const vacanciesInBuildings = this.excelData.buildings.filter(b => 
                            b['공실층'] || b['공실전용면적(평)'] || b['임대료'] || b['보증금']
                        );
                        
                        if (vacanciesInBuildings.length > 0) {
                            console.log(`📋 buildings에서 ${vacanciesInBuildings.length}개의 공실 정보 발견`);
                            this.excelData.vacancies = vacanciesInBuildings;
                        } else {
                            console.log('📋 buildings에 공실 정보가 없음, 전체를 사용');
                            this.excelData.vacancies = this.excelData.buildings;
                        }
                    }
                }
                
                return true;
            }
        } catch (localError) {
            console.warn('⚠️ 로컬 데이터 로드 실패:', localError.message);
        }
        
        // 최종 대체: 샘플 데이터
        this.excelData = {
            buildings: this.generateSampleBuildingData(),
            vacancies: this.generateSampleVacancyData()
        };
        
        console.log('📝 샘플 데이터 사용');
        return false;
        
    } catch (error) {
        console.error('❌ Excel 데이터 로드 중 오류:', error);
        
        // 에러 시에도 샘플 데이터 사용
        this.excelData = {
            buildings: this.generateSampleBuildingData(),
            vacancies: this.generateSampleVacancyData()
        };
        
        return false;
    }
},

// search 함수도 수정 (융통성 있게)
search(criteria) {
    if (!this.isInitialized) {
        console.warn('⚠️ DataManager가 초기화되지 않았습니다.');
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
                // 여러 필드명 체크
                const area = parseFloat(item['공실전용면적(평)']) || 
                           parseFloat(item['공실임대면적(평)']) ||
                           parseFloat(item['전용면적']);
                           
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
        console.log(`🔍 검색 완료: ${results.length}개 결과`);
        
        return results;
    } catch (error) {
        console.error('❌ 검색 실행 중 오류:', error);
        this.currentResults = [];
        return [];
    } finally {
        this.showLoading(false);
    }
},
