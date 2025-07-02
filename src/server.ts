#!/usr/bin/env node

/**
 * MCP server that allows to call various web search providers (Apify, Tavily)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SearchProviderFactory } from './providers/search-factory.js';
import type { SearchProvider } from './providers/base-search.js';


const MAX_RESULTS = 1;
const TOOL_SEARCH = 'search';

const WebBrowserArgsSchema = z.object({
    query: z.string()
        .describe('Enter Google Search keywords or a URL of a specific web page. The keywords might include the'
            + 'advanced search operators. Examples: "san francisco weather", "https://www.cnn.com", '
            + '"function calling site:openai.com"')
        .regex(/[^\s]+/, { message: "Search term or URL cannot be empty" }),
    maxResults: z.number().int().positive().min(1).max(100).default(MAX_RESULTS)
        .describe(
            'The maximum number of top organic Google Search results whose web pages will be extracted. '
            + 'If query is a URL, then this field is ignored and the Actor only fetches the specific web page.',
        ),
    scrapingTool: z.enum(['browser-playwright', 'raw-http'])
        .describe('Select a scraping tool for extracting the target web pages. '
        + 'The Browser tool is more powerful and can handle JavaScript heavy websites, while the '
        + 'Plain HTML tool can not handle JavaScript but is about two times faster.')
        .default('raw-http')
        .optional(),
    outputFormats: z.array(z.enum(['text', 'markdown', 'html']))
        .describe('Select one or more formats to which the target web pages will be extracted.')
        .default(['markdown'])
        .optional(),
    requestTimeoutSecs: z.number().int().min(1).max(300).default(40)
        .describe('The maximum time in seconds available for the request, including querying Google Search '
            + 'and scraping the target web pages.')
        .optional(),
});

/**
 * Create an MCP server with a tool to call various web search providers
 */
export class RagWebBrowserServer {
    private server: Server;
    private searchProvider: SearchProvider;

    constructor() {
        // Initialize search provider based on configuration
        const providerType = SearchProviderFactory.getConfiguredProviderType();
        this.searchProvider = SearchProviderFactory.createProvider(providerType);
        
        console.log(`Using search provider: ${providerType}`);

        this.server = new Server(
            {
                name: 'mcp-server-rag-web-browser',
                version: '0.1.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            },
        );
        this.setupErrorHandling();
        this.setupToolHandlers();
    }

    private async performWebSearch(args: z.infer<typeof WebBrowserArgsSchema>): Promise<string> {
        try {
            const results = await this.searchProvider.searchWeb(args.query, args.maxResults);
            
            // Format results for MCP response
            const formattedResults = {
                query: args.query,
                maxResults: args.maxResults,
                totalResults: results.length,
                results: results.map(result => ({
                    title: result.title,
                    url: result.url,
                    content: result.content,
                    markdown: result.markdown,
                    publishedDate: result.publishedDate,
                    score: result.score
                }))
            };

            return JSON.stringify(formattedResults, null, 2);
        } catch (error) {
            console.error('Search error:', error);
            throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private setupErrorHandling(): void {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error); // eslint-disable-line no-console
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    private setupToolHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const availableProviders = SearchProviderFactory.getAvailableProviders();
            const activeProvider = SearchProviderFactory.getConfiguredProviderType();
            
            return {
                tools: [
                    {
                        name: TOOL_SEARCH,
                        description: `Search the web and return crawled web pages as text or Markdown. ` +
                            `Currently using: ${activeProvider}. ` +
                            `Available providers: ${availableProviders.map(p => `${p.type}${p.available ? '' : ' (not configured)'}`).join(', ')}`,
                        inputSchema: zodToJsonSchema(WebBrowserArgsSchema),
                    },
                ],
            };
        });
        
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            switch (name) {
                case TOOL_SEARCH: {
                    try {
                        const parsed = WebBrowserArgsSchema.parse(args);
                        const content = await this.performWebSearch(parsed);
                        return {
                            content: [{ type: 'text', text: content }],
                        };
                    } catch (error) {
                        console.error('[MCP Error]', error);
                        throw new Error(`Failed to perform web search: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }
                default: {
                    throw new Error(`Unknown tool: ${name}`);
                }
            }
        });
    }

    async connect(transport: Transport): Promise<void> {
        await this.server.connect(transport);
    }
}
