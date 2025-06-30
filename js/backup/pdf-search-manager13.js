// PDF 검색 매니저 - 통합 버전
class PDFSearchManager {
    constructor() {
        this.pdfBaseUrl = './pdfs/';
        this.viewerUrl = './pdf-viewer.html';
        
        // 실제 PDF 파일 목록 (캡처 화면 기준)
        this.availablePDFs = new Set([
            'ACT', 'CBRE', 'COL', 'ERA', 'GM', 'HDC', 'JLL', 'KTG', 
            'KYOBO', 'KYOWON', 'LOTTE', 'MIRAE', 'PLANET', 'SMPMC', 
            'SVS', 'SVA_1', 'SVA_2', 'data', 'pdf-manager',
            'pdf-viewer', 'search', '세미'
        ]);
        
        // 회사명 → PDF 파일명 매핑 (실제 파일명 기준)
        this.companyToPdfMapping = {
            'SVS': ['SVS'],
            'SYA': ['SYA_1', 'SYA_2'],  // SYA는 SVA로 저장됨
            'KT&G': ['KTG'],
            'ACT': ['ACT'],
            'CBRE': ['CBRE'],
            'COL': ['COL'],
            'ERA': ['ERA'],
            'GM': ['GM'],
            'HDC': ['HDC'],
            'JLL': ['JLL'],
            'KYOBO': ['KYOBO'],
            'KYOWON': ['KYOWON'],
            'LOTTE': ['LOTTE'],
            'MIRAE': ['MIRAE'],
            'PLANET': ['PLANET'],
            'SMPMC': ['SMPMC'],
            '세아': ['세아'],
            // 필요시 추가 매핑
        };
        
        // PDF 존재 여부 캐시
        this.pdfExistsCache = new Map();
    }

    // PDF 파일 존재 여부 확인
    async checkPDFExists(company) {
        if (!company) return false;
        
        // 캐시 확인
        if (this.pdfExistsCache.has(company)) {
            return this.pdfExistsCache.get(company);
        }
        
        // 가능한 파일명들 확인
        const possibleFiles = this.getPossibleFiles(company);
        
        // 실제 파일 목록과 비교
        const exists = possibleFiles.some(file => 
            this.availablePDFs.has(file)
        );
        
        // 캐시에 저장
        this.pdfExistsCache.set(company, exists);
        
        console.log(`📄 PDF 존재 확인: ${company} → ${exists ? '있음' : '없음'} (파일: ${possibleFiles.join(', ')})`);
        
        return exists;
    }

    // 빌딩 데이터에 대한 PDF 존재 여부 확인
    async hasPDF(buildingData) {
        const company = buildingData.출처회사 || buildingData.출처;
        return await this.checkPDFExists(company);
    }

