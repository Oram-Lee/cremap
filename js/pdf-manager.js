// PDF 매니저 - 완전한 버전
const PDFManager = {
    pdfMappings: null,
    isInitialized: false,
    
    // 초기화
    async init() {
        try {
            console.log('📄 PDFManager 초기화 시작...');
            await this.loadPDFMappings();
            this.isInitialized = true;
            console.log('✅ PDFManager 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ PDFManager 초기화 실패:', error);
            this.isInitialized = false;
            return false;
        }
    },
    
    // PDF 매핑 데이터 로드
    async loadPDFMappings() {
        try {
            console.log('📊 PDF 매핑 데이터 로드 시도...');
            const response = await fetch('data/pdf_mappings.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.pdfMappings = await response.json();
            console.log('✅ PDF 매핑 로드 완료:', {
                회사수: Object.keys(this.pdfMappings).length,
                전체매핑수: Object.values(this.pdfMappings).reduce((acc, curr) => acc + curr.length, 0)
            });
            
            return true;
        } catch (error) {
            console.error('❌ PDF 매핑 로드 실패:', error);
            
            // 기본 매핑 데이터
            this.pdfMappings = {
                "SVS": [
                    { "빌딩명": "OPUS459", "페이지": 5 },
                    { "빌딩명": "강남타워", "페이지": 10 }
                ],
                "CBRE": [
                    { "빌딩명": "강남파이낸스센터", "페이지": 1 }
                ]
            };
            
            return false;
        }
    },
    
    // PDF 파일과 페이지 번호 찾기
    findPDFInfo(buildingName, company) {
        if (!this.pdfMappings || !company || !buildingName) {
            console.warn('⚠️ PDF 매핑 정보 없음:', { buildingName, company });
            return null;
        }
        
        // 정확한 회사명 매칭
        const companyMappings = this.pdfMappings[company];
        if (!companyMappings) {
            console.warn(`⚠️ ${company}의 PDF 매핑 없음`);
            return null;
        }
        
        // 빌딩명 매칭 (대소문자 무시, 공백 제거)
        const normalizedBuildingName = buildingName.replace(/\s+/g, '').toLowerCase();
        
        const mapping = companyMappings.find(item => {
            const normalizedItemName = item.빌딩명.replace(/\s+/g, '').toLowerCase();
            return normalizedItemName === normalizedBuildingName ||
                   normalizedItemName.includes(normalizedBuildingName) ||
                   normalizedBuildingName.includes(normalizedItemName);
        });
        
        if (mapping) {
            return {
                fileName: `${company}.pdf`,
                pageNumber: mapping.페이지
            };
        }
        
        console.warn(`⚠️ ${buildingName}의 PDF 매핑 찾을 수 없음`);
        return null;
    },
    
    // PDF 뷰어 URL 생성 (여러 방법 제공)
    generatePDFViewerUrl(fileName, pageNumber = 1, method = 'direct') {
        // GitHub Pages 서브디렉토리 경로 포함
        const baseUrl = 'https://oram-lee.github.io/cremap/pdfs/';
        const fullPdfUrl = `${baseUrl}${fileName}`;
        
        switch(method) {
            case 'direct':
                // 직접 PDF 열기 (기본값)
                return `${fullPdfUrl}#page=${pageNumber}`;
                
            case 'google':
                // Google Docs 뷰어 사용
                return `https://docs.google.com/viewer?url=${encodeURIComponent(fullPdfUrl)}&embedded=true#:0.page.${pageNumber}`;
                
            case 'iframe':
                // iframe용 URL (페이지 지정 불가)
                return fullPdfUrl;
                
            case 'pdfjs':
                // 자체 호스팅 PDF.js 사용 (추후 구현)
                return `./pdfjs/web/viewer.html?file=${encodeURIComponent(fullPdfUrl)}#page=${pageNumber}`;
                
            default:
                return fullPdfUrl;
        }
    },
    
    // PDF 열기 (새 창)
    openPDFInNewWindow(buildingData) {
        console.log('🔗 PDF 새 창 열기:', buildingData);
        
        const pdfInfo = this.findPDFInfo(buildingData.빌딩명, buildingData.출처회사);
        if (!pdfInfo) {
            alert('해당 빌딩의 PDF 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 직접 PDF 열기 (브라우저 내장 뷰어 사용)
        const pdfUrl = this.generatePDFViewerUrl(pdfInfo.fileName, pdfInfo.pageNumber, 'direct');
        
        // 새 창에서 열기
        const newWindow = window.open(pdfUrl, '_blank', 'width=1200,height=800');
        
        if (!newWindow) {
            alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        }
    },
    
    // PDF 미리보기 모달
    showPDFModal(buildingData) {
        console.log('📄 PDF 모달 표시:', buildingData);
        
        const pdfInfo = this.findPDFInfo(buildingData.빌딩명, buildingData.출처회사);
        if (!pdfInfo) {
            alert('해당 빌딩의 PDF 정보를 찾을 수 없습니다.');
            return;
        }
        
        const modal = document.getElementById('pdfModal');
        if (!modal) {
            console.error('PDF 모달을 찾을 수 없습니다.');
            return;
        }
        
        // 모달 제목 업데이트
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = `${buildingData.빌딩명} - ${buildingData.출처회사} (${pdfInfo.pageNumber}페이지)`;
        }
        
        // PDF 뷰어 옵션들
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="pdf-viewer-options">
                    <div class="alert alert-info mb-3">
                        <strong>PDF 보기 옵션:</strong><br>
                        <small>CORS 정책으로 인해 모달에서 직접 표시가 제한될 수 있습니다.</small>
                    </div>
                    
                    <div class="d-grid gap-2">
                        <!-- 직접 열기 (권장) -->
                        <button class="btn btn-primary" onclick="PDFManager.openPDFInNewWindow(${JSON.stringify(buildingData).replace(/"/g, '&quot;')})">
                            <i class="fas fa-external-link-alt me-2"></i>
                            새 창에서 PDF 열기 (권장)
                        </button>
                        
                        <!-- Google Docs 뷰어 -->
                        <button class="btn btn-secondary" onclick="window.open('${this.generatePDFViewerUrl(pdfInfo.fileName, pdfInfo.pageNumber, 'google')}', '_blank')">
                            <i class="fab fa-google me-2"></i>
                            Google Docs 뷰어로 보기
                        </button>
                        
                        <!-- 다운로드 -->
                        <a href="${this.generatePDFViewerUrl(pdfInfo.fileName)}" download="${pdfInfo.fileName}" class="btn btn-outline-secondary">
                            <i class="fas fa-download me-2"></i>
                            PDF 다운로드
                        </a>
                    </div>
                    
                    <!-- iframe 시도 (작동 안 할 수 있음) -->
                    <div class="mt-4">
                        <p class="text-muted mb-2">미리보기 (표시되지 않을 수 있음):</p>
                        <div class="border rounded" style="height: 400px; overflow: hidden;">
                            <iframe 
                                src="${this.generatePDFViewerUrl(pdfInfo.fileName, pdfInfo.pageNumber, 'google')}"
                                style="width: 100%; height: 100%; border: none;"
                                title="PDF Preview">
                            </iframe>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 모달 표시
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },
    
    // 검색 결과용 PDF 버튼 생성
    createPDFButton(buildingData, buttonClass = 'btn-sm btn-outline-primary') {
        const pdfInfo = this.findPDFInfo(buildingData.빌딩명, buildingData.출처회사);
        
        if (!pdfInfo) {
            return `<button class="btn ${buttonClass}" disabled title="PDF 없음">
                      <i class="fas fa-file-pdf me-1"></i>PDF 없음
                    </button>`;
        }
        
        return `<button class="btn ${buttonClass}" 
                    onclick="PDFManager.openPDFInNewWindow(${JSON.stringify(buildingData).replace(/"/g, '&quot;')})"
                    title="${pdfInfo.pageNumber}페이지">
                    <i class="fas fa-file-pdf me-1"></i>PDF 보기
                </button>`;
    },
    
    // 빌딩 리스트에서 PDF 지원 여부 확인
    hasPDF(buildingName, company) {
        return this.findPDFInfo(buildingName, company) !== null;
    },
    
    // 회사별 PDF 목록 가져오기
    getCompanyPDFList(company) {
        if (!this.pdfMappings || !this.pdfMappings[company]) {
            return [];
        }
        return this.pdfMappings[company];
    },
    
    // 모든 PDF 파일 목록
    getAllPDFFiles() {
        if (!this.pdfMappings) return [];
        
        return Object.keys(this.pdfMappings).map(company => ({
            company: company,
            fileName: `${company}.pdf`,
            buildings: this.pdfMappings[company]
        }));
    },
    
    // 통계 정보
    getStatistics() {
        if (!this.pdfMappings) {
            return {
                totalCompanies: 0,
                totalMappings: 0,
                companiesWithMostBuildings: []
            };
        }
        
        const companies = Object.keys(this.pdfMappings);
        const totalMappings = Object.values(this.pdfMappings)
            .reduce((acc, curr) => acc + curr.length, 0);
        
        // 빌딩이 가장 많은 회사들
        const sortedCompanies = companies
            .map(company => ({
                company: company,
                count: this.pdfMappings[company].length
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        return {
            totalCompanies: companies.length,
            totalMappings: totalMappings,
            companiesWithMostBuildings: sortedCompanies
        };
    },
    
    // 빌딩명으로 모든 PDF 정보 검색
    searchByBuildingName(buildingName) {
        if (!this.pdfMappings || !buildingName) return [];
        
        const results = [];
        const normalizedSearchName = buildingName.replace(/\s+/g, '').toLowerCase();
        
        Object.entries(this.pdfMappings).forEach(([company, buildings]) => {
            buildings.forEach(building => {
                const normalizedBuildingName = building.빌딩명.replace(/\s+/g, '').toLowerCase();
                if (normalizedBuildingName.includes(normalizedSearchName)) {
                    results.push({
                        company: company,
                        buildingName: building.빌딩명,
                        pageNumber: building.페이지,
                        fileName: `${company}.pdf`
                    });
                }
            });
        });
        
        return results;
    },
    
    // PDF 정보 업데이트 (관리자용)
    updatePDFInfo(company, buildingName, newPageNumber) {
        if (!this.pdfMappings || !this.pdfMappings[company]) {
            console.error('회사를 찾을 수 없습니다:', company);
            return false;
        }
        
        const building = this.pdfMappings[company].find(b => b.빌딩명 === buildingName);
        if (building) {
            building.페이지 = newPageNumber;
            console.log(`✅ PDF 정보 업데이트: ${buildingName} - ${newPageNumber}페이지`);
            return true;
        }
        
        console.error('빌딩을 찾을 수 없습니다:', buildingName);
        return false;
    },
    
    // 새 PDF 매핑 추가 (관리자용)
    addPDFMapping(company, buildingName, pageNumber) {
        if (!this.pdfMappings[company]) {
            this.pdfMappings[company] = [];
        }
        
        // 중복 체크
        const exists = this.pdfMappings[company].some(b => b.빌딩명 === buildingName);
        if (exists) {
            console.warn('이미 존재하는 매핑입니다:', buildingName);
            return false;
        }
        
        this.pdfMappings[company].push({
            빌딩명: buildingName,
            페이지: pageNumber
        });
        
        console.log(`✅ 새 PDF 매핑 추가: ${company} - ${buildingName} (${pageNumber}페이지)`);
        return true;
    },
    
    // PDF 매핑 내보내기 (JSON)
    exportMappings() {
        return JSON.stringify(this.pdfMappings, null, 2);
    },
    
    // 디버깅용 - 현재 상태 출력
    debug() {
        console.group('🔍 PDFManager 디버그 정보');
        console.log('초기화 상태:', this.isInitialized);
        console.log('PDF 매핑 수:', this.pdfMappings ? Object.keys(this.pdfMappings).length : 0);
        console.log('통계:', this.getStatistics());
        console.groupEnd();
    }
};

// 전역 객체로 노출
window.PDFManager = PDFManager;

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 PDFManager 초기화 대기 중...');
        
        // DataManager가 먼저 초기화되기를 기다림
        if (window.DataManager && window.DataManager.isInitialized) {
            await PDFManager.init();
        } else {
            window.addEventListener('dataManagerReady', async () => {
                await PDFManager.init();
            });
        }
    });
} else {
    // 이미 DOM이 로드된 경우
    PDFManager.init();
}