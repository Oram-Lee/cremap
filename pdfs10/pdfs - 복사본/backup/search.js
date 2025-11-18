// 검색 관리자 - 완전한 최종 버전
const SearchManager = {
    currentPage: 1,
    pageSize: 20,
    
    // 초기화
    init() {
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 자동완성 설정
        this.setupAutoComplete();
        
        console.log('🔍 SearchManager 초기화 완료');
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
        
        if (!input || !suggestions) return;
        
        let currentFocus = -1;
        
        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase().trim();
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
            
            // 중복 제거 및 필터링
            const uniqueItems = [...new Set(allItems)];
            const filtered = uniqueItems.filter(item => 
                item && item.toLowerCase().includes(value)
            ).slice(0, 15); // 최대 15개
            
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
                input.focus();
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
                } else {
                    suggestions.classList.remove('show');
                }
            } else if (e.key === 'Escape') {
                suggestions.classList.remove('show');
                currentFocus = -1;
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
            setTimeout(() => {
                suggestions.classList.remove('show');
                currentFocus = -1;
            }, 200);
        });
        
        // 포커스 인시 위치 조정
        input.addEventListener('focus', () => {
            if (input.value.length > 0) {
                input.dispatchEvent(new Event('input'));
            }
        });
    },
    
    // 검색 실행
    performSearch() {
        const searchType = document.getElementById('searchType').value;
        const criteria = {};
        
        // 검색 조건 수집
        if (searchType === 'complex' || searchType === 'building') {
            criteria.buildingName = document.getElementById('buildingName').value.trim();
        }
        
        if (searchType === 'complex' || searchType === 'district') {
            criteria.district = document.getElementById('districtName').value.trim();
        }
        
        if (searchType === 'complex' || searchType === 'station') {
            criteria.station = document.getElementById('stationName').value.trim();
            criteria.walkingTime = document.getElementById('walkingTime').value;
        }
        
        if (searchType === 'complex' || searchType === 'area') {
            criteria.vacancyAreaFrom = document.getElementById('vacancyAreaFrom').value;
            criteria.vacancyAreaTo = document.getElementById('vacancyAreaTo').value;
            criteria.buildingAreaFrom = document.getElementById('buildingAreaFrom').value;
            criteria.buildingAreaTo = document.getElementById('buildingAreaTo').value;
        }
        
        // 검색 조건 검증
        if (!this.validateSearchCriteria(criteria)) {
            return;
        }
        
        console.log('🔍 검색 실행:', criteria);
        
        // 검색 실행
        const results = DataManager.search(criteria);
        
        // 결과 표시
        this.currentPage = 1;
        this.displayResults();
        
        // 검색 결과 로그
        console.log(`📊 검색 완료: ${results.length}개 결과`);
    },
    
    // 검색 조건 검증
    validateSearchCriteria(criteria) {
        const hasAnyInput = Object.values(criteria).some(value => 
            value && value.toString().trim() !== ''
        );
        
        if (!hasAnyInput) {
            alert('최소 하나의 검색 조건을 입력해주세요.');
            return false;
        }
        
        // 면적 범위 검증
        if (criteria.vacancyAreaFrom && criteria.vacancyAreaTo) {
            const from = parseFloat(criteria.vacancyAreaFrom);
            const to = parseFloat(criteria.vacancyAreaTo);
            if (from > to) {
                alert('공실 면적의 최소값이 최대값보다 클 수 없습니다.');
                return false;
            }
        }
        
        if (criteria.buildingAreaFrom && criteria.buildingAreaTo) {
            const from = parseFloat(criteria.buildingAreaFrom);
            const to = parseFloat(criteria.buildingAreaTo);
            if (from > to) {
                alert('기준층 면적의 최소값이 최대값보다 클 수 없습니다.');
                return false;
            }
        }
        
        return true;
    },
    
    // 검색 결과 표시 - PDF 상태 완전 통합
    displayResults() {
        const results = DataManager.currentResults;
        const tbody = document.getElementById('resultsBody');
        const resultCount = document.getElementById('resultCount');
        
        // 결과 수 표시
        resultCount.textContent = results.length.toLocaleString();
        
        if (results.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-5">
                        <i class="bi bi-search fs-1 d-block mb-3 opacity-50"></i>
                        <div class="fs-5 mb-2">검색 결과가 없습니다</div>
                        <div class="text-sm">다른 검색 조건을 시도해보세요</div>
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
        
        // 테이블 생성 - PDF 상태 완전 통합
        tbody.innerHTML = pageResults.map((item, index) => {
            const globalIndex = startIndex + index;
            const buildingKey = `${item.빌딩명}_${item.주소}`;
            const isSelected = DataManager.selectedBuildings.has(buildingKey);
            
            // PDF 상태 확인
            const pdfStatus = PDFManager.checkPdfAvailability(item.빌딩명, item.출처회사);
            
            // PDF 버튼 스타일 및 아이콘
            const pdfButtonClass = {
                'high-confidence': 'btn-success',
                'medium-confidence': 'btn-warning', 
                'low-confidence': 'btn-danger',
                'not-found': 'btn-outline-secondary'
            }[pdfStatus.status] || 'btn-outline-secondary';
            
            const pdfIcon = pdfStatus.available ? 'bi-file-pdf-fill' : 'bi-file-pdf';
            const pdfText = pdfStatus.available ? 'PDF' : 'PDF';
            const pdfTitle = pdfStatus.available 
                ? `PDF 있음 (신뢰도: ${pdfStatus.confidence}%) - 클릭하여 보기`
                : 'PDF 자료 없음';
            
            // 빌딩명에 PDF 상태 배지 추가
            const buildingNameWithBadge = pdfStatus.available
                ? `${item.빌딩명 || '-'} <span class="badge bg-${pdfStatus.status === 'high-confidence' ? 'success' : pdfStatus.status === 'medium-confidence' ? 'warning' : 'danger'} ms-1" style="font-size: 0.7em;">PDF</span>`
                : (item.빌딩명 || '-');
            
            return `
                <tr class="${isSelected ? 'table-warning' : ''}">
                    <td>
                        <input type="checkbox" class="form-check-input" 
                               data-building-key="${buildingKey}"
                               data-index="${globalIndex}"
                               ${isSelected ? 'checked' : ''}
                               onchange="SearchManager.toggleSelection(this)">
                    </td>
                    <td>
                        ${buildingNameWithBadge}
                    </td>
                    <td class="text-muted small">${item.주소 || '-'}</td>
                    <td>${item.인근역 || '-'}</td>
                    <td class="text-center">${item.공실층 || '-'}</td>
                    <td class="text-end">${item['공실전용면적(평)'] ? parseFloat(item['공실전용면적(평)']).toLocaleString() + '평' : '-'}</td>
                    <td class="text-end">${item.기준층전용면적 ? parseFloat(item.기준층전용면적).toLocaleString() + '평' : '-'}</td>
                    <td>
                        <span class="badge bg-light text-dark border">${item.출처회사 || '-'}</span>
                    </td>
                    <td class="action-buttons">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn ${pdfButtonClass}" 
                                    onclick="SearchManager.showDetail(${globalIndex})"
                                    title="${pdfTitle}"
                                    ${!pdfStatus.available ? 'disabled' : ''}>
                                <i class="bi ${pdfIcon}"></i> ${pdfText}
                            </button>
                            <button class="btn btn-outline-info" 
                                    onclick="MapManager.showBuildingMap(${globalIndex})"
                                    title="지도에서 위치 보기">
                                <i class="bi bi-geo-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.updatePagination(results.length);
        
        // 페이지 정보 업데이트
        this.updatePageInfo(results.length, startIndex, endIndex);
    },
    
    // 페이지 정보 업데이트
    updatePageInfo(totalResults, startIndex, endIndex) {
        // 현재 페이지 정보를 결과 카운트 근처에 표시
        const resultCountElement = document.getElementById('resultCount');
        if (resultCountElement && totalResults > 0) {
            const pageInfo = ` (${startIndex + 1}-${endIndex})`;
            resultCountElement.innerHTML = `${totalResults.toLocaleString()}<small class="text-muted">${pageInfo}</small>`;
        }
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
                <a class="page-link" href="#" onclick="SearchManager.goToPage(${this.currentPage - 1})" tabindex="${this.currentPage === 1 ? '-1' : '0'}">
                    <i class="bi bi-chevron-left"></i> 이전
                </a>
            </li>
        `;
        
        // 페이지 번호 - 스마트 표시
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        // 첫 페이지
        if (startPage > 1) {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="SearchManager.goToPage(1)">1</a>
                </li>
            `;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // 현재 페이지 주변
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="SearchManager.goToPage(${i})">${i}</a>
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
                    <a class="page-link" href="#" onclick="SearchManager.goToPage(${totalPages})">${totalPages}</a>
                </li>
            `;
        }
        
        // 다음 버튼
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="SearchManager.goToPage(${this.currentPage + 1})" tabindex="${this.currentPage === totalPages ? '-1' : '0'}">
                    다음 <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = html;
    },
    
    // 페이지 이동
    goToPage(page) {
        const totalPages = Math.ceil(DataManager.currentResults.length / this.pageSize);
        if (page >= 1 && page <= totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.displayResults();
            
            // 스크롤 위로 (부드럽게)
            document.getElementById('resultsTable').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            console.log(`📄 페이지 이동: ${page}/${totalPages}`);
        }
    },
    
    // 선택 토글
    toggleSelection(checkbox) {
        const index = parseInt(checkbox.dataset.index);
        const buildingData = DataManager.currentResults[index];
        
        if (buildingData) {
            DataManager.toggleBuildingSelection(buildingData);
            
            // 체크박스 상태에 따른 행 스타일 업데이트
            const row = checkbox.closest('tr');
            if (checkbox.checked) {
                row.classList.add('table-warning');
            } else {
                row.classList.remove('table-warning');
            }
        }
    },
    
    // 상세보기 - PDF 뷰어 완전 통합
    showDetail(index) {
        const item = DataManager.currentResults[index];
        
        if (!item) {
            alert('선택된 빌딩 정보를 찾을 수 없습니다.');
            return;
        }
        
        // PDF 상태 확인
        const pdfStatus = PDFManager.checkPdfAvailability(item.빌딩명, item.출처회사);
        
        console.log(`📄 상세보기 요청: ${item.빌딩명} (${item.출처회사})`, pdfStatus);
        
        if (!pdfStatus.available) {
            // PDF가 없는 경우 기본 정보 모달 표시
            this.showBasicInfoModal(item);
        } else {
            // PDF 뷰어 모달 표시
            PDFManager.showPdfModal(item.빌딩명, item.출처회사);
        }
    },
    
    // 기본 정보 모달 (PDF가 없는 경우)
    showBasicInfoModal(item) {
        const modalHtml = `
            <div class="modal fade" id="basicInfoModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-light">
                            <h5 class="modal-title">
                                <i class="bi bi-building"></i>
                                ${item.빌딩명} 
                                <span class="badge bg-secondary ms-2">PDF 없음</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <h6 class="text-primary mb-3">
                                        <i class="bi bi-info-circle"></i> 기본 정보
                                    </h6>
                                    <table class="table table-borderless table-sm">
                                        <tr><td class="fw-bold text-muted">빌딩명</td><td>${item.빌딩명 || '-'}</td></tr>
                                        <tr><td class="fw-bold text-muted">주소</td><td>${item.주소 || '-'}</td></tr>
                                        <tr><td class="fw-bold text-muted">인근역</td><td>${item.인근역 || '-'}</td></tr>
                                        <tr><td class="fw-bold text-muted">출처회사</td><td><span class="badge bg-light text-dark border">${item.출처회사 || '-'}</span></td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-success mb-3">
                                        <i class="bi bi-house"></i> 공실 정보
                                    </h6>
                                    <table class="table table-borderless table-sm">
                                        <tr><td class="fw-bold text-muted">공실층</td><td>${item.공실층 || '-'}</td></tr>
                                        <tr><td class="fw-bold text-muted">공실면적</td><td>${item['공실전용면적(평)'] ? parseFloat(item['공실전용면적(평)']).toLocaleString() + '평' : '-'}</td></tr>
                                        <tr><td class="fw-bold text-muted">기준층면적</td><td>${item.기준층전용면적 ? parseFloat(item.기준층전용면적).toLocaleString() + '평' : '-'}</td></tr>
                                    </table>
                                </div>
                            </div>
                            
                            <div class="alert alert-info mt-4">
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>PDF 자료 없음</strong><br>
                                해당 빌딩의 상세 PDF 자료가 준비되지 않았습니다. 
                                자세한 정보는 <strong>${item.출처회사}</strong>에 직접 문의하시기 바랍니다.
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-success" 
                                    onclick="MapManager.showBuildingMap(${DataManager.currentResults.indexOf(item)}); bootstrap.Modal.getInstance(document.getElementById('basicInfoModal')).hide();">
                                <i class="bi bi-geo-alt"></i> 지도에서 보기
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> 닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 기존 모달 제거
        const existingModal = document.getElementById('basicInfoModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 모달 표시
        const modal = new bootstrap.Modal(document.getElementById('basicInfoModal'));
        modal.show();
    },
    
    // 검색 초기화
    resetSearch() {
        // 입력 필드 초기화
        document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            input.value = '';
        });
        
        // 자동완성 숨기기
        document.querySelectorAll('.suggestions').forEach(suggestions => {
            suggestions.classList.remove('show');
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
                <td colspan="9" class="text-center text-muted py-5">
                    <i class="bi bi-search fs-1 d-block mb-3 opacity-50"></i>
                    <div class="fs-5 mb-2">검색 조건을 입력하고 검색 버튼을 클릭하세요</div>
                    <div class="text-sm text-muted">빌딩명, 지역명, 역명 또는 임대조건으로 검색할 수 있습니다</div>
                </td>
            </tr>
        `;
        
        document.getElementById('resultCount').textContent = '0';
        document.getElementById('pagination').innerHTML = '';
        
        // 선택된 빌딩 초기화
        DataManager.selectedBuildings.clear();
        DataManager.updateSelectedBuildingsDisplay();
        
        console.log('🔄 검색 조건 초기화 완료');
    }
};

// 전역 함수로 노출
window.SearchManager = SearchManager;

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SearchManager 초기화 시작...');
    SearchManager.init();
});
