// PDF 검색 매니저 - 통합 버전 (수정됨)
class PDFSearchManager {
    constructor() {
        this.pdfBaseUrl = './pdfs/';
        this.viewerUrl = './pdf-viewer.html';
        
        // 실제 PDF 파일 목록 (MOVE 추가)
        this.availablePDFs = new Set([
            'ACT', 'CBRE', 'COL', 'ERA', 'GM', 'HDC', 'JLL', 'KTG', 'KT', 'HANHWA',
            'KYOBO', 'KYOWON', 'LOTTE', 'MIRAE', 'MOVE', 'PLANET', 'SMPMC',  'IFC',  'THEBARN',
            'SVS', 'SYA', 'S1', 'RS', 'CW', 'data', 'pdf-manager',
            'pdf-viewer', 'search', '세아'
        ]);
        
        // 회사명 → PDF 파일명 매핑 (MOVE 추가)
        this.companyToPdfMapping = {
            'SVS': ['SVS'],
            'SYA': ['SYA'],  
            'S1': ['S1'],  
            'KT&G': ['KTG'],
            'KT': ['KT'],
            'HANHWA': ['HANHWA'],
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
            'MOVE': ['MOVE'],  // MOVE 추가
            'PLANET': ['PLANET'],
            'SMPMC': ['SMPMC'],
            'RS': ['RS'],      // RS 추가
            'CW': ['CW'],      // CW 추가
            '세아': ['세아'],  
            'IFC': ['IFC'],  
            'THEBARN': ['THEBARN'],  
        };
        
        // PDF 존재 여부 캐시
        this.pdfExistsCache = new Map();
        
        // 초기화 완료 플래그
        this.initialized = false;
        
        // 에러 핸들링을 위한 콜백
        this.onError = null;
    }

    // 초기화 메서드
    async initialize() {
        try {
            console.log('🔧 PDFSearchManager 초기화 시작...');
            
            // PDF 파일 존재 여부 미리 체크 (선택사항)
            await this.preloadPDFStatus();
            
            this.initialized = true;
            console.log('✅ PDFSearchManager 초기화 완료');
            
            return true;
        } catch (error) {
            console.error('❌ PDFSearchManager 초기화 실패:', error);
            this.handleError('초기화 실패', error);
            return false;
        }
    }

    // PDF 상태 미리 로드 (성능 최적화)
    async preloadPDFStatus() {
        const companies = Object.keys(this.companyToPdfMapping);
        const checks = companies.map(company => this.checkPDFExists(company));
        
        try {
            await Promise.all(checks);
            console.log('📋 PDF 상태 미리 로드 완료');
        } catch (error) {
            console.warn('⚠️ PDF 상태 미리 로드 중 일부 오류:', error);
        }
    }

