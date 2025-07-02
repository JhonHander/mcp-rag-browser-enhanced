/**
 * Search Provider Factory
 * Creates the appropriate search provider based on configuration
 */

import type { SearchProvider } from './base-search.js';
import { ApifySearchProvider } from './apify-search.js';
import { TavilySearchProvider } from './tavily-search.js';

export type SearchProviderType = 'apify' | 'tavily';

export class SearchProviderFactory {
    static createProvider(providerType: SearchProviderType): SearchProvider {
        switch (providerType) {
            case 'tavily':
                return this.createTavilyProvider();
            case 'apify':
            default:
                return this.createApifyProvider();
        }
    }

    private static createTavilyProvider(): TavilySearchProvider {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            throw new Error(
                'TAVILY_API_KEY is required but not set. ' +
                'Please set it in your environment variables or .env file. ' +
                'Get your API key from: https://tavily.com'
            );
        }
        return new TavilySearchProvider(apiKey);
    }

    private static createApifyProvider(): ApifySearchProvider {
        const apiToken = process.env.APIFY_TOKEN;
        if (!apiToken) {
            throw new Error(
                'APIFY_TOKEN is required but not set. ' +
                'Please set it in your environment variables or .env file. ' +
                'Get your API token from: https://console.apify.com/account/integrations'
            );
        }
        return new ApifySearchProvider(apiToken);
    }

    static getAvailableProviders(): { type: SearchProviderType; available: boolean; reason?: string }[] {
        return [
            {
                type: 'tavily',
                available: !!process.env.TAVILY_API_KEY,
                reason: !process.env.TAVILY_API_KEY ? 'TAVILY_API_KEY not set' : undefined
            },
            {
                type: 'apify',
                available: !!process.env.APIFY_TOKEN,
                reason: !process.env.APIFY_TOKEN ? 'APIFY_TOKEN not set' : undefined
            }
        ];
    }

    static getConfiguredProviderType(): SearchProviderType {
        const configuredProvider = process.env.SEARCH_PROVIDER?.toLowerCase() as SearchProviderType;
        
        // Validar que el proveedor configurado está disponible
        if (configuredProvider) {
            const providers = this.getAvailableProviders();
            const providerInfo = providers.find(p => p.type === configuredProvider);
            
            if (providerInfo?.available) {
                return configuredProvider;
            } else {
                console.warn(`Configured provider '${configuredProvider}' is not available: ${providerInfo?.reason}`);
            }
        }

        // Fallback automático al primer proveedor disponible
        const availableProviders = this.getAvailableProviders().filter(p => p.available);
        
        if (availableProviders.length === 0) {
            throw new Error(
                'No search providers are configured. Please set either TAVILY_API_KEY or APIFY_TOKEN in your environment variables.'
            );
        }

        const fallbackProvider = availableProviders[0];
        console.log(`Using fallback provider: ${fallbackProvider.type}`);
        return fallbackProvider.type;
    }
}
