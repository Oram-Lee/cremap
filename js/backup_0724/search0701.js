// 검색 관리자
const SearchManager = {
    currentPage: 1,
    pageSize: 20,
    duplicateStats: { // 중복 제거 통계 추가
        performSearch: { before: 0, after: 0, removed: 0 },
        displayResults: { before: 0, after: 0, removed: 0 }
    },
    
    // 초기화
    init() {
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 자동완성 설정
        this.setupAutoComplete();
    },
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 검색 유형 변경
        document.getElementById('searchType').addEventListener('change', (e) => {
            this.switchSearchType(e.target.value);
        });
        
        // 검색 버튼
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.performSearch();
        });
        
        // 초기화 버튼
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetSearch();
        });
        
        // 페이지 크기 변경
        document.getElementById('pageSize').addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.displayResults();
        });
        
        // 선택된 빌딩 지도보기
        document.getElementById('showSelectedMap').addEventListener('click', () => {
            MapManager.showSelectedBuildingsMap();
        });
        
        // Enter 키 검색은 setupAutoCompleteInput에서 처리
    },
    
    // 검색 유형 전환
    switchSearchType(type) {
        // 모든 검색 입력 숨기기
        document.querySelectorAll('.search-input').forEach(el => {
            el.classList.add('d-none');
        });
        
        // 선택된 유형 표시
        switch(type) {
            case 'building':
                document.getElementById('buildingSearch').classList.remove('d-none');
                break;
            case 'district':
                document.getElementById('districtSearch').classList.remove('d-none');
                break;
            case 'station':
                document.getElementById('stationSearch').classList.remove('d-none');
                break;
            case 'area':
                document.getElementById('areaSearch').classList.remove('d-none');
                break;
            case 'complex':
                // 복합검색은 모든 입력 표시
                document.getElementById('buildingSearch').classList.remove('d-none');
                document.getElementById('districtSearch').classList.remove('d-none');
                document.getElementById('stationSearch').classList.remove('d-none');
                document.getElementById('areaSearch').classList.remove('d-none');
                document.getElementById('complexSearch').classList.remove('d-none');
                break;
        }
    },
    
    // 자동완성 설정
    setupAutoComplete() {
        // 빌딩명 자동완성
        this.setupAutoCompleteInput('buildingName', 'buildingSuggestions', 'buildings');
        
        // 지역명 자동완성
        this.setupAutoCompleteInput('districtName', 'districtSuggestions', 'districts', 'dongs');
        
        // 역명 자동완성
        this.setupAutoCompleteInput('stationName', 'stationSuggestions', 'stations');
    },
    
    // 개별 자동완성 설정
    setupAutoCompleteInput(inputId, suggestionsId, ...cacheKeys) {
        const input = document.getElementById(inputId);
        const suggestions = document.getElementById(suggestionsId);
        let currentFocus = -1;
        
        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            if (value.length < 1) {
                suggestions.classList.remove('show');
                return;
            }
            
            // 데이터 결합
            let allItems = [];
            cacheKeys.forEach(key => {
                if (DataManager.cache && DataManager.cache[key]) {
                    allItems = allItems.concat(DataManager.cache[key]);
                }
            });
            
            // 필터링
            const filtered = allItems.filter(item => 
                item.toLowerCase().includes(value)
            ).slice(0, 20); // 최대 20개
            
            // 표시
            if (filtered.length > 0) {
                suggestions.innerHTML = filtered.map((item, index) => 
                    `<div class="suggestion-item" data-index="${index}" data-value="${item}">${item}</div>`
                ).join('');
                suggestions.classList.add('show');
                currentFocus = -1;
            } else {
                suggestions.classList.remove('show');
            }
        });
        
        // 항목 클릭
        suggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-item')) {
                input.value = e.target.dataset.value;
                suggestions.classList.remove('show');
            }
        });
        
        // 키보드 네비게이션
        input.addEventListener('keydown', (e) => {
            const items = suggestions.querySelectorAll('.suggestion-item');
            
            if (e.key === 'ArrowDown') {
                currentFocus++;
                addActive(items);
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                currentFocus--;
                addActive(items);
                e.preventDefault();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentFocus > -1 && items[currentFocus]) {
                    // 자동완성 항목이 선택된 경우
                    items[currentFocus].click();
                } else {
                    // 선택된 항목이 없으면 바로 검색 실행
                    suggestions.classList.remove('show');
                    this.performSearch();
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.remove('show');
            }
        });
        
        function addActive(items) {
            removeActive(items);
            if (currentFocus >= items.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = items.length - 1;
            if (items[currentFocus]) {
                items[currentFocus].classList.add('active');
            }
        }
        
        function removeActive(items) {
            items.forEach(item => item.classList.remove('active'));
        }
        
        // 포커스 아웃시 숨기기 (약간의 지연)
        input.addEventListener('blur', () => {
            setTimeout(() => suggestions.classList.remove('show'), 200);
        });
    },
    
    // ⭐ 중복 제거 메서드 추가
    removeDuplicates(results, context = 'unknown') {
        console.group(`🔍 중복 제거 [${context}]`);
        console.log(`원본 결과 수: ${results.length}`);
        
        const uniqueMap = new Map();
        const duplicateDetails = [];
        
        results.forEach((item, index) => {
            // 빌딩명 정규화 (보이지 않는 문자 제거)
            const cleanedName = item.빌딩명 ? 
                item.빌딩명.replace(/[\u200B-\u200D\uFEFF\u202C]/g, '').trim() : '';
            
            // 유니크 키 생성: 빌딩명 + 공실층 + 출처회사
            const source = item.출처회사 || item.출처 || '';
            const uniqueKey = `${cleanedName}_${item.공실층}_${source}`;
            
            if (uniqueMap.has(uniqueKey)) {
                const existing = uniqueMap.get(uniqueKey);
                duplicateDetails.push({
                    index: index,
                    빌딩명: cleanedName,
                    공실층: item.공실층,
                    출처: source,
                    key: uniqueKey
                });
                
                // 더 완전한 데이터로 업데이트 (필드가 많이 채워진 것)
                const existingFieldCount = Object.values(existing)
                    .filter(v => v && v !== '-' && v !== '').length;
                const newFieldCount = Object.values(item)
                    .filter(v => v && v !== '-' && v !== '').length;
                
                console.log(`  중복 비교: 기존(${existingFieldCount}필드) vs 신규(${newFieldCount}필드)`);
                
                if (newFieldCount > existingFieldCount) {
                    uniqueMap.set(uniqueKey, item);
                    console.log(`  → 더 완전한 데이터로 교체`);
                }
            } else {
                uniqueMap.set(uniqueKey, item);
            }
        });
        
        const uniqueResults = Array.from(uniqueMap.values());
        const removedCount = results.length - uniqueResults.length;
        
        // 통계 업데이트
        if (context === 'performSearch') {
            this.duplicateStats.performSearch = {
                before: results.length,
                after: uniqueResults.length,
                removed: removedCount
            };
        } else if (context === 'displayResults') {
            this.duplicateStats.displayResults = {
                before: results.length,
                after: uniqueResults.length,
                removed: removedCount
            };
        }
        
        if (duplicateDetails.length > 0) {
            console.log(`⚠️ 중복 발견: ${duplicateDetails.length}개`);
            console.table(duplicateDetails.slice(0, 10)); // 처음 10개만 표시
        }
        
        console.log(`✅ 중복 제거 완료: ${results.length}개 → ${uniqueResults.length}개 (${removedCount}개 제거)`);
        console.groupEnd();
        
        return uniqueResults;
    },
    
    // 검색 실행 - 1차 중복 제거 추가
    performSearch() {
        const searchType = document.getElementById('searchType').value;
        const criteria = {};
        
        // 검색 조건 수집
        if (searchType === 'complex' || searchType === 'building') {
            criteria.buildingName = document.getElementById('buildingName').value;
        }
        
        if (searchType === 'complex' || searchType === 'district') {
            criteria.district = document.getElementById('districtName').value;
        }
        
        if (searchType === 'complex' || searchType === 'station') {
            criteria.station = document.getElementById('stationName').value;
            criteria.walkingTime = document.getElementById('walkingTime').value;
        }
        
        if (searchType === 'complex' || searchType === 'area') {
            criteria.vacancyAreaFrom = document.getElementById('vacancyAreaFrom').value;
            criteria.vacancyAreaTo = document.getElementById('vacancyAreaTo').value;
        }
        
        // 검색 실행
        const rawResults = DataManager.search(criteria);
        
        // ⭐ 1차 중복 제거 (performSearch 시점)
        const uniqueResults = this.removeDuplicates(rawResults, 'performSearch');
        
        // 중복 제거된 결과를 저장
        DataManager.currentResults = uniqueResults;
        
        // 결과 표시
        this.currentPage = 1;
        this.displayResults();
        
        // 전체 중복 제거 통계 표시
        console.log('📊 전체 중복 제거 통계:', this.duplicateStats);
    },
    
    // 검색 결과의 빈 필드를 채우는 함수
    fillEmptyFields(results) {
        // 빌딩명별로 완전한 정보를 저장할 객체
        const buildingInfo = {};
        
        console.log('fillEmptyFields 시작, 전체 결과 수:', results.length);
        
        // 1단계: 각 빌딩의 완전한 정보 수집
        results.forEach(result => {
            // 빌딩명 정규화 - 보이지 않는 문자 제거
            const cleanedName = result.빌딩명 ? result.빌딩명.replace(/[\u200B-\u200D\uFEFF\u202C]/g, '').trim() : '';
            const key = cleanedName;
            
            if (!key) return;
            
            if (!buildingInfo[key]) {
                buildingInfo[key] = {
                    빌딩명: cleanedName,
                    주소: null,
                    인근역: null,
                    출처회사: result.출처회사 || result.출처
                };
            }
            
            // 정보가 있으면 업데이트 (빈 문자열도 체크)
            if (result.주소 && result.주소.trim()) {
                // 더 긴 주소로 업데이트 (더 상세한 정보일 가능성)
                if (!buildingInfo[key].주소 || result.주소.length > buildingInfo[key].주소.length) {
                    buildingInfo[key].주소 = result.주소;
                }
            }
            if (result.인근역 && result.인근역.trim()) {
                // 더 긴 인근역 정보로 업데이트 (더 상세한 정보일 가능성)
                if (!buildingInfo[key].인근역 || result.인근역.length > buildingInfo[key].인근역.length) {
                    buildingInfo[key].인근역 = result.인근역;
                }
            }
            // 출처회사도 업데이트
            if (!buildingInfo[key].출처회사 && (result.출처회사 || result.출처)) {
                buildingInfo[key].출처회사 = result.출처회사 || result.출처;
            }
        });
        
        console.log('수집된 빌딩 정보:', Object.keys(buildingInfo).length);
        
        // 빌딩 정보 샘플 출력
        const sampleKeys = Object.keys(buildingInfo).slice(0, 3);
        sampleKeys.forEach(key => {
            console.log(`빌딩 정보 [${key}]:`, buildingInfo[key]);
        });
        
        // 2단계: 각 결과에 빈 필드 채우기
        const filledResults = results.map((result, index) => {
            // 빌딩명 정규화
            const cleanedName = result.빌딩명 ? result.빌딩명.replace(/[\u200B-\u200D\uFEFF\u202C]/g, '').trim() : '';
            const info = buildingInfo[cleanedName] || {};
            
            // 디버깅을 위한 로그 (처음 5개만)
            if (index < 5) {
                console.log(`결과 ${index}:`, {
                    원본빌딩명: result.빌딩명,
                    정규화빌딩명: cleanedName,
                    원본: result,
                    보충정보: info
                });
            }
            
            // 모든 필드를 명시적으로 처리
            const filled = {
                ...result,
                빌딩명: cleanedName || '-',
                주소: result.주소 && result.주소.trim() ? result.주소 : (info.주소 || '-'),
                인근역: result.인근역 && result.인근역.trim() ? result.인근역 : (info.인근역 || '-'),
                공실층: result.공실층 || '-',
                '공실전용면적(평)': result['공실전용면적(평)'] || result.공실전용면적 || '-',
                '공실임대면적(평)': result['공실임대면적(평)'] || result.공실임대면적 || '-',
                출처회사: result.출처회사 || result.출처 || info.출처회사 || '-'
            };
            
            // 채워진 후 확인
            if (index < 5) {
                console.log(`채워진 결과 ${index}:`, {
                    주소: filled.주소,
                    인근역: filled.인근역
                });
            }
            
            return filled;
        });
        
        return filledResults;
    },
    
    // 검색 결과 표시 - 2차 중복 제거 추가
    displayResults() {
        const results = DataManager.currentResults;
        const tbody = document.getElementById('resultsBody');
        const resultCount = document.getElementById('resultCount');
        
        // ⭐ 2차 중복 제거 (displayResults 시점)
        const uniqueResults = this.removeDuplicates(results, 'displayResults');
        
        // 빈 필드 채우기
        const filledResults = this.fillEmptyFields(uniqueResults);
        
        // 결과 수 표시
        resultCount.textContent = filledResults.length;
        
        if (filledResults.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-5">
                        검색 결과가 없습니다.
                    </td>
                </tr>
            `;
            this.updatePagination(0);
            return;
        }
        
        // 페이지네이션 계산
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, filledResults.length);
        const pageResults = filledResults.slice(startIndex, endIndex);
        
        // 테이블 생성 - async 처리 필요
        this.renderTableRows(pageResults, startIndex, tbody);
        
        this.updatePagination(filledResults.length);
    },
    
    // 새로운 비동기 렌더링 메서드
    async renderTableRows(pageResults, startIndex, tbody) {
        const rows = [];
        
        console.log('renderTableRows 시작, 페이지 결과 수:', pageResults.length);
        
        for (let i = 0; i < pageResults.length; i++) {
            const item = pageResults[i];
            const index = startIndex + i;
            const buildingKey = `${item.빌딩명}_${item.주소}`;
            const isSelected = DataManager.selectedBuildings.has(buildingKey);
            
            // 첫 번째 항목 디버깅
            if (i === 0) {
                console.log('첫 번째 항목 상세:', item);
            }
            
            // PDF 존재 여부 확인 (PDFSearchManager 사용)
            let hasPdf = false;
            if (window.PDFSearchManager) {
                hasPdf = await window.PDFSearchManager.hasPDF(item);
            }
            
            rows.push(`
                <tr>
                    <td>
                        <input type="checkbox" class="form-check-input" 
                               data-building-key="${buildingKey}"
                               data-index="${index}"
                               ${isSelected ? 'checked' : ''}
                               onchange="SearchManager.toggleSelection(this)">
                    </td>
                    <td>${item.빌딩명 || '-'}</td>
                    <td>${item.주소 || '-'}</td>
                    <td>${item.인근역 || '-'}</td>
                    <td>${item.공실층 || '-'}</td>
                    <td>${item['공실전용면적(평)'] || '-'}</td>
                    <td>${item['공실임대면적(평)'] || '-'}</td>
                    <td>${item.출처회사 || '-'}</td>
                    <td class="action-buttons">
                        <div class="btn-group btn-group-sm">
                            ${hasPdf ? `
                                <button class="btn btn-outline-primary" 
                                        onclick="SearchManager.showDetail(${index})">
                                    <i class="bi bi-file-pdf"></i> PDF
                                </button>
                            ` : `
                                <button class="btn btn-outline-secondary" disabled>
                                    <i class="bi bi-file-pdf"></i> PDF
                                </button>
                            `}
                            <button class="btn btn-outline-success" 
                                    onclick="MapManager.showBuildingMap(${index})">
                                <i class="bi bi-map"></i> 지도
                            </button>
                        </div>
                    </td>
                </tr>
            `);
        }
        
        tbody.innerHTML = rows.join('');
    },
    
    // 페이지네이션 업데이트
    updatePagination(totalResults) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(totalResults / this.pageSize);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // 이전 버튼
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="SearchManager.goToPage(${this.currentPage - 1})">이전</a>
            </li>
        `;
        
        // 페이지 번호
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="SearchManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        // 다음 버튼
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="SearchManager.goToPage(${this.currentPage + 1})">다음</a>
            </li>
        `;
        
        pagination.innerHTML = html;
    },
    
    // 페이지 이동
    goToPage(page) {
        const totalPages = Math.ceil(DataManager.currentResults.length / this.pageSize);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.displayResults();
            
            // 스크롤 위로
            document.getElementById('resultsTable').scrollIntoView({ behavior: 'smooth' });
        }
    },
    
    // 선택 토글
    toggleSelection(checkbox) {
        const index = parseInt(checkbox.dataset.index);
        const buildingData = DataManager.currentResults[index];
        
        DataManager.toggleBuildingSelection(buildingData);
    },
    
    // 상세보기 - PDF 열기 (수정된 버전)
    showDetail(index) {
        const item = DataManager.currentResults[index];
        
        console.group('🔍 PDF 상세보기');
        console.log('선택된 항목:', item);
        console.log('전용면적:', item['공실전용면적(평)']);
        console.log('임대면적:', item['공실임대면적(평)']);
        
        // PDF 검색 매니저 사용
        if (typeof window.PDFSearchManager !== 'undefined') {
            // 면적 정보를 포함하여 전달
            window.PDFSearchManager.openPDFWithSearch({
                빌딩명: item.빌딩명,
                출처회사: item.출처회사 || item.출처,
                주소: item.주소,
                인근역: item.인근역,
                공실전용면적: item['공실전용면적(평)'] || item.공실전용면적,
                공실임대면적: item['공실임대면적(평)'] || item.공실임대면적
            });
        } else {
            // PDFSearchManager가 없을 경우 직접 처리
            const buildingName = item.빌딩명;
            const source = item.출처회사 || item.출처;
            const exclusiveArea = item['공실전용면적(평)'] || item.공실전용면적;
            const rentArea = item['공실임대면적(평)'] || item.공실임대면적;
            
            console.log('PDFSearchManager 없이 직접 처리');
            console.log('출처:', source);
            console.log('전용면적:', exclusiveArea);
            console.log('임대면적:', rentArea);
            
            // 면적 정규화 (숫자만 추출)
            const normalizeArea = (area) => {
                if (!area || area === '-') return null;
                const match = String(area).match(/\d+\.?\d*/);
                return match ? match[0] : null;
            };
            
            const normalizedExclusive = normalizeArea(exclusiveArea);
            const normalizedRent = normalizeArea(rentArea);
            
            // PDF 파일명 생성 (PDFSearchManager의 로직과 동일하게)
            const fileName = `${source}.pdf`;
            
            // URL 파라미터 구성
            const params = new URLSearchParams({
                file: fileName,
                building: buildingName,
                source: source
            });
            
            // 면적 정보 추가
            if (normalizedExclusive) {
                params.append('exclusive', normalizedExclusive);
            }
            if (normalizedRent) {
                params.append('rent', normalizedRent);
            }
            
            // 면적이 있으면 area 파라미터도 추가 (우선순위: 전용면적 > 임대면적)
            const searchArea = normalizedExclusive || normalizedRent;
            if (searchArea) {
                params.append('area', searchArea);
            }
            
            // 면적이 없으면 검색어로 빌딩명과 주소 추가
            if (!searchArea) {
                const searchTerms = [];
                if (buildingName) searchTerms.push(buildingName);
                if (item.주소) searchTerms.push(item.주소);
                if (searchTerms.length > 0) {
                    params.append('search', searchTerms.join(' '));
                }
            }
            
            console.log('최종 URL 파라미터:', params.toString());
            console.groupEnd();
            
            // PDF 뷰어 열기
            window.open(`pdf-viewer.html?${params.toString()}`, '_blank');
        }
    },
    
    // 검색 초기화
    resetSearch() {
        // 입력 필드 초기화
        document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            input.value = '';
        });
        
        // 검색 유형 초기화
        document.getElementById('searchType').value = 'building';
        this.switchSearchType('building');
        
        // 결과 초기화
        DataManager.currentResults = [];
        this.currentPage = 1;
        
        // 중복 제거 통계 초기화
        this.duplicateStats = {
            performSearch: { before: 0, after: 0, removed: 0 },
            displayResults: { before: 0, after: 0, removed: 0 }
        };
        
        // 테이블 초기화
        document.getElementById('resultsBody').innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    검색 조건을 입력하고 검색 버튼을 클릭하세요.
                </td>
            </tr>
        `;
        
        document.getElementById('resultCount').textContent = '0';
        document.getElementById('pagination').innerHTML = '';
        
        console.log('🔄 검색 초기화 완료');
    }
};

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    SearchManager.init();
});
