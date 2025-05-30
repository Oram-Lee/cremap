// 검색 기능 관리자
const SearchManager = {
    currentPage: 1,
    itemsPerPage: 20,
    totalResults: 0,
    currentResults: [],
    
    // 초기화
    init() {
        console.log('🔍 SearchManager 초기화 완료');
        this.setupEventListeners();
        this.setupAutocomplete();
    },
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 검색 버튼
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }
        
        // 엔터키 검색
        const searchInputs = document.querySelectorAll('.search-input');
        searchInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        });
        
        // 초기화 버튼
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSearch());
        }
        
        // 페이지네이션
        document.addEventListener('click', (e) => {
            if (e.target.closest('.page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (!isNaN(page)) {
                    this.goToPage(page);
                }
            }
        });
        
        // 페이지당 항목 수 변경
        const itemsPerPageSelect = document.getElementById('itemsPerPage');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.displayResults();
            });
        }
        
        // 엑셀 다운로드 버튼
        const downloadExcelBtn = document.getElementById('downloadExcelBtn');
        if (downloadExcelBtn) {
            downloadExcelBtn.addEventListener('click', () => this.downloadExcel());
        }
        
        // 검색 결과 체크박스
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.name === 'selectBuilding') {
                this.handleBuildingSelection(e.target);
            }
        });
        
        // 전체 선택 체크박스
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('input[name="selectBuilding"]');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    this.handleBuildingSelection(cb);
                });
            });
        }
    },
    
    // 자동완성 설정
    setupAutocomplete() {
        // 캐시 데이터가 로드될 때까지 대기
        if (!DataManager.cache) {
            setTimeout(() => this.setupAutocomplete(), 100);
            return;
        }
        
        // 빌딩명 자동완성
        const buildingInput = document.getElementById('buildingName');
        if (buildingInput && DataManager.cache.buildings) {
            new bootstrap.Typeahead(buildingInput, {
                source: DataManager.cache.buildings,
                autoSelect: true,
                minLength: 1,
                showHintOnFocus: true
            });
        }
        
        // 지역명 자동완성
        const districtInput = document.getElementById('district');
        if (districtInput && DataManager.cache.districts) {
            new bootstrap.Typeahead(districtInput, {
                source: DataManager.cache.districts,
                autoSelect: true,
                minLength: 1,
                showHintOnFocus: true
            });
        }
        
        // 역명 자동완성
        const stationInput = document.getElementById('station');
        if (stationInput && DataManager.cache.stations) {
            new bootstrap.Typeahead(stationInput, {
                source: DataManager.cache.stations,
                autoSelect: true,
                minLength: 1,
                showHintOnFocus: true
            });
        }
    },
    
    // 검색 조건 수집
    getSearchCriteria() {
        const criteria = {};
        
        // 기본 검색 조건
        const buildingName = document.getElementById('buildingName')?.value.trim();
        if (buildingName) criteria.buildingName = buildingName;
        
        const district = document.getElementById('district')?.value.trim();
        if (district) criteria.district = district;
        
        const station = document.getElementById('station')?.value.trim();
        if (station) criteria.station = station;
        
        // 고급 검색 조건
        const advancedSearch = document.getElementById('advancedSearch');
        if (advancedSearch && !advancedSearch.classList.contains('collapse')) {
            // 도보 시간
            const walkingTime = document.getElementById('walkingTime')?.value;
            if (walkingTime) criteria.walkingTime = walkingTime;
            
            // 공실 면적
            const vacancyAreaFrom = document.getElementById('vacancyAreaFrom')?.value;
            if (vacancyAreaFrom) criteria.vacancyAreaFrom = vacancyAreaFrom;
            
            const vacancyAreaTo = document.getElementById('vacancyAreaTo')?.value;
            if (vacancyAreaTo) criteria.vacancyAreaTo = vacancyAreaTo;
            
            // 기준층 면적
            const buildingAreaFrom = document.getElementById('buildingAreaFrom')?.value;
            if (buildingAreaFrom) criteria.buildingAreaFrom = buildingAreaFrom;
            
            const buildingAreaTo = document.getElementById('buildingAreaTo')?.value;
            if (buildingAreaTo) criteria.buildingAreaTo = buildingAreaTo;
        }
        
        return criteria;
    },
    
    // 검색 실행
    performSearch() {
        const criteria = this.getSearchCriteria();
        
        // 최소 하나의 검색 조건 필요
        if (Object.keys(criteria).length === 0) {
            alert('최소 하나 이상의 검색 조건을 입력해주세요.');
            return;
        }
        
        console.log('🔍 검색 실행:', criteria);
        
        // DataManager를 통해 검색
        const results = DataManager.search(criteria);
        
        this.currentResults = results;
        this.totalResults = results.length;
        this.currentPage = 1;
        
        console.log(`📊 검색 완료: ${results.length}개 결과`);
        
        this.displayResults();
        this.updateResultsInfo();
    },
    
    // 검색 초기화
    resetSearch() {
        // 입력 필드 초기화
        document.querySelectorAll('.search-input').forEach(input => {
            input.value = '';
        });
        
        // 선택 필드 초기화
        document.querySelectorAll('select.form-select').forEach(select => {
            select.selectedIndex = 0;
        });
        
        // 결과 초기화
        this.currentResults = [];
        this.totalResults = 0;
        this.currentPage = 1;
        
        // UI 업데이트
        this.displayResults();
        this.updateResultsInfo();
        
        // 선택된 빌딩 초기화
        DataManager.selectedBuildings.clear();
        DataManager.updateSelectedBuildingsDisplay();
    },
    
    // 검색 결과 표시
    displayResults() {
        const tbody = document.getElementById('searchResults');
        if (!tbody) return;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageResults = this.currentResults.slice(start, end);
        
        if (pageResults.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center py-5 text-muted">
                        ${this.totalResults === 0 ? '검색 결과가 없습니다.' : '해당 페이지에 결과가 없습니다.'}
                    </td>
                </tr>
            `;
            this.updatePagination();
            return;
        }
        
        tbody.innerHTML = pageResults.map((item, index) => {
            const globalIndex = start + index + 1;
            const buildingKey = `${item['빌딩명']}_${item['주소'] || ''}`;
            const isSelected = DataManager.selectedBuildings.has(buildingKey);
            
            // PDF 정보 확인
            const pdfInfo = PDFManager.findPDFInfo(item['빌딩명'], item['출처회사']);
            const hasPdf = pdfInfo !== null;
            
            // PDF 버튼 생성
            const pdfButton = hasPdf 
                ? `<button class="btn btn-sm btn-outline-primary" 
                     onclick="PDFManager.openPDFInNewWindow(${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     title="${pdfInfo.pageNumber}페이지">
                     <i class="fas fa-file-pdf me-1"></i>PDF
                   </button>`
                : `<button class="btn btn-sm btn-outline-secondary" disabled>
                     <i class="fas fa-file-pdf me-1"></i>없음
                   </button>`;
            
            return `
                <tr class="${isSelected ? 'table-warning' : ''}">
                    <td class="text-center">
                        <input type="checkbox" 
                               name="selectBuilding" 
                               data-building-key="${buildingKey}"
                               data-building='${JSON.stringify(item).replace(/'/g, '&quot;')}'
                               ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="text-center">${globalIndex}</td>
                    <td>${item['빌딩명'] || '-'}</td>
                    <td>${item['주소'] || '-'}</td>
                    <td>${item['인근역'] || '-'}</td>
                    <td>${item['공실층'] || '-'}</td>
                    <td class="text-end">${this.formatNumber(item['공실전용면적(평)']) || '-'}</td>
                    <td class="text-end">${this.formatNumber(item['임대료']) || '-'}</td>
                    <td class="text-end">${this.formatNumber(item['보증금']) || '-'}</td>
                    <td>${item['출처회사'] || '-'}</td>
                    <td class="text-center">
                        ${pdfButton}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-info" 
                                onclick="SearchManager.showBuildingDetail(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.updatePagination();
    },
    
    // 숫자 포맷팅
    formatNumber(value) {
        if (!value || value === '-') return '-';
        
        // @ 기호 제거
        const cleanValue = value.toString().replace('@', '').replace(/,/g, '');
        const number = parseFloat(cleanValue);
        
        if (isNaN(number)) return value;
        
        // 천 단위 구분
        return number.toLocaleString('ko-KR');
    },
    
    // 페이지네이션 업데이트
    updatePagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.totalResults / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        const maxButtons = 10;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        // 이전 페이지
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // 첫 페이지
        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
            `;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // 페이지 번호
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // 마지막 페이지
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }
        
        // 다음 페이지
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = html;
    },
    
    // 페이지 이동
    goToPage(page) {
        const totalPages = Math.ceil(this.totalResults / this.itemsPerPage);
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.displayResults();
        
        // 스크롤 위치 조정
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        console.log(`📄 페이지 이동: ${page}/${totalPages}`);
    },
    
    // 검색 결과 정보 업데이트
    updateResultsInfo() {
        const totalResultsEl = document.getElementById('totalResults');
        const currentRangeEl = document.getElementById('currentRange');
        
        if (totalResultsEl) {
            totalResultsEl.textContent = this.totalResults.toLocaleString('ko-KR');
        }
        
        if (currentRangeEl && this.totalResults > 0) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(start + this.itemsPerPage - 1, this.totalResults);
            currentRangeEl.textContent = `${start}-${end}`;
        } else if (currentRangeEl) {
            currentRangeEl.textContent = '0';
        }
        
        // 결과 섹션 표시/숨김
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            if (this.totalResults > 0) {
                resultsSection.classList.remove('d-none');
            } else {
                resultsSection.classList.add('d-none');
            }
        }
    },
    
    // 빌딩 선택 처리
    handleBuildingSelection(checkbox) {
        const buildingData = JSON.parse(checkbox.dataset.building);
        const row = checkbox.closest('tr');
        
        if (checkbox.checked) {
            DataManager.selectedBuildings.add(checkbox.dataset.buildingKey);
            if (row) row.classList.add('table-warning');
        } else {
            DataManager.selectedBuildings.delete(checkbox.dataset.buildingKey);
            if (row) row.classList.remove('table-warning');
        }
        
        DataManager.updateSelectedBuildingsDisplay();
    },
    
    // 빌딩 상세 정보 표시
    showBuildingDetail(building) {
        console.log('📄 상세보기 요청:', building.빌딩명, `(${building.출처회사})`, building);
        
        // 모달 내용 업데이트
        const modal = document.getElementById('buildingDetailModal');
        if (!modal) return;
        
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        
        if (modalTitle) {
            modalTitle.textContent = building['빌딩명'] || '빌딩 정보';
        }
        
        if (modalBody) {
            // 상세 정보 HTML 생성
            const detailHtml = `
                <div class="building-detail">
                    <h5 class="mb-3">기본 정보</h5>
                    <table class="table table-sm">
                        <tbody>
                            <tr>
                                <th width="30%">빌딩명</th>
                                <td>${building['빌딩명'] || '-'}</td>
                            </tr>
                            <tr>
                                <th>주소</th>
                                <td>${building['주소'] || '-'}</td>
                            </tr>
                            <tr>
                                <th>인근역</th>
                                <td>${building['인근역'] || '-'}</td>
                            </tr>
                            <tr>
                                <th>출처회사</th>
                                <td>${building['출처회사'] || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <h5 class="mt-4 mb-3">공실 정보</h5>
                    <table class="table table-sm">
                        <tbody>
                            <tr>
                                <th width="30%">공실층</th>
                                <td>${building['공실층'] || '-'}</td>
                            </tr>
                            <tr>
                                <th>공실 전용면적</th>
                                <td>${this.formatNumber(building['공실전용면적(평)'])} 평</td>
                            </tr>
                            <tr>
                                <th>임대료</th>
                                <td>${this.formatNumber(building['임대료'])} 원</td>
                            </tr>
                            <tr>
                                <th>보증금</th>
                                <td>${this.formatNumber(building['보증금'])} 원</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    ${building['기준층전용면적'] ? `
                    <h5 class="mt-4 mb-3">빌딩 정보</h5>
                    <table class="table table-sm">
                        <tbody>
                            <tr>
                                <th width="30%">기준층 전용면적</th>
                                <td>${this.formatNumber(building['기준층전용면적'])} 평</td>
                            </tr>
                        </tbody>
                    </table>
                    ` : ''}
                    
                    <div class="mt-4 d-flex gap-2">
                        ${PDFManager.createPDFButton(building, 'btn-primary')}
                        <button class="btn btn-secondary" onclick="MapManager.showBuildingOnMap('${building['주소']}')">
                            <i class="fas fa-map-marker-alt me-1"></i>지도에서 보기
                        </button>
                    </div>
                </div>
            `;
            
            modalBody.innerHTML = detailHtml;
        }
        
        // 모달 표시
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },
    
    // 엑셀 다운로드
    downloadExcel() {
        if (this.currentResults.length === 0) {
            alert('다운로드할 검색 결과가 없습니다.');
            return;
        }
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 데이터 준비
        const data = this.currentResults.map((item, index) => ({
            '번호': index + 1,
            '빌딩명': item['빌딩명'] || '',
            '주소': item['주소'] || '',
            '인근역': item['인근역'] || '',
            '공실층': item['공실층'] || '',
            '공실전용면적(평)': item['공실전용면적(평)'] || '',
            '임대료': item['임대료'] || '',
            '보증금': item['보증금'] || '',
            '출처회사': item['출처회사'] || ''
        }));
        
        // 워크시트 생성
        const ws = XLSX.utils.json_to_sheet(data);
        
        // 워크북에 워크시트 추가
        XLSX.utils.book_append_sheet(wb, ws, '검색결과');
        
        // 파일명 생성
        const fileName = `부동산검색결과_${new Date().toISOString().slice(0, 10)}.xlsx`;
        
        // 다운로드
        XLSX.writeFile(wb, fileName);
        
        console.log(`📥 엑셀 다운로드: ${this.currentResults.length}개 항목`);
    }
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SearchManager 초기화 시작...');
    SearchManager.init();
});