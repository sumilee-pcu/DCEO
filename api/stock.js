const MARKET_MAP = {
    domestic: 'KRX',
    overseas: 'NASDAQ',
};

function parseGoogleFinanceHtml(html) {
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    const currencyMatch = html.match(/data-currency-code="([^"]+)"/);
    const prevCloseMatch = html.match(/data-last-normal-market-timestamp="[^"]*"[^>]*data-last-price="[^"]*"[^>]*data-previous-close="([^"]+)"/)
        || html.match(/data-previous-close="([^"]+)"/);

    if (!priceMatch) {
        const altPriceMatch = html.match(/<div[^>]*class="[^"]*YMlKec[^"]*fxKbKc[^"]*"[^>]*>([^<]+)<\/div>/);
        if (altPriceMatch) {
            const priceStr = altPriceMatch[1].replace(/[^\d.,-]/g, '').replace(/,/g, '');
            return {
                price: parseFloat(priceStr),
                currency: currencyMatch ? currencyMatch[1] : null,
                previousClose: prevCloseMatch ? parseFloat(prevCloseMatch[1]) : null,
            };
        }
        return null;
    }

    return {
        price: parseFloat(priceMatch[1]),
        currency: currencyMatch ? currencyMatch[1] : null,
        previousClose: prevCloseMatch ? parseFloat(prevCloseMatch[1]) : null,
    };
}

async function fetchGoogleFinance(symbol, market) {
    const url = `https://www.google.com/finance/quote/${symbol}:${market}?hl=ko`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    });

    if (!response.ok) {
        throw new Error(`Google Finance returned ${response.status}`);
    }

    const html = await response.text();
    const parsed = parseGoogleFinanceHtml(html);

    if (!parsed || !Number.isFinite(parsed.price)) {
        throw new Error('Unable to parse price from Google Finance');
    }

    return parsed;
}

function formatPrice(value, currency) {
    if (!Number.isFinite(value)) return null;
    if (currency === 'KRW') {
        return Math.round(value).toLocaleString('ko-KR');
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
}

export default async function handler(req, res) {
    const { symbol, market } = req.query;

    if (!symbol) {
        return res.status(400).json({ error: 'symbol query parameter is required' });
    }

    const marketCode = market || MARKET_MAP.domestic;

    try {
        const data = await fetchGoogleFinance(symbol, marketCode);
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({
            symbol: `${symbol}:${marketCode}`,
            price: data.price,
            priceFormatted: formatPrice(data.price, data.currency),
            currency: data.currency,
            previousClose: data.previousClose,
            change: formatChange(data.price, data.previousClose),
            fetchedAt: new Date().toISOString(),
            source: 'google-finance',
        });
    } catch (err) {
        return res.status(502).json({
            error: err.message,
            symbol: `${symbol}:${marketCode}`,
        });
    }
}
