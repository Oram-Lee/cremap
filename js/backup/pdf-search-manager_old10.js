// PDF 검색 매니저 - 출처회사 기반 자동 매핑 버전
class PDFSearchManager {
    constructor() {
        this.pdfBaseUrl = './pdfs/';
        this.viewerUrl = './pdf-viewer.html';
    }

    // PDF 열기 (자동 검색 기능 포함)
    openPDFWithSearch(buildingData) {
        console.log('📄 PDF 열기 시도:', buildingData);
        
        // 출처회사명으로 PDF 파일명 생성
        const company = buildingData.출처회사 || buildingData.출처;
        if (!company) {
            alert('출처 정보가 없어 PDF를 찾을 수 없습니다.');
            return;
        }
        
        // 회사명을 PDF 파일명으로 변환 (특수문자 제거, 공백 제거)
        const filename = this.normalizeFilename(company) + '.pdf';
        
        console.log(`📄 출처: ${company} → 파일: ${filename}`);
        
        // 검색 우선순위: 빌딩명 > 주소 > 인근역
        const searchTerms = [];
        if (buildingData.빌딩명) searchTerms.push(buildingData.빌딩명);
        if (buildingData.주소) searchTerms.push(buildingData.주소);
        if (buildingData.인근역) searchTerms.push(buildingData.인근역);
        
        // 검색어 조합 (첫 번째 검색어만 URL에 포함)
        const primarySearch = searchTerms[0] || company;
        
        // PDF.js 뷰어 URL 생성
        const viewerUrl = `${this.viewerUrl}?file=${filename}&search=${encodeURIComponent(primarySearch)}&fallback=${encodeURIComponent(searchTerms.join('|'))}`;
        
        console.log('📄 뷰어 URL:', viewerUrl);
        
        // 새 창에서 PDF 뷰어 열기
        const pdfWindow = window.open(viewerUrl, '_blank', 'width=1200,height=800');
        
        if (!pdfWindow) {
            alert('팝업 차단으로 PDF를 열 수 없습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
            return;
        }
    }

    // 회사명을 파일명으로 정규화
    normalizeFilename(company) {
        // 특수문자 제거, 공백 제거, 영문 대문자 유지
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
        
        const filename = this.normalizeFilename(company) + '.pdf';
        const searchTerm = buildingData.빌딩명 || buildingData.주소 || '';
        
        // 기본 브라우저 PDF 뷰어로 열기
        const pdfUrl = `${this.pdfBaseUrl}${filename}#search=${encodeURIComponent(searchTerm)}`;
        window.open(pdfUrl, '_blank');
    }
}

// 전역 객체로 등록
window.PDFSearchManager = new PDFSearchManager();

console.log('✅ PDF Search Manager (출처회사 기반) 로드 완료');
