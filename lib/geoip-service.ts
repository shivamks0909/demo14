import { NextRequest } from "next/server";

interface GeoipProvider {
    name: string;
    check?: (req: NextRequest) => string | null;
    transform?: (val: string) => string;
    url?: (ip: string) => string | null;
    parse?: (data: any) => string;
}

// Cache for geo lookups
const GEO_CACHE = new Map<string, { country: string; expires: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours for production API
const FALLBACK_CACHE_TTL = 60 * 60 * 1000; // 1 hour for free APIs

// MaxMind instance (lazy loaded)
let maxmindReader: any = null;

/**
 * Load MaxMind local database
 */
async function loadMaxMind(dbPath: string): Promise<boolean> {
    if (maxmindReader && maxmindReader.path === dbPath) return true;

    try {
        const maxmind = await import('maxmind');
        maxmindReader = maxmind.open(dbPath);
        console.log(`[GeoIP] MaxMind DB loaded from ${dbPath}`);
        return true;
    } catch (err: any) {
        console.warn('[GeoIP] MaxMind library or DB not available:', err.message);
        maxmindReader = null;
        return false;
    }
}

/**
 * Get country code from IP address using configured provider
 */
export async function getCountryFromIp(request: NextRequest, ip: string): Promise<string> {
    // Skip localhost and private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'Unknown';
    }

    // Provider priority based on configuration
    const providers: GeoipProvider[] = [];

    // 1. Header providers (fastest, no external calls) - from reverse proxies
    providers.push(
        {
            name: 'vercel',
            check: (req) => req.headers.get('x-vercel-ip-country'),
            transform: (val) => val
        },
        {
            name: 'cloudflare',
            check: (req) => req.headers.get('cf-ipcountry'),
            transform: (val) => val
        }
    );

    // 2. Production API with token (ipinfo.io)
    if (process.env.IPINFO_TOKEN) {
        providers.push({
            name: 'ipinfo_production',
            url: (ip) => `https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`,
            parse: (data) => data.country || data.countryCode || 'Unknown'
        });
    }

    // 3. MaxMind local database if configured
    if (process.env.GEOIP_PROVIDER === 'maxmind' && process.env.MAXMIND_DB_PATH) {
        const dbPath = process.env.MAXMIND_DB_PATH;
        providers.push({
            name: 'maxmind',
            url: () => dbPath,
            parse: (data) => {
                if (data.country) {
                    return typeof data.country === 'string'
                        ? data.country
                        : data.country.iso_code || 'Unknown';
                }
                return 'Unknown';
            }
        });
    }

    // 4. Fallback free providers (only if no production config)
    if (!process.env.IPINFO_TOKEN && process.env.GEOIP_PROVIDER !== 'maxmind') {
        providers.push(
            {
                name: 'ipinfo_fallback',
                url: (ip) => `https://ipinfo.io/${ip}/json`,
                parse: (data) => data.country || data.countryCode || 'Unknown'
            },
            {
                name: 'ipapi_fallback',
                url: (ip) => `https://ipapi.co/${ip}/country/`,
                parse: (data) => data
            }
        );
    }

    // Try header providers first (no external calls)
    for (const provider of providers.filter(p => p.check)) {
        const headerValue = provider.check!(request);
        if (headerValue) {
            const country = provider.transform ? provider.transform(headerValue) : headerValue;
            if (country && country !== 'Unknown') {
                console.log(`[GeoIP] Got country ${country} from ${provider.name} header`);
                return country;
            }
        }
    }

    // Check cache
    const cacheKey = `geo:${ip}`;
    const cached = GEO_CACHE.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        console.log(`[GeoIP] Cache hit for ${ip}: ${cached.country}`);
        return cached.country;
    }

    // Try database and API providers
    const apiProviders = providers.filter(p => !p.check);
    const useLongCache = process.env.IPINFO_TOKEN || process.env.GEOIP_PROVIDER === 'maxmind';

    for (const provider of apiProviders) {
        if (!provider.url) continue;

        try {
            let urlOrPath = provider.url(ip);
            if (!urlOrPath) continue;

            // Handle MaxMind separately
            if (provider.name === 'maxmind') {
                const loaded = await loadMaxMind(urlOrPath);
                if (loaded && maxmindReader) {
                    const response = maxmindReader.get(ip) || maxmindReader.country(ip);
                    const parseFn = provider.parse;
                    if (parseFn) {
                        const country = parseFn(response);
                        if (country && country !== 'Unknown') {
                            GEO_CACHE.set(cacheKey, {
                                country,
                                expires: Date.now() + CACHE_TTL
                            });
                            console.log(`[GeoIP] MaxMind DB returned ${country} for ${ip}`);
                            return country;
                        }
                    }
                }
                continue;
            }

            // External API with timeout
            if (!provider.parse) continue;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(urlOrPath, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'SurveyRouter/1.0'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const country = provider.parse(data);
                if (country && country !== 'Unknown') {
                    GEO_CACHE.set(cacheKey, {
                        country,
                        expires: Date.now() + (useLongCache ? CACHE_TTL : FALLBACK_CACHE_TTL)
                    });
                    console.log(`[GeoIP] ${provider.name} returned ${country} for ${ip}`);
                    return country;
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.warn(`[GeoIP] ${provider.name} timeout for ${ip}`);
            } else {
                console.warn(`[GeoIP] ${provider.name} failed for ${ip}:`, err.message);
            }
        }
    }

    console.warn(`[GeoIP] All providers failed for ${ip}, returning 'Unknown'`);
    return 'Unknown';
}

/**
 * Clear geo cache (useful for testing)
 */
export function clearGeoCache(): void {
    GEO_CACHE.clear();
}
