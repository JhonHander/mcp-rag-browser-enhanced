/**
 * Base interface for search providers
 */

export interface SearchResult {
    title: string;
    url: string;
    content: string;
    markdown: string;
    publishedDate?: string;
    score?: number;
}

export interface SearchProvider {
    searchWeb(query: string, maxResults?: number): Promise<SearchResult[]>;
}

export interface SearchProviderArgs {
    query: string;
    maxResults: number;
    scrapingTool?: string;
    outputFormats?: string[];
    requestTimeoutSecs?: number;
}
