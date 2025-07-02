#!/usr/bin/env node

/**
 * Test script to verify the search providers work correctly
 */

import { config } from 'dotenv';
import { SearchProviderFactory } from './providers/search-factory.js';

// Load environment variables from .env file
config();

async function testSearchProviders() {
    console.log('🔍 Testing Search Providers...\n');

    // Show available providers
    const providers = SearchProviderFactory.getAvailableProviders();
    console.log('📋 Available providers:');
    providers.forEach(provider => {
        console.log(`  - ${provider.type}: ${provider.available ? '✅ Available' : `❌ Not available (${provider.reason})`}`);
    });
    console.log();

    // Test the configured provider
    try {
        const providerType = SearchProviderFactory.getConfiguredProviderType();
        console.log(`🚀 Testing configured provider: ${providerType}\n`);

        const searchProvider = SearchProviderFactory.createProvider(providerType);
        
        console.log('🔍 Performing test search: "what is artificial intelligence"');
        const results = await searchProvider.searchWeb("what is artificial intelligence", 2);
        
        console.log(`\n✅ Search completed! Found ${results.length} results:\n`);
        
        results.forEach((result, index) => {
            console.log(`Result ${index + 1}:`);
            console.log(`  Title: ${result.title}`);
            console.log(`  URL: ${result.url}`);
            console.log(`  Content Preview: ${result.content.substring(0, 200)}...`);
            console.log(`  Has Markdown: ${result.markdown.length > 0 ? 'Yes' : 'No'}`);
            if (result.score) console.log(`  Score: ${result.score}`);
            console.log();
        });

    } catch (error) {
        console.error('❌ Test failed:', error instanceof Error ? error.message : error);
        console.log('\n💡 Make sure to:');
        console.log('  1. Set your API key in the .env file');
        console.log('  2. Choose a valid provider (apify or tavily)');
        console.log('  3. Check your internet connection');
    }
}

// Run the test
testSearchProviders().catch(console.error);
