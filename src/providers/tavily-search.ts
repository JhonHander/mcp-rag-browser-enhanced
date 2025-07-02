/**
 * Tavily Search Provider for MCP RAG Web Browser
 * Provides web search and content extraction using Tavily API
 */

import type { SearchProvider, SearchResult } from './base-search.js';

interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    raw_content?: string;
    published_date?: string;
    score?: number;
}

interface TavilyResponse {
    answer: string;
    query: string;
    response_time: number;
    images: string[];
    results: TavilySearchResult[];
    follow_up_questions?: string[];
}

export class TavilySearchProvider implements SearchProvider {
    private apiKey: string;
    private baseUrl = 'https://api.tavily.com';

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Tavily API key is required');
        }
        this.apiKey = apiKey;
    }

    async searchWeb(
        query: string,
        maxResults: number = 5,
        searchDepth: 'basic' | 'advanced' = 'advanced'
    ): Promise<SearchResult[]> {
        try {
            const requestBody = {
                api_key: this.apiKey,
                query: query,
                search_depth: searchDepth,
                include_answer: true,
                include_raw_content: true,
                max_results: maxResults,
                include_domains: [],
                exclude_domains: ['facebook.com', 'twitter.com', 'instagram.com'] // Excluir redes sociales por defecto
            };

            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as TavilyResponse;
            return this.formatResults(data.results);
        } catch (error) {
            console.error('Tavily search error:', error);
            throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private formatResults(results: TavilySearchResult[]): SearchResult[] {
        return results.map((result) => ({
            title: result.title || 'Untitled',
            url: result.url,
            content: result.content || '',
            markdown: this.htmlToMarkdown(result.raw_content || result.content || ''),
            publishedDate: result.published_date,
            score: result.score
        }));
    }

    private htmlToMarkdown(html: string): string {
        if (!html) return '';

        // Conversión básica HTML a Markdown
        let markdown = html
            // Encabezados
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            
            // Párrafos
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            
            // Enlaces
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            
            // Texto en negrita
            .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
            
            // Texto en cursiva
            .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
            
            // Listas
            .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match, content) => {
                const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
                return `${items}\n`;
            })
            .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match, content) => {
                let counter = 1;
                const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
                return `${items}\n`;
            })
            
            // Saltos de línea
            .replace(/<br[^>]*\/?>/gi, '\n')
            
            // Remover comentarios HTML
            .replace(/<!--[\s\S]*?-->/g, '')
            
            // Remover scripts y styles
            .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, '')
            
            // Remover todos los otros tags HTML
            .replace(/<[^>]*>/g, '')
            
            // Limpiar espacios extra
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/^\s+|\s+$/g, '');

        return markdown;
    }

    async getQuickAnswer(query: string): Promise<string> {
        try {
            const requestBody = {
                api_key: this.apiKey,
                query: query,
                search_depth: 'basic',
                include_answer: true,
                include_raw_content: false,
                max_results: 3
            };

            const response = await fetch(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.status}`);
            }

            const data = await response.json() as TavilyResponse;
            return data.answer || 'No answer available';
        } catch (error) {
            throw new Error(`Tavily quick answer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
