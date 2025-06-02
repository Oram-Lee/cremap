// PDF 검색 매니저 - 출처회사 기반 자동 매핑 버전 (개선)
class PDFSearchManager {
    constructor() {
        this.pdfBaseUrl = './pdfs/';
        this.viewerUrl = './pdf-viewer.html';
        // 특별한 파일명 매핑 (회사명 → 실제 파일명)
        this.specialMappings = {
            'KT&G': 'KTG',  // & 문자 처리
            'SVS': ['SVS'],  // 단일 파일
            'SYA': ['SYA1', 'SYA2'],  // 여러 파일
            // 필요시 추가 매핑
        };
    }

    // PDF 열기 (자동 검색 기능 포함)
    async openPDFWithSearch(buildingData) {
        console.log('📄 PDF 열기 시도:', buildingData);
        
        const company = buildingData.출처회사 || buildingData.출처;
        if (!company) {
            alert('출처 정보가 없어 PDF를 찾을 수 없습니다.');
            return;
        }
        
        // 가능한 파일명들 가져오기
        const possibleFiles = this.getPossibleFiles(company);
        console.log(`📄 ${company} → 가능한 파일들:`, possibleFiles);
        
        // 검색 우선순위: 빌딩명 > 주소 > 인근역
        const searchTerms = [];
        if (buildingData.빌딩명) searchTerms.push(buildingData.빌딩명);
        if (buildingData.주소) searchTerms.push(buildingData.주소);
        if (buildingData.인근역) searchTerms.push(buildingData.인근역);
        
        // 첫 번째 파일로 시작 (나중에 여러 파일 지원 가능)
        const primaryFile = possibleFiles[0];
        const primarySearch = searchTerms[0] || company;
        
        // 여러 파일이 있는 경우 모든 파일 정보 전달
        const filesParam = possibleFiles.join('|');
        
        // PDF.js 뷰어 URL 생성
        const viewerUrl = `${this.viewerUrl}?file=${primaryFile}.pdf&search=${encodeURIComponent(primarySearch)}&fallback=${encodeURIComponent(searchTerms.join('|'))}&allfiles=${filesParam}`;
        
        console.log('📄 뷰어 URL:', viewerUrl);
        
        // 새 창에서 PDF 뷰어 열기
        const pdfWindow = window.open(viewerUrl, '_blank', 'width=1200,height=800');
        
        if (!pdfWindow) {
            alert('팝업 차단으로 PDF를 열 수 없습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
            return;
        }
    }

    // 회사명으로 가능한 파일명들 가져오기
    getPossibleFiles(company) {
        // 특별 매핑 확인
        if (this.specialMappings[company]) {
            const mapped = this.specialMappings[company];
            return Array.isArray(mapped) ? mapped : [mapped];
        }
        
        // 기본: 회사명을 파일명으로 변환
        const normalized = this.normalizeFilename(company);
        return [normalized];
    }

    // 회사명을 파일명으로 정규화
    normalizeFilename(company) {
        // 특수문자 제거, 공백 제거
        return company
            .replace(/[^\w가-힣]/g, '') // 특수문자 제거
            .replace(/\s+/g, '')        // 공백 제거
            .trim();
    }

    // 기존 브라우저 뷰어 사용 (폴백 옵션)
    openPDFWithBrowserViewer(buildingData) {
        const company = buildingData.출처회사 || buildingData.출처;
        if (!company) {
            alert('출처 정보가 없어 PDF를 찾을 수 없습니다.');
            return;
        }
        
        const possibleFiles = this.getPossibleFiles(company);
        const filename = possibleFiles[0] + '.pdf';
        const searchTerm = buildingData.빌딩명 || buildingData.주소 || '';
        
        // 기본 브라우저 PDF 뷰어로 열기
        const pdfUrl = `${this.pdfBaseUrl}${filename}#search=${encodeURIComponent(searchTerm)}`;
        window.open(pdfUrl, '_blank');
    }
}

// 전역 객체로 등록
window.PDFSearchManager = new PDFSearchManager();

console.log('✅ PDF Search Manager (출처회사 기반) 로드 완료');
