import { DataPacket } from '../shared/types';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  html: string;
  status: number;
  contentType: string;
  crawledAt: number;
  depth: number;
  links: string[];
  metadata: Record<string, string>;
}

export interface CrawlOptions {
  maxDepth: number;
  maxPages: number;
  maxRetries: number;
  retryDelay: number;
  requestTimeout: number;
  userAgent: string;
  obeyRobotsTxt: boolean;
  respectDelay: number;
}

export interface URLQueueItem {
  url: string;
  depth: number;
  priority: number;
  retries: number;
  addedAt: number;
}

export interface CrawlStatistics {
  pagesCrawled: number;
  pagesFailed: number;
  totalLinks: number;
  uniqueUrls: number;
  averageDepth: number;
  totalBytes: number;
  averageResponseTime: number;
  errors: string[];
}

export interface RobotsTxtRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay: number;
}

export class WebCrawler {
  private _urlQueue: URLQueueItem[] = [];
  private _visitedUrls: Set<string> = new Set();
  private _failedUrls: Map<string, string> = new Map();
  private _crawledPages: Map<string, CrawledPage> = new Map();
  private _robotsCache: Map<string, RobotsTxtRule[]> = new Map();
  private _crawlOptions: CrawlOptions = {
    maxDepth: 3,
    maxPages: 100,
    maxRetries: 3,
    retryDelay: 1000,
    requestTimeout: 30000,
    userAgent: 'CognitivePhaseSpaceBot/1.0',
    obeyRobotsTxt: true,
    respectDelay: 1000
  };
  private _statistics: CrawlStatistics = {
    pagesCrawled: 0,
    pagesFailed: 0,
    totalLinks: 0,
    uniqueUrls: 0,
    averageDepth: 0,
    totalBytes: 0,
    averageResponseTime: 0,
    errors: []
  };
  private _urlFilters: ((url: string) => boolean)[] = [];
  private _counter: number = 0;
  private _lastResult: CrawledPage[] | null = null;
  private _isCrawling: boolean = false;

  constructor(options?: Partial<CrawlOptions>) {
    if (options) {
      this._crawlOptions = { ...this._crawlOptions, ...options };
    }
  }

  get urlQueue(): URLQueueItem[] {
    return [...this._urlQueue];
  }

  get visitedUrls(): Set<string> {
    return new Set(this._visitedUrls);
  }

  get crawledPages(): Map<string, CrawledPage> {
    return new Map(this._crawledPages);
  }

  get statistics(): CrawlStatistics {
    return { ...this._statistics, errors: [...this._statistics.errors] };
  }

  get crawlOptions(): CrawlOptions {
    return { ...this._crawlOptions };
  }

  get isCrawling(): boolean {
    return this._isCrawling;
  }

  setOptions(options: Partial<CrawlOptions>): void {
    this._crawlOptions = { ...this._crawlOptions, ...options };
  }

  addUrlFilter(filter: (url: string) => boolean): void {
    this._urlFilters.push(filter);
  }

  clearUrlFilters(): void {
    this._urlFilters = [];
  }

  addSeedUrl(url: string, priority: number = 5): void {
    if (this._isValidUrl(url) && !this._visitedUrls.has(url)) {
      this._addToQueue(url, 0, priority);
    }
  }

  addSeedUrls(urls: string[], priority: number = 5): void {
    for (const url of urls) {
      this.addSeedUrl(url, priority);
    }
  }

  private _addToQueue(url: string, depth: number, priority: number = 5): void {
    const normalizedUrl = this._normalizeUrl(url);
    if (!this._visitedUrls.has(normalizedUrl) && 
        !this._urlQueue.some(item => item.url === normalizedUrl) &&
        this._passesFilters(normalizedUrl)) {
      this._urlQueue.push({
        url: normalizedUrl,
        depth,
        priority,
        retries: 0,
        addedAt: Date.now()
      });
      this._urlQueue.sort((a, b) => b.priority - a.priority || a.addedAt - b.addedAt);
    }
  }

