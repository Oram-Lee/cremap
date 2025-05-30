// 검색 관리자
const SearchManager = {
    currentPage: 1,
    pageSize: 20,
    
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
        
        // Enter 키 검색
        document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        });
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
                    items[currentFocus].click();
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
    
    // 검색 실행
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
            criteria.buildingAreaFrom = document.getElementById('buildingAreaFrom').value;
            criteria.buildingAreaTo = document.getElementById('buildingAreaTo').value;
        }
        
        // 검색 실행
        const results = DataManager.search(criteria);
        
        // 결과 표시
        this.currentPage = 1;
        this.displayResults();
    },
    
    // 검색 결과 표시
    displayResults() {
        const results = DataManager.currentResults;
        const tbody = document.getElementById('resultsBody');
        const resultCount = document.getElementById('resultCount');
        
        // 결과 수 표시
        resultCount.textContent = results.length;
        
        if (results.length === 0) {
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
        const endIndex = Math.min(startIndex + this.pageSize, results.length);
        const pageResults = results.slice(startIndex, endIndex);
        
        // 테이블 생성
        tbody.innerHTML = pageResults.map((item, index) => {
            const buildingKey = `${item.빌딩명}_${item.주소}`;
            const isSelected = DataManager.selectedBuildings.has(buildingKey);
            
            // PDF 정보 확인
            const pdfInfo = PDFManager.findPDFInfo(item.빌딩명, item.출처회사);
            const hasPdf = pdfInfo !== null;
            
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="form-check-input" 
                               data-building-key="${buildingKey}"
                               data-index="${startIndex + index}"
                               ${isSelected ? 'checked' : ''}
                               onchange="SearchManager.toggleSelection(this)">
                    </td>
                    <td>${item.빌딩명 || '-'}</td>
                    <td>${item.주소 || '-'}</td>
                    <td>${item.인근역 || '-'}</td>
                    <td>${item.공실층 || '-'}</td>
                    <td>${item['공실전용면적(평)'] || '-'}</td>
                    <td>${item.기준층전용면적 || '-'}</td>
                    <td>${item.출처회사 || '-'}</td>
                    <td class="action-buttons">
                        <div class="btn-group btn-group-sm">
                            ${hasPdf ? `
                                <button class="btn btn-outline-primary" 
                                        onclick="SearchManager.showDetail(${startIndex + index})">
                                    <i class="bi bi-file-pdf"></i> PDF
                                </button>
                            ` : `
                                <button class="btn btn-outline-secondary" disabled>
                                    <i class="bi bi-file-pdf"></i> PDF
                                </button>
                            `}
                            <button class="btn btn-outline-success" 
                                    onclick="MapManager.showBuildingMap(${startIndex + index})">
                                <i class="bi bi-map"></i> 지도
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.updatePagination(results.length);
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
    
    // 상세보기 - PDF 열기로 변경
    showDetail(index) {
        const item = DataManager.currentResults[index];
        
        // PDFManager를 통해 PDF 열기
        if (PDFManager && PDFManager.openPDFInNewWindow) {
            PDFManager.openPDFInNewWindow(item);
        } else {
            alert(`PDF 뷰어를 준비 중입니다.\n\n빌딩명: ${item.빌딩명}\n출처: ${item.출처회사}`);
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
    }
};

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    SearchManager.init();
});