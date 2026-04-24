document.addEventListener('DOMContentLoaded', () => {
    // 테마 토글
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isDark = document.body.classList.contains('dark-theme');
        themeToggle.innerHTML = document.body.classList.contains('light-theme') 
            ? '<i class="fas fa-sun"></i> 라이트 모드' 
            : '<i class="fas fa-moon"></i> 다크 모드';
        updateChartTheme();
    });

    // 종목 정보 (시총은 표시용, 가격/등락은 실시간 조회)
    const marketData = {
        domestic: [
            { name: '삼성전자', symbol: '005930', market: 'KRX', price: '조회 중...', change: '-', cap: '1,298조' },
            { name: 'SK하이닉스', symbol: '000660', market: 'KRX', price: '조회 중...', change: '-', cap: '822조' },
            { name: 'LG에너지솔루션', symbol: '373220', market: 'KRX', price: '조회 중...', change: '-', cap: '97조' },
            { name: '삼성바이오로직스', symbol: '207940', market: 'KRX', price: '조회 중...', change: '-', cap: '113조' },
            { name: '현대차', symbol: '005380', market: 'KRX', price: '조회 중...', change: '-', cap: '112조' }
        ],
        overseas: [
            { name: 'Apple Inc.', symbol: 'AAPL', market: 'NASDAQ', price: '조회 중...', change: '-', cap: '$4.12T' },
            { name: 'Microsoft', symbol: 'MSFT', market: 'NASDAQ', price: '조회 중...', change: '-', cap: '$3.12T' },
            { name: 'NVIDIA', symbol: 'NVDA', market: 'NASDAQ', price: '조회 중...', change: '-', cap: '$4.89T' },
            { name: 'Alphabet A', symbol: 'GOOGL', market: 'NASDAQ', price: '조회 중...', change: '-', cap: '$4.17T' },
            { name: 'Tesla', symbol: 'TSLA', market: 'NASDAQ', price: '조회 중...', change: '-', cap: '$1.23T' }
        ],
        etf: [
            { name: 'KODEX 200', symbol: '069500', market: 'KRX', price: '조회 중...', change: '-', cap: '6.5조' },
            { name: 'TIGER 미국나스닥100', symbol: '133690', market: 'KRX', price: '조회 중...', change: '-', cap: '3.2조' },
            { name: 'KODEX 삼성그룹', symbol: '102780', market: 'KRX', price: '조회 중...', change: '-', cap: '1.8조' },
            { name: 'TIGER 2차전지테마', symbol: '305540', market: 'KRX', price: '조회 중...', change: '-', cap: '1.2조' },
            { name: 'KODEX 미국S&P500TR', symbol: '379800', market: 'KRX', price: '조회 중...', change: '-', cap: '0.9조' }
        ]
    };

    async function fetchRealTimePrice(symbol, market) {
        try {
            const res = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.priceFormatted) return null;
            return { price: data.priceFormatted, change: data.change || '-' };
        } catch (err) {
            console.warn('[stock] fetch failed:', symbol, err);
            return null;
        }
    }

    async function refreshPrices(type) {
        const list = marketData[type];
        if (!list) return;

        const results = await Promise.all(
            list.map(item => fetchRealTimePrice(item.symbol, item.market))
        );

        let anyUpdated = false;
        results.forEach((result, idx) => {
            if (result) {
                list[idx].price = result.price;
                list[idx].change = result.change;
                anyUpdated = true;
            }
        });

        if (anyUpdated) {
            const activeTab = document.querySelector('.sidebar nav li.active');
            if (activeTab && activeTab.dataset.tab === type) {
                renderMarketCapList(type);
            }
            if (type === 'domestic' && list[0]) {
                updateStockDetail(list[0]);
            }
        }
    }

    const newsData = [
        { title: '삼성전자, 1분기 영업이익 "어닝 서프라이즈" 기록', date: '2시간 전' },
        { title: '나스닥, 기술주 중심 강세로 사상 최고치 근접', date: '4시간 전' },
        { title: 'KODEX ETF 순자산 50조 돌파... 개인 투자자 유입 가속', date: '6시간 전' },
        { title: '미국 연준, 금리 인하 시점 고심... "물가 지표 확인 필요"', date: '8시간 전' },
        { title: '현대차-기아, 북미 전기차 점유율 확대 지속', date: '12시간 전' }
    ];

    const financialData = [
        { item: '매출액', y25: '305조', y24: '258조', y23: '302조' },
        { item: '영업이익', y25: '35조', y24: '6.5조', y23: '43조' },
        { item: '당기순이익', y25: '28조', y24: '15조', y23: '55조' },
        { item: 'ROE (%)', y25: '12.5', y24: '4.15', y23: '17.06' },
        { item: 'PER (배)', y25: '15.2', y24: '35.2', y23: '8.5' }
    ];

    // 차트 생성
    const ctx = document.getElementById('mainChart').getContext('2d');
    let mainChart;

    function initChart() {
        const labels = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '15:30'];
        const data = [77300, 77800, 77500, 78100, 78400, 78200, 78500];

        mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '주가',
                    data: data,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    function updateChartTheme() {
        const isLight = document.body.classList.contains('light-theme');
        const textColor = isLight ? '#64748b' : '#94a3b8';
        const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(148, 163, 184, 0.1)';

        mainChart.options.scales.x.ticks.color = textColor;
        mainChart.options.scales.y.ticks.color = textColor;
        mainChart.options.scales.y.grid.color = gridColor;
        mainChart.update();
    }

    // 데이터 렌더링 함수들
    function renderMarketCapList(type) {
        const list = document.getElementById('market-cap-list');
        const title = document.getElementById('list-title');
        list.innerHTML = '';
        
        const titles = { domestic: '국내 시가총액 상위', overseas: '해외 주요 종목', etf: '주요 ETF 리스트' };
        title.innerText = titles[type] || '시가총액 상위 10대 기업';

        const data = marketData[type] || marketData.domestic;
        data.forEach(item => {
            const li = document.createElement('li');
            const changeClass = item.change.includes('+') ? 'up' : item.change.includes('-') && item.change !== '-' ? 'down' : '';
            li.innerHTML = `
                <span>${item.name} <small style="color:var(--text-secondary)">${item.symbol}</small></span>
                <span class="${changeClass}">${item.price}${item.change && item.change !== '-' ? ` (${item.change})` : ''}</span>
            `;
            li.addEventListener('click', () => updateStockDetail(item));
            list.appendChild(li);
        });
    }

    function renderNews() {
        const list = document.getElementById('news-list');
        list.innerHTML = '';
        newsData.forEach(news => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${news.title}
                <span class="news-date">${news.date}</span>
            `;
            list.appendChild(li);
        });
    }

    function renderFinancials() {
        const body = document.getElementById('financial-body');
        body.innerHTML = '';
        financialData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-secondary)">${row.item}</td>
                <td>${row.y25}</td>
                <td>${row.y24}</td>
                <td>${row.y23}</td>
            `;
            body.appendChild(tr);
        });
    }

    function updateStockDetail(item) {
        document.getElementById('stock-name').innerText = item.name;
        document.getElementById('stock-symbol').innerText = item.symbol;
        document.getElementById('current-price').innerText = item.price;
        const changeEl = document.getElementById('price-change');
        changeEl.innerText = item.change;
        changeEl.className = item.change.includes('+') ? 'up' : item.change.includes('-') && item.change !== '-' ? 'down' : '';

        const basePrice = parseFloat(String(item.price).replace(/[^\d.]/g, ''));
        if (Number.isFinite(basePrice) && basePrice > 0) {
            const points = mainChart.data.labels.length;
            const newData = [];
            let value = basePrice * 0.99;
            for (let i = 0; i < points; i++) {
                value = value * (0.995 + Math.random() * 0.01);
                newData.push(Math.round(value));
            }
            newData[points - 1] = Math.round(basePrice);
            mainChart.data.datasets[0].data = newData;
        }
        mainChart.data.datasets[0].borderColor = item.change.includes('+') ? '#ef4444' : '#3b82f6';
        mainChart.update();
    }

    // 탭 이벤트
    const tabs = document.querySelectorAll('.sidebar nav li');
    const loadedTabs = new Set();
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const type = tab.dataset.tab;
            renderMarketCapList(type);
            if (!loadedTabs.has(type) && marketData[type]) {
                loadedTabs.add(type);
                refreshPrices(type);
            }
        });
    });

    // 초기 실행
    initChart();
    renderMarketCapList('domestic');
    renderNews();
    renderFinancials();
    loadedTabs.add('domestic');
    refreshPrices('domestic');
    setInterval(() => {
        const activeTab = document.querySelector('.sidebar nav li.active');
        if (activeTab && marketData[activeTab.dataset.tab]) {
            refreshPrices(activeTab.dataset.tab);
        }
    }, 60000);
});
