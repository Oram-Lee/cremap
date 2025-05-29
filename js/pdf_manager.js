// PDF 매핑 관리자 - 새로 추가할 파일 (pdf-manager.js)
const PDFManager = {
    pdfMapping: null,
    
    // 초기화
    async init() {
        try {
            await this.loadPdfMapping();
            console.log('PDF 매핑 로드 완료');
        } catch (error) {
            console.error('PDF 매핑 로드 실패:', error);
        }
    },
    
    // PDF 매핑 데이터 로드
    async loadPdfMapping() {
        try {
            const response = await fetch('data/smart_pdf_mapping.json');
            this.pdfMapping = await response.json();
            
            console.log('PDF 매핑 통계:', {
                companies: Object.keys(this.pdfMapping.mapping).length,
                totalBuildings: Object.values(this.pdfMapping.mapping)
                    .reduce((total, company) => total + Object.keys(company).length, 0),
                apiCalls: this.pdfMapping.meta?.total_api_calls || 0
            });
            
            return true;
        } catch (error) {
            console.error('PDF 매핑 파일 로드 실패:', error);
            this.pdfMapping = { mapping: {} };
            return false;
        }
    },
    
    // 특정 빌딩의 PDF 정보 찾기
    findPdfInfo(buildingName, company) {
        if (!this.pdfMapping || !this.pdfMapping.mapping) return null;
        
        // 1. 정확한 회사명과 빌딩명으로 찾기
        if (company && this.pdfMapping.mapping[company]) {
            const buildingInfo = this.pdfMapping.mapping[company][buildingName];
            if (buildingInfo) {
                return {
                    company: company,
                    pdfFile: `pdfs/${company}.pdf`,
                    page: buildingInfo.page,
                    confidence: buildingInfo.confidence,
                    reason: buildingInfo.reason
                };
            }
        }
        
        // 2. 모든 회사에서 빌딩명으로 찾기
        for (const [companyName, buildings] of Object.entries(this.pdfMapping.mapping)) {
            if (buildings[buildingName]) {
                return {
                    company: companyName,
                    pdfFile: `pdfs/${companyName}.pdf`,
                    page: buildings[buildingName].page,
                    confidence: buildings[buildingName].confidence,
                    reason: buildings[buildingName].reason
                };
            }
        }
        
        // 3. 유사한 빌딩명 찾기 (부분 일치)
        const similarityThreshold = 0.7;
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const [companyName, buildings] of Object.entries(this.pdfMapping.mapping)) {
            for (const [mappedBuildingName, info] of Object.entries(buildings)) {
                const similarity = this.calculateSimilarity(buildingName, mappedBuildingName);
                if (similarity > bestSimilarity && similarity >= similarityThreshold) {
                    bestSimilarity = similarity;
                    bestMatch = {
                        company: companyName,
                        pdfFile: `pdfs/${companyName}.pdf`,
                        page: info.page,
                        confidence: info.confidence * similarity, // 유사도로 신뢰도 조정
                        reason: `유사 매칭: ${mappedBuildingName} (${(similarity * 100).toFixed(1)}%)`
                    };
                }
            }
        }
        
        return bestMatch;
    },
    
    // 문자열 유사도 계산
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },
    
    // 레벤슈타인 거리 계산
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },
    
    // PDF 뷰어 열기
    openPdfViewer(buildingName, company) {
        const pdfInfo = this.findPdfInfo(buildingName, company);
        
        if (!pdfInfo) {
            alert(`${buildingName}의 PDF 정보를 찾을 수 없습니다.`);
            return;
        }
        
        // 신뢰도가 낮으면 경고
        if (pdfInfo.confidence < 50) {
            const proceed = confirm(
                `PDF 매칭 신뢰도가 낮습니다 (${pdfInfo.confidence.toFixed(1)}%).\n` +
                `계속 진행하시겠습니까?\n\n` +
                `매칭 정보: ${pdfInfo.reason}`
            );
            if (!proceed) return;
        }
        
        // PDF 뷰어 창 열기
        const viewerUrl = this.generatePdfViewerUrl(pdfInfo);
        const pdfWindow = window.open(viewerUrl, '_blank', 'width=1000,height=800');
        
        if (!pdfWindow) {
            alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도하세요.');
        }
    },
    
    // PDF 뷰어 URL 생성
    generatePdfViewerUrl(pdfInfo) {
        // PDF.js 뷰어 사용
        const baseUrl = 'https://mozilla.github.io/pdf.js/web/viewer.html';
        const pdfUrl = encodeURIComponent(window.location.origin + '/' + pdfInfo.pdfFile);
        const page = pdfInfo.page;
        
        return `${baseUrl}?file=${pdfUrl}#page=${page}`;
    },
    
    // 인라인 PDF 뷰어 (모달 내에서 표시)
    showPdfModal(buildingName, company) {
        const pdfInfo = this.findPdfInfo(buildingName, company);
        
        if (!pdfInfo) {
            alert(`${buildingName}의 PDF 정보를 찾을 수 없습니다.`);
            return;
        }
        
        // 모달 HTML 생성
        const modalHtml = `
            <div class="modal fade" id="pdfModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                ${buildingName} - ${pdfInfo.company} 
                                <span class="badge bg-${pdfInfo.confidence >= 80 ? 'success' : pdfInfo.confidence >= 50 ? 'warning' : 'danger'}">
                                    신뢰도 ${pdfInfo.confidence.toFixed(1)}%
                                </span>
                            </h5>
                            <div class="modal-header-buttons">
                                <button type="button" class="btn btn-outline-primary btn-sm me-2" 
                                        onclick="PDFManager.openPdfViewer('${buildingName}', '${company}')">
                                    새 창에서 열기
                                </button>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                        </div>
                        <div class="modal-body p-0">
                            <div class="pdf-info-bar">
                                <small class="text-muted">
                                    📄 ${pdfInfo.pdfFile} | 📍 ${pdfInfo.page}페이지 | 💡 ${pdfInfo.reason}
                                </small>
                            </div>
                            <iframe src="${this.generatePdfViewerUrl(pdfInfo)}" 
                                    width="100%" 
                                    height="600px" 
                                    frameborder="0">
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 기존 모달 제거
        const existingModal = document.getElementById('pdfModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 모달 표시
        const modal = new bootstrap.Modal(document.getElementById('pdfModal'));
        modal.show();
    },
    
    // 빌딩 목록에서 PDF 상태 확인
    checkPdfAvailability(buildingName, company) {
        const pdfInfo = this.findPdfInfo(buildingName, company);
        
        if (!pdfInfo) {
            return {
                available: false,
                status: 'not-found',
                message: 'PDF 없음'
            };
        }
        
        const confidence = pdfInfo.confidence;
        
        if (confidence >= 80) {
            return {
                available: true,
                status: 'high-confidence',
                message: 'PDF 있음',
                confidence: confidence
            };
        } else if (confidence >= 50) {
            return {
                available: true,
                status: 'medium-confidence',
                message: 'PDF 있음 (보통)',
                confidence: confidence
            };
        } else {
            return {
                available: true,
                status: 'low-confidence',
                message: 'PDF 있음 (낮음)',
                confidence: confidence
            };
        }
    }
};

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await PDFManager.init();
});

// SearchManager의 showDetail 함수 업데이트
SearchManager.showDetail = function(index) {
    const item = DataManager.currentResults[index];
    
    // PDF 뷰어로 상세보기
    PDFManager.showPdfModal(item.빌딩명, item.출처회사);
};

// 테이블 생성 부분도 업데이트 (search.js의 displayResults 함수에 추가)
// 기존 액션 버튼 HTML을 다음과 같이 수정:
/*
<td class="action-buttons">
    <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-primary pdf-status-${PDFManager.checkPdfAvailability(item.빌딩명, item.출처회사).status}" 
                onclick="SearchManager.showDetail(${startIndex + index})"
                title="${PDFManager.checkPdfAvailability(item.빌딩명, item.출처회사).message}">
            <i class="bi bi-file-pdf"></i> PDF
        </button>
        <button class="btn btn-outline-success" 
                onclick="MapManager.showBuildingMap(${startIndex + index})">
            <i class="bi bi-map"></i> 지도
        </button>
    </div>
</td>
*/