// 지도 관리자
const MapManager = {
    geocoder: null,
    
    // 초기화
    init() {
        // Kakao 지도 API 로드 확인
        if (typeof kakao !== 'undefined' && kakao.maps) {
            kakao.maps.load(() => {
                this.geocoder = new kakao.maps.services.Geocoder();
                console.log('Kakao Maps API 로드 완료');
            });
        } else {
            console.error('Kakao Maps API가 로드되지 않았습니다.');
        }
    },
    
    // 단일 빌딩 지도 표시
    showBuildingMap(index) {
        const building = DataManager.currentResults[index];
        if (!building || !building.주소) {
            alert('주소 정보가 없습니다.');
            return;
        }
        
        // 새 창 열기
        const mapWindow = window.open('', '_blank', 'width=800,height=600');
        
        // HTML 작성
        mapWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${building.빌딩명} - 위치</title>
                <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${this.getKakaoApiKey()}&libraries=services"></script>
                <style>
                    body { margin: 0; padding: 0; }
                    #map { width: 100%; height: 100vh; }
                    .info-window {
                        padding: 10px;
                        min-width: 200px;
                    }
                    .info-title {
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 5px;
                    }
                    .info-content {
                        font-size: 14px;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    kakao.maps.load(function() {
                        const container = document.getElementById('map');
                        const options = {
                            center: new kakao.maps.LatLng(37.5665, 126.9780),
                            level: 3
                        };
                        
                        const map = new kakao.maps.Map(container, options);
                        const geocoder = new kakao.maps.services.Geocoder();
                        
                        // 주소로 좌표 검색
                        geocoder.addressSearch('${building.주소}', function(result, status) {
                            if (status === kakao.maps.services.Status.OK) {
                                const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                                
                                // 마커 생성
                                const marker = new kakao.maps.Marker({
                                    map: map,
                                    position: coords
                                });
                                
                                // 인포윈도우
                                const infowindow = new kakao.maps.InfoWindow({
                                    content: \`
                                        <div class="info-window">
                                            <div class="info-title">${building.빌딩명}</div>
                                            <div class="info-content">
                                                주소: ${building.주소}<br>
                                                공실층: ${building.공실층 || '-'}<br>
                                                면적: ${building['공실전용면적(평)'] || '-'}평<br>
                                                출처: ${building.출처회사}
                                            </div>
                                        </div>
                                    \`
                                });
                                
                                infowindow.open(map, marker);
                                map.setCenter(coords);
                            } else {
                                alert('주소를 찾을 수 없습니다.');
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `);
    },
    
    // 선택된 빌딩들 지도 표시
    showSelectedBuildingsMap() {
        const selectedData = [];
        
        // 선택된 빌딩 데이터 수집
        DataManager.selectedBuildings.forEach(key => {
            const [buildingName, address] = key.split('_');
            const building = DataManager.currentResults.find(item => 
                item.빌딩명 === buildingName && item.주소 === address
            );
            if (building) {
                selectedData.push(building);
            }
        });
        
        if (selectedData.length === 0) {
            alert('선택된 빌딩이 없습니다.');
            return;
        }
        
        // 새 창 열기
        const mapWindow = window.open('', '_blank', 'width=1000,height=700');
        
        // HTML 작성
        mapWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>선택된 빌딩 위치</title>
                <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${this.getKakaoApiKey()}&libraries=services"></script>
                <style>
                    body { margin: 0; padding: 0; display: flex; }
                    #map { flex: 1; height: 100vh; }
                    #sidebar {
                        width: 300px;
                        height: 100vh;
                        overflow-y: auto;
                        background: #f8f9fa;
                        padding: 20px;
                        box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                    }
                    .building-item {
                        background: white;
                        padding: 15px;
                        margin-bottom: 10px;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    .building-item:hover {
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    .building-name {
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 5px;
                    }
                    .building-info {
                        font-size: 13px;
                        color: #666;
                        line-height: 1.5;
                    }
                    h3 {
                        margin-top: 0;
                        color: #333;
                    }
                </style>
            </head>
            <body>
                <div id="sidebar">
                    <h3>선택된 빌딩 (${selectedData.length}개)</h3>
                    <div id="buildingList"></div>
                </div>
                <div id="map"></div>
                <script>
                    const buildings = ${JSON.stringify(selectedData)};
                    let markers = [];
                    let infowindows = [];
                    
                    kakao.maps.load(function() {
                        const container = document.getElementById('map');
                        const options = {
                            center: new kakao.maps.LatLng(37.5665, 126.9780),
                            level: 5
                        };
                        
                        const map = new kakao.maps.Map(container, options);
                        const geocoder = new kakao.maps.services.Geocoder();
                        const bounds = new kakao.maps.LatLngBounds();
                        
                        // 사이드바 생성
                        const listContainer = document.getElementById('buildingList');
                        
                        buildings.forEach((building, index) => {
                            // 사이드바 아이템 생성
                            const item = document.createElement('div');
                            item.className = 'building-item';
                            item.innerHTML = \`
                                <div class="building-name">\${index + 1}. \${building.빌딩명}</div>
                                <div class="building-info">
                                    주소: \${building.주소}<br>
                                    공실층: \${building.공실층 || '-'}<br>
                                    면적: \${building['공실전용면적(평)'] || '-'}평
                                </div>
                            \`;
                            
                            // 주소로 좌표 검색
                            geocoder.addressSearch(building.주소, function(result, status) {
                                if (status === kakao.maps.services.Status.OK) {
                                    const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                                    
                                    // 마커 생성
                                    const marker = new kakao.maps.Marker({
                                        map: map,
                                        position: coords,
                                        title: building.빌딩명
                                    });
                                    
                                    // 인포윈도우
                                    const infowindow = new kakao.maps.InfoWindow({
                                        content: \`
                                            <div style="padding:10px;min-width:200px;">
                                                <strong>\${index + 1}. \${building.빌딩명}</strong><br>
                                                \${building.주소}
                                            </div>
                                        \`
                                    });
                                    
                                    markers[index] = marker;
                                    infowindows[index] = infowindow;
                                    
                                    // 마커 클릭 이벤트
                                    kakao.maps.event.addListener(marker, 'click', function() {
                                        infowindows.forEach(iw => iw.close());
                                        infowindow.open(map, marker);
                                    });
                                    
                                    // 사이드바 아이템 클릭 이벤트
                                    item.onclick = function() {
                                        map.setCenter(coords);
                                        map.setLevel(3);
                                        infowindows.forEach(iw => iw.close());
                                        infowindow.open(map, marker);
                                    };
                                    
                                    bounds.extend(coords);
                                }
                            });
                            
                            listContainer.appendChild(item);
                        });
                        
                        // 모든 마커가 보이도록 지도 조정
                        setTimeout(function() {
                            map.setBounds(bounds);
                        }, 1000);
                    });
                </script>
            </body>
            </html>
        `);
    },
    
    // Kakao API 키 가져오기
    getKakaoApiKey() {
        // HTML에서 API 키 추출
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src && script.src.includes('dapi.kakao.com')) {
                const match = script.src.match(/appkey=([^&]+)/);
                if (match) {
                    return match[1];
                }
            }
        }
        return 'YOUR_KAKAO_API_KEY';
    }
};

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    MapManager.init();
});
