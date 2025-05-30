// pdf-search-manager.js
class PDFSearchManager {
    constructor() {
        this.pdfBaseUrl = 'https://oram-lee.github.io/cremap/pdfs/';
    }

    /**
     * PDF 열기 및 검색
     * @param {Object} data - 검색 데이터 (빌딩명, 출처회사, 주소)
     */
    openPDFWithSearch(data) {
        const { 빌딩명, 출처회사, 주소 } = data;
        
        // 회사별 PDF 파일명 결정
        let fileName = `${출처회사}.pdf`;
        
        // SYA의 경우 특별 처리
        if (출처회사 === 'SYA') {
            // 빌딩명에 따라 SYA_1 또는 SYA_2 결정
            if (빌딩명.includes('광화문') || 빌딩명.includes('BNK')) {
                fileName = 'SYA_1.pdf';
            } else {
                fileName = 'SYA_2.pdf';
            }
        }
        
        // PDF URL 생성 (검색 파라미터 포함)
        const pdfUrl = this.buildPDFUrlWithSearch(fileName, 빌딩명, 주소);
        
        // PDF 열기
        window.open(pdfUrl, '_blank');
    }

    /**
     * 검색 파라미터를 포함한 PDF URL 생성
     */
    buildPDFUrlWithSearch(fileName, 빌딩명, 주소) {
        const baseUrl = `${this.pdfBaseUrl}${fileName}`;
        
        // PDF.js의 search 파라미터 사용
        // #search=검색어 형식으로 PDF를 열면 해당 텍스트를 찾아줌
        const searchTerm = 빌딩명; // 빌딩명으로 우선 검색
        
        // URL 인코딩
        const encodedSearch = encodeURIComponent(searchTerm);
        
        // PDF.js가 지원하는 검색 URL 형식
        return `${baseUrl}#search=${encodedSearch}`;
    }

    /**
     * 대체 검색 URL 생성 (빌딩명이 안 되면 주소로)
     */
    buildAlternativeSearchUrl(fileName, 주소) {
        if (!주소) return null;
        
        const baseUrl = `${this.pdfBaseUrl}${fileName}`;
        
        // 주소에서 주요 키워드 추출 (예: 동이름, 번지)
        const addressKeyword = this.extractAddressKeyword(주소);
        const encodedSearch = encodeURIComponent(addressKeyword);
        
        return `${baseUrl}#search=${encodedSearch}`;
    }

    /**
     * 주소에서 검색용 키워드 추출
     */
    extractAddressKeyword(주소) {
        // 동 이름 추출 (예: "역삼동", "삼성동" 등)
        const dongMatch = 주소.match(/(\S+동)/);
        if (dongMatch) return dongMatch[1];
        
        // 번지 추출
        const bunjiMatch = 주소.match(/(\d+-\d+|\d+번지)/);
        if (bunjiMatch) return bunjiMatch[1];
        
        // 기본값: 전체 주소
        return 주소;
    }
}

// 전역 인스턴스 생성
const PDFSearchManager = new PDFSearchManager();

// search.js의 renderTableRow 함수 수정 부분
// PDF 버튼 클릭 이벤트를 다음과 같이 변경:
/*
pdfBtn.addEventListener('click', () => {
    PDFSearchManager.openPDFWithSearch({
        빌딩명: data.빌딩명,
        출처회사: data.출처회사,
        주소: data.주소
    });
});
*/