    // PDF 열기 (자동 검색 기능 포함) - 디버깅 코드 포함
    async openPDFWithSearch(buildingData) {
        console.group('🔍 PDF 검색 디버깅 정보');
        console.log('빌딩 데이터:', buildingData);
        console.log('빌딩명:', buildingData.빌딩명);
        console.log('출처회사:', buildingData.출처회사 || buildingData.출처);
        console.log('주소:', buildingData.주소);
        console.log('인근역:', buildingData.인근역);
        
        const company = buildingData.출처회사 || buildingData.출처;
        if (!company) {
            console.error('❌ 출처 정보 없음');
            console.groupEnd();
            alert('출처 정보가 없어 PDF를 찾을 수 없습니다.');
            return;
        }
        
        // PDF 존재 여부 재확인
        const exists = await this.checkPDFExists(company);
        console.log('PDF 존재 여부:', exists);
        
        if (!exists) {
            console.error('❌ PDF 파일 없음');
            console.groupEnd();
            alert(`${company}의 PDF 파일을 찾을 수 없습니다.`);
            return;
        }
        
        // 가능한 파일명들 가져오기
        const possibleFiles = this.getPossibleFiles(company);
        console.log('가능한 PDF 파일들:', possibleFiles);
        
        // 검색어 우선순위 개선
        const searchTerms = this.getSearchTerms(buildingData);
        console.log('검색어 목록:', searchTerms);
        
        // 첫 번째 파일로 시작
        const primaryFile = possibleFiles[0];
        const primarySearch = searchTerms[0] || company;
        
        console.log('선택된 PDF 파일:', primaryFile + '.pdf');
        console.log('주 검색어:', primarySearch);
        console.log('대체 검색어:', searchTerms.slice(1));
        console.groupEnd();
        
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

    // 검색어 추출 (개선된 로직)
    getSearchTerms(buildingData) {
        const terms = [];
        
        // 빌딩명 처리
        if (buildingData.빌딩명) {
            terms.push(buildingData.빌딩명);
            
            // 빌딩명에서 괄호 제거한 버전도 추가
            const withoutParentheses = buildingData.빌딩명.replace(/\s*\([^)]*\)/g, '').trim();
            if (withoutParentheses && withoutParentheses !== buildingData.빌딩명) {
                terms.push(withoutParentheses);
            }
            
            // 첫 단어만 추가 (예: "알레르망타워" → "알레르망")
            const firstWord = buildingData.빌딩명.split(/[\s(]/)[0];
            if (firstWord.length >= 3) {
                terms.push(firstWord);
            }
        }
        
        // 주소 처리
        if (buildingData.주소) {
            // 주소에서 구와 동 추출
            const guMatch = buildingData.주소.match(/(\S+구)/);
            const dongMatch = buildingData.주소.match(/(\S+동)(?=\s|$)/);
            
            if (guMatch) terms.push(guMatch[1]);
            if (dongMatch) terms.push(dongMatch[1]);
            
            // 전체 주소도 추가 (마지막 옵션)
            terms.push(buildingData.주소);
        }
        
        // 인근역 처리
        if (buildingData.인근역) {
            const stations = buildingData.인근역.split(',').map(s => s.trim());
            stations.forEach(station => {
                if (station) {
                    // "도보 X분" 제거
                    const stationName = station.replace(/\s*도보\s*\d+분/, '').trim();
                    if (stationName) terms.push(stationName);
                }
            });
        }
        
        // 중복 제거하여 반환
        return [...new Set(terms)];
    }

    // 회사명으로 가능한 파일명들 가져오기
    getPossibleFiles(company) {
        // 특별 매핑 확인
        if (this.companyToPdfMapping[company]) {
            return this.companyToPdfMapping[company];
        }
        
        // 기본: 회사명을 파일명으로 변환
        const normalized = this.normalizeFilename(company);
        
        // 정규화된 이름이 실제 파일 목록에 있는지 확인
        if (this.availablePDFs.has(normalized)) {
            return [normalized];
        }
        
        // 유사한 파일명 찾기 (대소문자 무시)
        const similar = Array.from(this.availablePDFs).filter(pdf => 
            pdf.toLowerCase() === normalized.toLowerCase()
        );
        
        return similar.length > 0 ? similar : [normalized];
    }

    // 회사명을 파일명으로 정규화
    normalizeFilename(company) {
        // 특수문자 제거, 공백 제거
        return company
            .replace(/[^\w가-힣]/g, '') // 특수문자 제거
            .replace(/\s+/g, '')        // 공백 제거
            .trim();
    }

    // 사용 가능한 PDF 목록 업데이트 (동적 로딩용)
    updateAvailablePDFs(pdfList) {
        this.availablePDFs = new Set(pdfList);
        this.pdfExistsCache.clear(); // 캐시 초기화
    }

    // 디버그 정보
    debug() {
        console.group('🔍 PDFSearchManager 디버그 정보');
        console.log('사용 가능한 PDF:', Array.from(this.availablePDFs));
        console.log('회사 매핑:', this.companyToPdfMapping);
        console.log('캐시된 회사:', Array.from(this.pdfExistsCache.keys()));
        console.groupEnd();
    }

    // PDFManager와의 호환성을 위한 메서드
    findPDFInfo(buildingName, company) {
        const exists = this.checkPDFExists(company);
        if (!exists) return null;
        
        const files = this.getPossibleFiles(company);
        return {
            fileName: files[0] + '.pdf',
            pageNumber: 1  // 기본값, 실제로는 검색으로 찾음
        };
    }
}

// 전역 객체로 등록
window.PDFSearchManager = new PDFSearchManager();

console.log('✅ PDF Search Manager (통합 버전) 로드 완료');