    // PDF 파일 존재 여부 확인 (개선된 버전)
    async checkPDFExists(company) {
        if (!company) {
            console.warn('⚠️ checkPDFExists: 빈 회사명');
            return false;
        }
        
        try {
            // 캐시 확인
            if (this.pdfExistsCache.has(company)) {
                const cached = this.pdfExistsCache.get(company);
                console.log(`📄 PDF 존재 확인 (캐시): ${company} → ${cached ? '있음' : '없음'}`);
                return cached;
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
            
        } catch (error) {
            console.error(`❌ PDF 존재 확인 오류 [${company}]:`, error);
            this.handleError(`PDF 존재 확인 실패: ${company}`, error);
            return false;
        }
    }

    // 빌딩 데이터에 대한 PDF 존재 여부 확인 (안전한 버전)
    async hasPDF(buildingData) {
        try {
            if (!buildingData) {
                console.warn('⚠️ hasPDF: 빈 빌딩 데이터');
                return false;
            }
            
            const company = buildingData.출처회사 || buildingData.출처;
            if (!company) {
                console.warn('⚠️ hasPDF: 출처 정보 없음', buildingData);
                return false;
            }
            
            return await this.checkPDFExists(company);
            
        } catch (error) {
            console.error('❌ hasPDF 오류:', error);
            this.handleError('PDF 존재 여부 확인 실패', error);
            return false;
        }
    }

    // PDF 열기 (자동 검색 기능 포함) - 비활성 체크 추가
    async openPDFWithSearch(buildingData) {
        try {
            console.group('🔍 PDF 검색 디버깅 정보');
            
            // 입력 데이터 검증
            if (!buildingData) {
                throw new Error('빌딩 데이터가 없습니다.');
            }
            
            // ⭐ 비활성 빌딩 체크 추가
            if (buildingData.status === 'inactive') {
                console.warn(`⚠️ 비활성 빌딩: ${buildingData.빌딩명}`);
                alert('현재 비활성 상태인 빌딩입니다.\n관리자에게 문의하세요.');
                console.groupEnd();
                return false;
            }
            
            console.log('빌딩 데이터:', buildingData);
            console.log('빌딩 상태:', buildingData.status || 'active');
            console.log('빌딩명:', buildingData.빌딩명);
            console.log('출처회사:', buildingData.출처회사 || buildingData.출처);
            console.log('주소:', buildingData.주소);
            console.log('인근역:', buildingData.인근역);
            console.log('공실전용면적:', buildingData.공실전용면적);
            console.log('공실임대면적:', buildingData.공실임대면적);
            
            const company = buildingData.출처회사 || buildingData.출처;
            if (!company) {
                throw new Error('출처 정보가 없어 PDF를 찾을 수 없습니다.');
            }
            
            // PDF 존재 여부 재확인
            const exists = await this.checkPDFExists(company);
            console.log('PDF 존재 여부:', exists);
            
            if (!exists) {
                throw new Error(`${company}의 PDF 파일을 찾을 수 없습니다.`);
            }
            
            // 가능한 파일명들 가져오기
            const possibleFiles = this.getPossibleFiles(company);
            console.log('가능한 PDF 파일들:', possibleFiles);
            
            if (possibleFiles.length === 0) {
                throw new Error(`${company}에 대한 PDF 파일 매핑을 찾을 수 없습니다.`);
            }
            
            // 검색어 우선순위 개선
            const searchTerms = this.getSearchTerms(buildingData);
            console.log('검색어 목록:', searchTerms);
            
            // 첫 번째 파일로 시작
            const primaryFile = possibleFiles[0];
            const primarySearch = searchTerms[0] || company;
            
            console.log('선택된 PDF 파일:', primaryFile + '.pdf');
            console.log('주 검색어:', primarySearch);
            console.log('대체 검색어:', searchTerms.slice(1));
            
            // URL 파라미터 구성
            const params = new URLSearchParams({
                file: primaryFile + '.pdf',
                search: encodeURIComponent(primarySearch),
                fallback: encodeURIComponent(searchTerms.join('|')),
                allfiles: possibleFiles.join('|')
            });
            
            // 면적 정보 처리
            const exclusiveArea = this.normalizeArea(buildingData.공실전용면적);
            const rentArea = this.normalizeArea(buildingData.공실임대면적);
            
            console.log('정규화된 전용면적:', exclusiveArea);
            console.log('정규화된 임대면적:', rentArea);
            
            // 면적 정보가 있으면 추가
            if (exclusiveArea && exclusiveArea !== '-') {
                params.append('exclusive', exclusiveArea);
            }
            if (rentArea && rentArea !== '-') {
                params.append('rent', rentArea);
            }
            
            // 면적이 있으면 area 파라미터도 추가 (우선순위: 전용면적 > 임대면적)
            const searchArea = (exclusiveArea && exclusiveArea !== '-') ? exclusiveArea : rentArea;
            if (searchArea && searchArea !== '-') {
                params.append('area', searchArea);
            }
            
            console.groupEnd();
            
            // PDF.js 뷰어 URL 생성
            const viewerUrl = `${this.viewerUrl}?${params.toString()}`;
            
            console.log('📄 뷰어 URL:', viewerUrl);
            
            // 새 창에서 PDF 뷰어 열기
            const pdfWindow = window.open(viewerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
            
            if (!pdfWindow) {
                throw new Error('팝업 차단으로 PDF를 열 수 없습니다.\n브라우저 설정에서 팝업을 허용해주세요.');
            }
            
            // 성공 로그
            console.log('✅ PDF 뷰어 열기 성공');
            
            return true;
            
        } catch (error) {
            console.groupEnd();
            console.error('❌ PDF 열기 실패:', error);
            this.handleError('PDF 열기 실패', error);
            alert(error.message || 'PDF를 여는 중 오류가 발생했습니다.');
            return false;
        }
    }

    // 면적 정규화 (숫자만 추출) - 개선된 버전
    normalizeArea(area) {
        try {
            if (!area || area === '-' || area === '' || area === null || area === undefined) {
                return null;
            }
            
            // 문자열로 변환
            const areaStr = String(area).trim();
            
            if (areaStr === '' || areaStr === '-') {
                return null;
            }
            
            // 숫자와 소수점만 추출 (첫 번째 숫자만)
            const match = areaStr.match(/\d+\.?\d*/);
            const result = match ? match[0] : null;
            
            // 결과 검증
            if (result && !isNaN(parseFloat(result))) {
                return result;
            }
            
            return null;
            
        } catch (error) {
            console.warn('⚠️ 면적 정규화 오류:', area, error);
            return null;
        }
    }

    // 검색어 추출 (개선된 로직) - 에러 핸들링 강화
    getSearchTerms(buildingData) {
        try {
            const terms = [];
            
            // 빌딩명 처리
            if (buildingData.빌딩명) {
                try {
                    // 보이지 않는 문자 제거
                    const cleanedName = String(buildingData.빌딩명).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
                    
                    if (cleanedName) {
                        terms.push(cleanedName);
                        
                        // 띄어쓰기 변형 추가
                        // 1. 한글+영문 사이 띄어쓰기 (그랜드센트럴 → 그랜드 센트럴)
                        const spaced = cleanedName.replace(/([가-힣])([A-Z])/g, '$1 $2');
                        if (spaced !== cleanedName) terms.push(spaced);
                        
                        // 2. 띄어쓰기 제거 버전 (그랜드 센트럴 → 그랜드센트럴)
                        if (cleanedName.includes(' ')) {
                            terms.push(cleanedName.replace(/\s+/g, ''));
                        }
                        
                        // 3. 영문+숫자 조합 (L7 → L 7)
                        const withSpacedNumbers = cleanedName.replace(/([A-Za-z]+)(\d+)/g, '$1 $2');
                        if (withSpacedNumbers !== cleanedName) {
                            terms.push(withSpacedNumbers);
                        }
                        
                        // 4. 영문대문자 연속 분리 (LG광화문 → LG 광화문)
                        const withSpacedCapitals = cleanedName.replace(/([A-Z]+)([가-힣])/g, '$1 $2');
                        if (withSpacedCapitals !== cleanedName) {
                            terms.push(withSpacedCapitals);
                        }
                        
                        // 빌딩명에서 괄호 제거한 버전도 추가
                        const withoutParentheses = cleanedName.replace(/\s*\([^)]*\)/g, '').trim();
                        if (withoutParentheses && withoutParentheses !== cleanedName) {
                            terms.push(withoutParentheses);
                        }
                        
                        // 첫 단어만 추가 (예: "알레르망타워" → "알레르망")
                        const firstWord = cleanedName.split(/[\s(]/)[0];
                        if (firstWord && firstWord.length >= 2) {
                            terms.push(firstWord);
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ 빌딩명 처리 오류:', buildingData.빌딩명, error);
                }
            }
            
            // 주소 처리
            if (buildingData.주소) {
                try {
                    const address = String(buildingData.주소).trim();
                    
                    // 주소에서 구와 동 추출
                    const guMatch = address.match(/(\S+구)/);
                    const dongMatch = address.match(/(\S+동)(?=\s|$)/);
                    
                    if (guMatch && guMatch[1]) terms.push(guMatch[1]);
                    if (dongMatch && dongMatch[1]) terms.push(dongMatch[1]);
                    
                    // 전체 주소도 추가 (마지막 옵션)
                    if (address) terms.push(address);
                } catch (error) {
                    console.warn('⚠️ 주소 처리 오류:', buildingData.주소, error);
                }
            }
            
            // 인근역 처리
            if (buildingData.인근역) {
                try {
                    const stations = String(buildingData.인근역).split(',').map(s => s.trim());
                    stations.forEach(station => {
                        if (station) {
                            // "도보 X분" 제거
                            const stationName = station.replace(/\s*도보\s*\d+분/, '').trim();
                            if (stationName) terms.push(stationName);
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ 인근역 처리 오류:', buildingData.인근역, error);
                }
            }
            
            // 중복 제거하여 반환 (빈 문자열 제외)
            const uniqueTerms = [...new Set(terms.filter(term => term && term.trim().length > 0))];
            
            console.log('🔍 추출된 검색어:', uniqueTerms);
            
            return uniqueTerms.length > 0 ? uniqueTerms : [''];
            
        } catch (error) {
            console.error('❌ 검색어 추출 오류:', error);
            this.handleError('검색어 추출 실패', error);
            return [''];
        }
    }

    // 회사명으로 가능한 파일명들 가져오기 (안전한 버전)
    getPossibleFiles(company) {
        try {
            if (!company) {
                console.warn('⚠️ getPossibleFiles: 빈 회사명');
                return [];
            }
            
            const companyStr = String(company).trim();
            
            // 특별 매핑 확인
            if (this.companyToPdfMapping[companyStr]) {
                return [...this.companyToPdfMapping[companyStr]];
            }
            
            // 기본: 회사명을 파일명으로 변환
            const normalized = this.normalizeFilename(companyStr);
            
            if (!normalized) {
                console.warn('⚠️ getPossibleFiles: 정규화된 파일명이 빈 값');
                return [];
            }
            
            // 정규화된 이름이 실제 파일 목록에 있는지 확인
            if (this.availablePDFs.has(normalized)) {
                return [normalized];
            }
            
            // 유사한 파일명 찾기 (대소문자 무시)
            const similar = Array.from(this.availablePDFs).filter(pdf => 
                pdf.toLowerCase() === normalized.toLowerCase()
            );
            
            return similar.length > 0 ? similar : [normalized];
            
        } catch (error) {
            console.error('❌ getPossibleFiles 오류:', error);
            this.handleError(`파일명 추출 실패: ${company}`, error);
            return [];
        }
    }

    // 회사명을 파일명으로 정규화 (안전한 버전)
    normalizeFilename(company) {
        try {
            if (!company) return '';
            
            // 특수문자 제거, 공백 제거
            const result = String(company)
                .replace(/[^\w가-힣]/g, '') // 특수문자 제거
                .replace(/\s+/g, '')        // 공백 제거
                .trim();
                
            return result;
            
        } catch (error) {
            console.warn('⚠️ normalizeFilename 오류:', company, error);
            return '';
        }
    }

    // 사용 가능한 PDF 목록 업데이트 (동적 로딩용)
    updateAvailablePDFs(pdfList) {
        try {
            if (Array.isArray(pdfList)) {
                this.availablePDFs = new Set(pdfList);
                this.pdfExistsCache.clear(); // 캐시 초기화
                console.log('✅ PDF 목록 업데이트 완료:', pdfList.length, '개');
            } else {
                console.warn('⚠️ updateAvailablePDFs: 잘못된 입력 타입');
            }
        } catch (error) {
            console.error('❌ PDF 목록 업데이트 실패:', error);
            this.handleError('PDF 목록 업데이트 실패', error);
        }
    }

    // 에러 핸들링
    handleError(message, error) {
        const errorInfo = {
            message,
            error: error.message || error,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        console.error('📋 PDFSearchManager 에러 로그:', errorInfo);
        
        // 외부 에러 핸들러가 있으면 호출
        if (typeof this.onError === 'function') {
            try {
                this.onError(errorInfo);
            } catch (callbackError) {
                console.error('❌ 에러 콜백 실행 실패:', callbackError);
            }
        }
    }

    // 디버그 정보
    debug() {
        try {
            console.group('🔍 PDFSearchManager 디버그 정보');
            console.log('초기화 상태:', this.initialized);
            console.log('사용 가능한 PDF:', Array.from(this.availablePDFs));
            console.log('회사 매핑:', this.companyToPdfMapping);
            console.log('캐시된 회사:', Array.from(this.pdfExistsCache.keys()));
            console.log('캐시 상태:', Object.fromEntries(this.pdfExistsCache));
            console.groupEnd();
        } catch (error) {
            console.error('❌ 디버그 정보 출력 실패:', error);
        }
    }

    // PDFManager와의 호환성을 위한 메서드 (안전한 버전)
    async findPDFInfo(buildingName, company) {
        try {
            if (!company) {
                console.warn('⚠️ findPDFInfo: 빈 회사명');
                return null;
            }
            
            const exists = await this.checkPDFExists(company);
            if (!exists) {
                console.log(`📄 findPDFInfo: ${company} PDF 없음`);
                return null;
            }
            
            const files = this.getPossibleFiles(company);
            if (files.length === 0) {
                console.warn(`⚠️ findPDFInfo: ${company} 파일 매핑 없음`);
                return null;
            }
            
            return {
                fileName: files[0] + '.pdf',
                pageNumber: 1  // 기본값, 실제로는 검색으로 찾음
            };
            
        } catch (error) {
            console.error('❌ findPDFInfo 오류:', error);
            this.handleError(`PDF 정보 찾기 실패: ${company}`, error);
            return null;
        }
    }

    // 상태 확인 메서드
    isReady() {
        return this.initialized;
    }

    // 캐시 초기화
    clearCache() {
        try {
            this.pdfExistsCache.clear();
            console.log('✅ PDF 캐시 초기화 완료');
        } catch (error) {
            console.error('❌ 캐시 초기화 실패:', error);
        }
    }

    // 통계 정보
    getStats() {
        try {
            return {
                totalPDFs: this.availablePDFs.size,
                cachedCompanies: this.pdfExistsCache.size,
                mappedCompanies: Object.keys(this.companyToPdfMapping).length,
                initialized: this.initialized
            };
        } catch (error) {
            console.error('❌ 통계 정보 조회 실패:', error);
            return null;
        }
    }
}

// 전역 객체로 등록
window.PDFSearchManager = new PDFSearchManager();

// 자동 초기화 (DOMContentLoaded 후)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.PDFSearchManager.initialize();
    });
} else {
    // 이미 로드된 경우 즉시 초기화
    window.PDFSearchManager.initialize();
}

console.log('✅ PDF Search Manager (통합 버전) 로드 완료');