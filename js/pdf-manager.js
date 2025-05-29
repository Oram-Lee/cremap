// PDF 매핑 관리자 - 완전 통합 버전
const PDFManager = {
    pdfMapping: null,
    
    // 초기화
    async init() {
        try {
            await this.loadPdfMapping();
            console.log('✅ PDF 매핑 로드 완료');
        } catch (error) {
            console.error('❌ PDF 매핑 로드 실패:', error);
        }
    },
    
    // PDF 매핑 데이터 로드
    async loadPdfMapping() {
        try {
            const response = await fetch('data/smart_pdf_mapping.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.pdfMapping = await response.json();
            
            console.log('📊 PDF 매핑 통계:', {
                companies: Object.keys(this.pdfMapping.mapping || {}).length,
                totalBuildings: Object.values(this.pdfMapping.mapping || {})
                    .reduce((total, company) => total + Object.keys(company).length, 0),
                apiCalls: this.pdfMapping.meta?.total_api_calls || 0,
                createdAt: this.pdfMapping.meta?.created_at || 'Unknown'
            });
            
            return true;
        } catch (error) {
            console.warn('⚠️ PDF 매핑 파일 로드 실패, 빈 매핑으로 초기화:', error.message);
            this.pdfMapping = { mapping: {}, meta: {} };
            return false;
        }
    },
    
    // 특정 빌딩의 PDF 정보 찾기
    findPdfInfo(buildingName, company) {
        if (!this.pdfMapping || !this.pdfMapping.mapping) {
            return null;
        }
        
        if (!buildingName || !buildingName.trim()) {
            return null;
        }
        
        const cleanBuildingName = buildingName.trim();
        
        // 1. 정확한 회사명과 빌딩명으로 찾기
        if (company && this.pdfMapping.mapping[company]) {
            const buildingInfo = this.pdfMapping.mapping[company][cleanBuildingName];
            if (buildingInfo) {
                return {
                    company: company,
                    pdfFile: `pdfs/${company}.pdf`,
                    page: buildingInfo.page,
                    confidence: buildingInfo.confidence,
                    reason: buildingInfo.reason,
                    method: buildingInfo.method || 'exact'
                };
            }
        }
        
        // 2. 모든 회사에서 빌딩명으로 정확 매칭 찾기
        for (const [companyName, buildings] of Object.entries(this.pdfMapping.mapping)) {
            if (buildings[cleanBuildingName]) {
                return {
                    company: companyName,
                    pdfFile: `pdfs/${companyName}.pdf`,
                    page: buildings[cleanBuildingName].page,
                    confidence: buildings[cleanBuildingName].confidence,
                    reason: buildings[cleanBuildingName].reason,
                    method: buildings[cleanBuildingName].method || 'exact'
                };
            }
        }
        
        // 3. 유사한 빌딩명 찾기 (부분 일치 및 유사도)
        const similarityThreshold = 0.6;
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const [companyName, buildings] of Object.entries(this.pdfMapping.mapping)) {
            for (const [mappedBuildingName, info] of Object.entries(buildings)) {
                // 부분 일치 확인
                const containsMatch = cleanBuildingName.includes(mappedBuildingName) || 
                                    mappedBuildingName.includes(cleanBuildingName);
                
                // 유사도 계산
                const similarity = this.calculateSimilarity(cleanBuildingName, mappedBuildingName);
                
                if ((containsMatch && similarity > 0.4) || similarity > similarityThreshold) {
                    if (similarity > bestSimilarity) {
                        bestSimilarity = similarity;
                        bestMatch = {
                            company: companyName,
                            pdfFile: `pdfs/${companyName}.pdf`,
                            page: info.page,
                            confidence: Math.round(info.confidence * similarity), // 유사도로 신뢰도 조정
                            reason: `유사 매칭: "${mappedBuildingName}" (유사도: ${(similarity * 100).toFixed(1)}%)`,
                            method: 'similarity',
                            originalBuilding: mappedBuildingName,
                            similarity: similarity
                        };
                    }
                }
            }
        }
        
        return bestMatch;
    },
    
    // 문자열 유사도 계산 (Jaro-Winkler 유사도 사용)
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0.0;
        
        // 단순화된 유사도 계산
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        // 편집 거리 기반 유사도
        const editDistance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
        const similarity = (longer.length - editDistance) / longer.length;
        
        // 부분 문자열 보너스
        if (longer.toLowerCase().includes(shorter.toLowerCase()) || 
            shorter.toLowerCase().includes(longer.toLowerCase())) {
            return Math.max(similarity, 0.7);
        }
        
        return similarity;
    },
    
    // 레벤슈타인 거리 계산
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[j][i] = matrix[j - 1][i - 1];
                } else {
                    matrix[j][i] = Math.min(
                        matrix[j - 1][i - 1] + 1, // 치환
                        matrix[j][i - 1] + 1,     // 삽입
                        matrix[j - 1][i] + 1      // 삭제
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },
    
    // PDF 뷰어 새 창에서 열기
    openPdfViewer(buildingName, company) {
        const pdfInfo = this.findPdfInfo(buildingName, company);
        
        if (!pdfInfo) {
            this.showNotFoundAlert(buildingName);
            return;
        }
        
        // 신뢰도가 낮으면 확인 요청
        if (pdfInfo.confidence < 50) {
            const proceed = confirm(
                `PDF 매칭 신뢰도가 낮습니다 (${pdfInfo.confidence}%).\n\n` +
                `매칭 정보: ${pdfInfo.reason}\n\n` +
                `계속 진행하시겠습니까?`
            );
            if (!proceed) return;
        }
        
        // PDF 뷰어 URL 생성
        const viewerUrl = this.generatePdfViewerUrl(pdfInfo);
        
        // 새 창에서 열기
        const pdfWindow = window.open(viewerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!pdfWindow) {
            alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용하고 다시 시도하세요.');
        }
    },
    
    // PDF 뷰어 URL 생성
    generatePdfViewerUrl(pdfInfo) {
        // 현재 사이트의 PDF 파일 절대 경로
        const pdfUrl = `${window.location.origin}/${pdfInfo.pdfFile}`;
        
        // PDF.js 온라인 뷰어 사용
        const viewerBaseUrl = 'https://mozilla.github.io/pdf.js/web/viewer.html';
        
        // URL 인코딩
        const encodedPdfUrl = encodeURIComponent(pdfUrl);
        
        // 페이지 지정하여 URL 생성
        return `${viewerBaseUrl}?file=${encodedPdfUrl}#page=${pdfInfo.page}&zoom=page-width`;
    },
    
    // 인라인 PDF 뷰어 모달
    showPdfModal(buildingName, company) {
        const pdfInfo = this.findPdfInfo(buildingName, company);
        
        if (!pdfInfo) {
            this.showNotFoundAlert(buildingName);
            return;
        }
        
        // 신뢰도 배지 색상 결정
        const confidenceBadgeClass = this.getConfidenceBadgeClass(pdfInfo.confidence);
        
        // 모달 HTML 생성
        const modalHtml = `
            <div class="modal fade" id="pdfModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                        <div class="modal-header bg-light">
                            <h5 class="modal-title">
                                <i class="bi bi-file-pdf-fill text-danger"></i>
                                ${buildingName} - ${pdfInfo.company}
                                <span class="badge bg-${confidenceBadgeClass} ms-2">
                                    신뢰도 ${pdfInfo.confidence}%
                                </span>
                                ${pdfInfo.method === 'similarity' ? 
                                    '<span class="badge bg-info ms-1">유사매칭</span>' : ''
                                }
                            </h5>
                            <div class="modal-header-buttons">
                                <button type="button" class="btn btn-outline-primary btn-sm me-2" 
                                        onclick="PDFManager.openPdfViewer('${buildingName.replace(/'/g, "\\'")}', '${company}')">
                                    <i class="bi bi-box-arrow-up-right"></i> 새 창에서 열기
                                </button>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                        </div>
                        <div class="modal-body p-0">
                            <div class="pdf-info-bar">
                                <div class="container-fluid">
                                    <small class="text-muted">
                                        <i class="bi bi-file-earmark-pdf"></i> ${pdfInfo.pdfFile} | 
                                        <i class="bi bi-bookmark"></i> ${pdfInfo.page}페이지 | 
                                        <i class="bi bi-info-circle"></i> ${pdfInfo.reason}
                                    </small>
                                </div>
                            </div>
                            <div class="ratio ratio-16x9" style="height: calc(100vh - 180px);">
                                <iframe src="${this.generatePdfViewerUrl(pdfInfo)}" 
                                        frameborder="0" 
                                        allowfullscreen
                                        title="PDF Viewer">
                                </iframe>
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <small class="text-muted me-auto">
                                매칭 방법: ${this.getMethodDescription(pdfInfo.method)}
                            </small>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> 닫기
                            </button>
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
        
        // 모달이 완전히 표시된 후 로그 출력
        setTimeout(() => {
            console.log('📄 PDF 뷰어 표시:', {
                building: buildingName,
                company: pdfInfo.company,
                page: pdfInfo.page,
                confidence: pdfInfo.confidence,
                method: pdfInfo.method
            });
        }, 500);
    },
    
    // 신뢰도에 따른 배지 클래스 반환
    getConfidenceBadgeClass(confidence) {
        if (confidence >= 80) return 'success';
        if (confidence >= 50) return 'warning';
        return 'danger';
    },
    
    // 매칭 방법 설명
    getMethodDescription(method) {
        const descriptions = {
            'exact': '정확한 이름 매칭',
            'similarity': '유사도 기반 매칭',
            'chatgpt': 'AI 매칭',
            'manual': '수동 매칭'
        };
        return descriptions[method] || '알 수 없음';
    },
    
    // PDF 없음 알림
    showNotFoundAlert(buildingName) {
        const alertHtml = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>${buildingName}</strong>의 PDF 정보를 찾을 수 없습니다.
                <ul class="mb-0 mt-2">
                    <li>PDF 파일이 업로드되지 않았거나</li>
                    <li>매핑 정보가 생성되지 않았을 수 있습니다.</li>
                </ul>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 기존 알림 제거
        const existingAlert = document.querySelector('.alert.alert-warning');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // 새 알림 추가 (검색 결과 상단에)
        const resultsSection = document.querySelector('.row.mt-4');
        if (resultsSection) {
            resultsSection.insertAdjacentHTML('beforebegin', `<div class="row mt-3"><div class="col-12">${alertHtml}</div></div>`);
        }
    },
    
    // 빌딩의 PDF 가용성 확인
    checkPdfAvailability(buildingName, company) {
        const pdfInfo = this.findPdfInfo(buildingName, company);
        
        if (!pdfInfo) {
            return {
                available: false,
                status: 'not-found',
                message: 'PDF 없음',
                confidence: 0
            };
        }
        
        const confidence = pdfInfo.confidence;
        
        if (confidence >= 80) {
            return {
                available: true,
                status: 'high-confidence',
                message: 'PDF 있음',
                confidence: confidence,
                method: pdfInfo.method
            };
        } else if (confidence >= 50) {
            return {
                available: true,
                status: 'medium-confidence',
                message: 'PDF 있음 (보통)',
                confidence: confidence,
                method: pdfInfo.method
            };
        } else {
            return {
                available: true,
                status: 'low-confidence',
                message: 'PDF 있음 (낮음)',
                confidence: confidence,
                method: pdfInfo.method
            };
        }
    },
    
    // PDF 매핑 통계 표시
    showMappingStats() {
        if (!this.pdfMapping || !this.pdfMapping.mapping) {
            console.log('📊 PDF 매핑 통계: 데이터 없음');
            return;
        }
        
        const stats = {
            companies: Object.keys(this.pdfMapping.mapping).length,
            totalBuildings: 0,
            highConfidence: 0,
            mediumConfidence: 0,
            lowConfidence: 0
        };
        
        Object.values(this.pdfMapping.mapping).forEach(company => {
            Object.values(company).forEach(building => {
                stats.totalBuildings++;
                if (building.confidence >= 80) stats.highConfidence++;
                else if (building.confidence >= 50) stats.mediumConfidence++;
                else stats.lowConfidence++;
            });
        });
        
        console.log('📊 PDF 매핑 통계:', {
            '회사 수': stats.companies,
            '총 빌딩 수': stats.totalBuildings,
            '높은 신뢰도 (80%+)': `${stats.highConfidence}개 (${(stats.highConfidence/stats.totalBuildings*100).toFixed(1)}%)`,
            '보통 신뢰도 (50-79%)': `${stats.mediumConfidence}개 (${(stats.mediumConfidence/stats.totalBuildings*100).toFixed(1)}%)`,
            '낮은 신뢰도 (50% 미만)': `${stats.lowConfidence}개 (${(stats.lowConfidence/stats.totalBuildings*100).toFixed(1)}%)`,
            '생성 시간': this.pdfMapping.meta?.created_at || 'Unknown',
            'API 호출 수': this.pdfMapping.meta?.total_api_calls || 0
        });
    }
};

// 전역 함수로 노출 (HTML에서 직접 호출 가능)
window.PDFManager = PDFManager;

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 PDF Manager 초기화 시작...');
    await PDFManager.init();
    
    // 개발자 도구에서 통계 확인 가능
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 개발 모드: 콘솔에서 PDFManager.showMappingStats() 실행 가능');
    }
});
