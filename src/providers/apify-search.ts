/**
 * Apify Search Provider for MCP RAG Web Browser
 * Maintains compatibility with original Apify implementation
 */

import type { SearchProvider, SearchResult, SearchProviderArgs } from './base-search.js';

export class ApifySearchProvider implements SearchProvider {
    private apiToken: string;
    private baseUrl = 'https://rag-web-browser.apify.actor/search';

    constructor(apiToken: string) {
        if (!apiToken) {
            throw new Error('Apify API token is required');
        }
        this.apiToken = apiToken;
    }

    async searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
        const args: SearchProviderArgs = {
            query,
            maxResults,
            scrapingTool: 'raw-http',
            outputFormats: ['markdown'],
            requestTimeoutSecs: 40
        };

        const result = await this.callRagWebBrowser(args);
        return this.parseApifyResponse(result);
    }

    private async callRagWebBrowser(args: SearchProviderArgs): Promise<string> {
        const queryParams = new URLSearchParams({
            query: args.query,
            maxResults: args.maxResults.toString(),
            scrapingTool: args.scrapingTool || 'raw-http',
        });

        // Add output formats
        if (args.outputFormats) {
            args.outputFormats.forEach((format) => {
                queryParams.append('outputFormats', format);
            });
        }

        const url = `${this.baseUrl}?${queryParams.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.apiToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to call RAG Web Browser: ${response.statusText}`);
        }

        const responseBody = await response.json();
        return JSON.stringify(responseBody);
    }

    private parseApifyResponse(jsonResponse: string): SearchResult[] {
        try {
            const data = JSON.parse(jsonResponse);
            
            // Si es un array directo de resultados
            if (Array.isArray(data)) {
                return this.formatApifyResults(data);
            }
            
            // Si tiene una estructura con results
            if (data.results && Array.isArray(data.results)) {
                return this.formatApifyResults(data.results);
            }
            
            // Si es un objeto individual
            if (data.title || data.url) {
                return this.formatApifyResults([data]);
            }
            
            return [];
        } catch (error) {
            console.error('Error parsing Apify response:', error);
            return [];
        }
    }

    private formatApifyResults(results: any[]): SearchResult[] {
        return results.map((result: any) => ({
            title: result.title || result.name || 'Untitled',
            url: result.url || result.link || '',
            content: result.text || result.content || '',
            markdown: result.markdown || result.text || result.content || '',
            publishedDate: result.publishedDate || result.date,
            score: result.score || result.rank
        }));
    }
}