  private _normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      urlObj.searchParams.sort();
      let normalized = urlObj.toString();
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }
      return normalized;
    } catch {
      return url;
    }
  }

  private _isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private _passesFilters(url: string): boolean {
    for (const filter of this._urlFilters) {
      if (!filter(url)) {
        return false;
      }
    }
    return true;
  }

  async crawl(startUrl?: string): Promise<CrawledPage[]> {
    if (startUrl) {
      this.addSeedUrl(startUrl);
    }

    this._isCrawling = true;
    this._resetStatistics();
    const crawledPages: CrawledPage[] = [];
    let totalDepth = 0;
    let totalResponseTime = 0;
    let responseTimes = 0;

    while (this._urlQueue.length > 0 && 
           this._statistics.pagesCrawled < this._crawlOptions.maxPages) {
      const queueItem = this._urlQueue.shift()!;
      
      if (this._visitedUrls.has(queueItem.url)) continue;
      if (queueItem.depth > this._crawlOptions.maxDepth) continue;

      this._visitedUrls.add(queueItem.url);

      try {
        const startTime = Date.now();
        const page = await this._fetchPage(queueItem.url, queueItem.depth);
        const responseTime = Date.now() - startTime;
        
        this._crawledPages.set(queueItem.url, page);
        crawledPages.push(page);
        this._statistics.pagesCrawled++;
        this._statistics.totalBytes += page.html.length;
        this._statistics.totalLinks += page.links.length;
        
        totalDepth += queueItem.depth;
        totalResponseTime += responseTime;
        responseTimes++;
        this._statistics.averageResponseTime = totalResponseTime / responseTimes;
        this._statistics.averageDepth = totalDepth / this._statistics.pagesCrawled;

        if (queueItem.depth < this._crawlOptions.maxDepth) {
          for (const link of page.links) {
            if (this._isSameDomain(queueItem.url, link)) {
              this._addToQueue(link, queueItem.depth + 1, 3);
            } else {
              this._addToQueue(link, queueItem.depth + 1, 1);
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this._statistics.pagesFailed++;
        this._statistics.errors.push(`${queueItem.url}: ${errorMessage}`);
        this._failedUrls.set(queueItem.url, errorMessage);

        if (queueItem.retries < this._crawlOptions.maxRetries) {
          this._urlQueue.push({
            ...queueItem,
            retries: queueItem.retries + 1,
            addedAt: Date.now() + this._crawlOptions.retryDelay
          });
        }
      }

      await this._delay(this._crawlOptions.respectDelay);
    }

    this._statistics.uniqueUrls = this._visitedUrls.size;
    this._isCrawling = false;
    this._lastResult = crawledPages;
    return crawledPages;
  }

  private async _fetchPage(url: string, depth: number): Promise<CrawledPage> {
    const html = this._generateMockHtml(url);
    const parsed = this._parseHtml(html, url);

    return {
      url,
      title: parsed.title,
      content: parsed.content,
      html,
      status: 200,
      contentType: 'text/html',
      crawledAt: Date.now(),
      depth,
      links: parsed.links,
      metadata: parsed.metadata
    };
  }

  private _parseHtml(html: string, baseUrl: string): { 
    title: string; 
    content: string; 
    links: string[];
    metadata: Record<string, string>;
  } {
    let title = '';
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) {
      title = this._stripHtml(titleMatch[1]).trim();
    }

    const metadata: Record<string, string> = {};
    const metaRegex = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
    let metaMatch;
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      metadata[metaMatch[1].toLowerCase()] = metaMatch[2];
    }

    let bodyContent = '';
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    } else {
      bodyContent = html;
    }

    const content = this._extractText(bodyContent);

    const links: string[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      let href = linkMatch[1];
      if (href.startsWith('/')) {
        try {
          const base = new URL(baseUrl);
          href = `${base.origin}${href}`;
        } catch {}
      }
      if (this._isValidUrl(href)) {
        links.push(this._normalizeUrl(href));
      }
    }

    return { title, content, links: [...new Set(links)], metadata };
  }

  private _extractText(html: string): string {
    let text = html;
    
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    return text;
  }

  private _stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim();
  }

  private _isSameDomain(url1: string, url2: string): boolean {
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      return u1.hostname === u2.hostname;
    } catch {
      return false;
    }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private _generateMockHtml(url: string): string {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const title = path === '/' ? 'Home Page' : path.split('/').filter(Boolean).join(' - ');
    
    const mockLinks = [
      '/about',
      '/contact',
      '/products',
      '/services',
      '/blog',
      '/blog/post-1',
      '/blog/post-2',
      '/faq',
      '/help',
      '/terms',
      '/privacy'
    ];

    const linksHtml = mockLinks.map(link => 
      `<a href="${link}">${link.replace('/', '').replace(/-/g, ' ')}</a>`
    ).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <title>${title} - Example Site</title>
  <meta name="description" content="This is a sample page for ${title}">
  <meta name="keywords" content="example, sample, ${title.toLowerCase()}">
  <meta property="og:title" content="${title}">
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/products">Products</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <h1>${title}</h1>
    <p>Welcome to the ${title.toLowerCase()} page of our example website. 
    This page contains various information about ${title.toLowerCase()} 
    and related topics.</p>
    <p>Our website provides comprehensive resources on ${title.toLowerCase()}.
    You can find detailed guides, tutorials, and references to help you
    understand more about this subject.</p>
    <section>
      <h2>Related Pages</h2>
      ${linksHtml}
    </section>
    <section>
      <h2>Key Features</h2>
      <ul>
        <li>Feature one: Comprehensive information about ${title.toLowerCase()}</li>
        <li>Feature two: Easy navigation and user-friendly interface</li>
        <li>Feature three: Regular updates and fresh content</li>
        <li>Feature four: Community-driven discussions and feedback</li>
      </ul>
    </section>
  </main>
  <footer>
    <p>&copy; 2024 Example Site. All rights reserved.</p>
  </footer>
</body>
</html>`;
  }

  getPageByUrl(url: string): CrawledPage | undefined {
    return this._crawledPages.get(this._normalizeUrl(url));
  }

  getPagesByDepth(depth: number): CrawledPage[] {
    const results: CrawledPage[] = [];
    for (const page of this._crawledPages.values()) {
      if (page.depth === depth) {
        results.push(page);
      }
    }
    return results;
  }

  searchPages(query: string): CrawledPage[] {
    const lowerQuery = query.toLowerCase();
    const results: CrawledPage[] = [];
    
    for (const page of this._crawledPages.values()) {
      if (page.title.toLowerCase().includes(lowerQuery) ||
          page.content.toLowerCase().includes(lowerQuery)) {
        results.push(page);
      }
    }
    
    return results;
  }

  getBrokenLinks(): { page: string; brokenLinks: string[] }[] {
    const results: { page: string; brokenLinks: string[] }[] = [];
    
    for (const [url, page] of this._crawledPages) {
      const brokenLinks: string[] = [];
      for (const link of page.links) {
        if (this._failedUrls.has(link)) {
          brokenLinks.push(link);
        }
      }
      if (brokenLinks.length > 0) {
        results.push({ page: url, brokenLinks });
      }
    }
    
    return results;
  }

  getDomainStats(): Map<string, { pages: number; links: number }> {
    const stats = new Map<string, { pages: number; links: number }>();
    
    for (const [url, page] of this._crawledPages) {
      try {
        const domain = new URL(url).hostname;
        if (!stats.has(domain)) {
          stats.set(domain, { pages: 0, links: 0 });
        }
        const entry = stats.get(domain)!;
        entry.pages++;
        entry.links += page.links.length;
      } catch {}
    }
    
    return stats;
  }

  exportSitemap(): string[] {
    return Array.from(this._crawledPages.keys()).sort();
  }

  private _resetStatistics(): void {
    this._statistics = {
      pagesCrawled: 0,
      pagesFailed: 0,
      totalLinks: 0,
      uniqueUrls: 0,
      averageDepth: 0,
      totalBytes: 0,
      averageResponseTime: 0,
      errors: []
    };
  }

  toPacket(): DataPacket<CrawledPage[]> {
    const result = this._lastResult || [];
    this._counter++;
    return {
      id: `web-crawler-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'web-crawler'],
        priority: 1,
        phase: 'crawling'
      }
    };
  }

  reset(): void {
    this._urlQueue = [];
    this._visitedUrls.clear();
    this._failedUrls.clear();
    this._crawledPages.clear();
    this._robotsCache.clear();
    this._urlFilters = [];
    this._counter = 0;
    this._lastResult = null;
    this._isCrawling = false;
    this._resetStatistics();
    this._crawlOptions = {
      maxDepth: 3,
      maxPages: 100,
      maxRetries: 3,
      retryDelay: 1000,
      requestTimeout: 30000,
      userAgent: 'CognitivePhaseSpaceBot/1.0',
      obeyRobotsTxt: true,
      respectDelay: 1000
    };
  }
}
