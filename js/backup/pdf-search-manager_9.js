// PDF 검색 매니저 - PDF.js 뷰어 연동 버전
class PDFSearchManager {
    constructor() {
        this.pdfBaseUrl = './pdfs/';
        this.viewerUrl = './pdf-viewer.html'; // PDF.js 뷰어 페이지
    }

    // PDF 열기 (자동 검색 기능 포함)
    openPDFWithSearch(buildingData) {
        console.log('📄 PDF 열기 시도:', buildingData);
        
        // PDF 매핑 찾기
        const pdfInfo = PDFManager.findPDFInfo(buildingData);
        
        if (!pdfInfo) {
            alert('해당 빌딩의 PDF 파일을 찾을 수 없습니다.');
            return;
        }

        // 검색어 준비 (빌딩명)
        const searchTerm = buildingData.빌딩명;
        
        // PDF.js 뷰어 URL 생성
        const viewerUrl = `${this.viewerUrl}?file=${pdfInfo.filename}&search=${encodeURIComponent(searchTerm)}`;
        
        console.log('📄 뷰어 URL:', viewerUrl);
        
        // 새 창에서 PDF 뷰어 열기
        const pdfWindow = window.open(viewerUrl, '_blank', 'width=1200,height=800');
        
        if (!pdfWindow) {
            alert('팝업 차단으로 PDF를 열 수 없습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
            return;
        }
        
        // 뷰어가 로드되면 검색 실행
        pdfWindow.addEventListener('load', () => {
            console.log('✅ PDF 뷰어 로드 완료, 자동 검색 시작...');
        });
    }

    // 기존 브라우저 뷰어 사용 (폴백 옵션)
    openPDFWithBrowserViewer(buildingData) {
        const pdfInfo = PDFManager.findPDFInfo(buildingData);
        
        if (!pdfInfo) {
            alert('해당 빌딩의 PDF 파일을 찾을 수 없습니다.');
            return;
        }

        // 기본 브라우저 PDF 뷰어로 열기
        const pdfUrl = `${this.pdfBaseUrl}${pdfInfo.filename}#search=${encodeURIComponent(buildingData.빌딩명)}`;
        window.open(pdfUrl, '_blank');
    }
}

// 전역 객체로 등록
window.PDFSearchManager = new PDFSearchManager();

console.log('✅ PDF Search Manager (PDF.js 버전) 로드 완료');
