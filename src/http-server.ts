#!/usr/bin/env node

/**
 * HTTP Server wrapper for MCP RAG Web Browser
 * Provides REST API endpoints to consume the MCP functionality from agents like LangChain
 */

import express from 'express';
import { SearchProviderFactory, type SearchProviderType } from './providers/search-factory.js';
import { z } from 'zod';
import type { SearchProvider } from './providers/base-search.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Schema de validación para HTTP requests
const WebSearchRequestSchema = z.object({
    query: z.string()
        .min(1, 'Query cannot be empty')
        .describe('Search query or URL'),
    maxResults: z.number()
        .int()
        .positive()
        .min(1)
        .max(100)
        .default(1)
        .optional()
        .describe('Maximum number of results (1-100)'),
    scrapingTool: z.enum(['browser-playwright', 'raw-http'])
        .default('raw-http')
        .optional()
        .describe('Scraping tool to use'),
    outputFormats: z.array(z.enum(['text', 'markdown', 'html']))
        .default(['markdown'])
        .optional()
        .describe('Output formats'),
    requestTimeoutSecs: z.number()
        .int()
        .min(1)
        .max(300)
        .default(40)
        .optional()
        .describe('Request timeout in seconds'),
});

// Initialize search provider
let searchProvider: SearchProvider;
let providerType: SearchProviderType;

try {
    providerType = SearchProviderFactory.getConfiguredProviderType();
    searchProvider = SearchProviderFactory.createProvider(providerType);
    console.log(`🔍 Initialized search provider: ${providerType}`);
} catch (error) {
    console.error('❌ Failed to initialize search provider:', error);
    process.exit(1);
}

/**
 * Main search endpoint
 */
app.post('/api/search', async (req, res): Promise<void> => {
    const startTime = Date.now();
    
    try {
        // Validate request body
        const validation = WebSearchRequestSchema.safeParse(req.body);
        
        if (!validation.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid request parameters',
                details: validation.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }))
            });
            return;
        }

        const args = validation.data;
        
        console.log(`🔍 Searching for: "${args.query}" (maxResults: ${args.maxResults})`);

        // Perform search using the same logic as MCP server
        const results = await searchProvider.searchWeb(args.query, args.maxResults || 1);
        
        const processingTime = Date.now() - startTime;
        
        // Format response
        const response = {
            success: true,
            query: args.query,
            maxResults: args.maxResults || 1,
            totalResults: results.length,
            provider: providerType,
            processingTimeMs: processingTime,
            timestamp: new Date().toISOString(),
            results: results.map(result => ({
                title: result.title,
                url: result.url,
                content: result.content,
                markdown: result.markdown,
                publishedDate: result.publishedDate,
                score: result.score
            }))
        };

        console.log(`✅ Search completed in ${processingTime}ms, found ${results.length} results`);
        res.json(response);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('❌ Search error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            processingTimeMs: processingTime,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
    try {
        const availableProviders = SearchProviderFactory.getAvailableProviders();
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            activeProvider: providerType,
            availableProviders: availableProviders.map(p => ({
                type: p.type,
                available: p.available,
                configured: p.available ? '✅' : '❌'
            })),
            server: {
                mode: 'HTTP',
                version: '1.0.0',
                uptime: process.uptime()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * API information endpoint
 */
app.get('/api/info', (_req, res) => {
    res.json({
        name: 'MCP RAG Web Browser HTTP API',
        version: '1.0.0',
        description: 'HTTP wrapper for MCP server rag-web-browser',
        provider: providerType,
        endpoints: [
            {
                path: '/api/search',
                method: 'POST',
                description: 'Perform web search and content extraction',
                parameters: {
                    query: {
                        type: 'string',
                        required: true,
                        description: 'Search query or URL to process'
                    },
                    maxResults: {
                        type: 'number',
                        required: false,
                        default: 1,
                        min: 1,
                        max: 100,
                        description: 'Maximum number of results to return'
                    },
                    scrapingTool: {
                        type: 'string',
                        required: false,
                        enum: ['browser-playwright', 'raw-http'],
                        default: 'raw-http',
                        description: 'Tool to use for web scraping'
                    },
                    outputFormats: {
                        type: 'array',
                        required: false,
                        items: ['text', 'markdown', 'html'],
                        default: ['markdown'],
                        description: 'Output formats for extracted content'
                    },
                    requestTimeoutSecs: {
                        type: 'number',
                        required: false,
                        default: 40,
                        min: 1,
                        max: 300,
                        description: 'Request timeout in seconds'
                    }
                }
            },
            {
                path: '/health',
                method: 'GET',
                description: 'Health check and provider status'
            },
            {
                path: '/api/info',
                method: 'GET',
                description: 'API documentation and endpoint information'
            }
        ],
        examples: {
            simpleSearch: {
                url: '/api/search',
                method: 'POST',
                body: {
                    query: 'artificial intelligence latest news',
                    maxResults: 3
                }
            },
            urlExtraction: {
                url: '/api/search',
                method: 'POST',
                body: {
                    query: 'https://www.example.com/article',
                    outputFormats: ['markdown', 'text']
                }
            }
        }
    });
});

/**
 * Root endpoint
 */
app.get('/', (_req, res) => {
    res.json({
        message: 'MCP RAG Web Browser HTTP Server',
        version: '1.0.0',
        provider: providerType,
        documentation: '/api/info',
        health: '/health'
    });
});

/**
 * 404 handler
 */
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/info',
            'POST /api/search'
        ]
    });
});

/**
 * Error handler
 */
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Unhandled error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Server configuration
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 MCP RAG Web Browser HTTP Server`);
    console.log(`📍 Running on: http://${HOST}:${PORT}`);
    console.log(`🔍 Provider: ${providerType}`);
    console.log(`📖 API docs: http://${HOST}:${PORT}/api/info`);
    console.log(`❤️  Health check: http://${HOST}:${PORT}/health`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
});

export default app;
