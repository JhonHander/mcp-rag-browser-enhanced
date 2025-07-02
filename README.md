# MCP RAG Browser Enhanced 🚀

Enhanced Model Context Protocol (MCP) server for web search and content extraction with multi-provider support and HTTP API.

## ✨ New Features

- 🔍 **Multi-provider support**: Choose between Tavily and Apify
- 🌐 **HTTP REST API**: Use without MCP protocol for LangChain, etc.
- ⚙️ **Enhanced configuration**: More control over search parameters
- 🐋 **Docker support**: Ready for containerized deployment
- 🛠️ **Better error handling**: Improved debugging and monitoring

## 🎯 What does this MCP server do?

This server provides web search and content extraction capabilities for AI agents and LLMs:
- Perform web search and scrape content from top results
- Extract content from individual URLs
- Return cleaned content as Markdown
- Support for both MCP protocol and HTTP REST API

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- API key for either Tavily or Apify

### Installation

```bash
# Clone repository
git clone https://github.com/JhonHander/mcp-rag-browser-enhanced.git
cd mcp-rag-browser-enhanced

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Build project
npm run build
```

### Configuration

Edit `.env` file:

```env
# Choose your provider (tavily recommended)
SEARCH_PROVIDER=tavily

# Tavily (get free $5 at https://tavily.com)
TAVILY_API_KEY=your_tavily_key_here

# Apify (get free $5 at https://console.apify.com)
APIFY_TOKEN=your_apify_token_here

# HTTP Server (optional)
PORT=3000
HOST=0.0.0.0
```

### Test Configuration

```bash
npm test
```

## 🔧 Usage Options

### Option 1: MCP with Claude Desktop

Configure Claude Desktop (`%APPDATA%/Claude/claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "rag-web-browser": {
      "command": "node",
      "args": ["C:/path/to/your/project/dist/index.js"],
      "env": {
        "SEARCH_PROVIDER": "tavily",
        "TAVILY_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Then ask Claude:
```
"Search for the latest AI developments"
"Find information about Python best practices"
"Extract content from https://example.com"
```

### Option 2: HTTP REST API

Start HTTP server:
```bash
npm run start:http
```

Use with Python/LangChain:
```python
import requests

# Simple search
response = requests.post('http://localhost:3000/api/search', json={
    'query': 'artificial intelligence',
    'maxResults': 3
})

results = response.json()
```

### Option 3: Docker

```bash
# Build and run
npm run docker:build
npm run docker:run

# Or with docker-compose
docker-compose up -d
```

## 🔍 API Reference

### MCP Tools

#### `search` tool
- **query** (string): Search keywords or URL
- **maxResults** (number): Number of results (1-100, default: 1)
- **scrapingTool** (string): 'raw-http' or 'browser-playwright'
- **outputFormats** (array): ['text', 'markdown', 'html']
- **requestTimeoutSecs** (number): Timeout in seconds (1-300)

### HTTP API Endpoints

#### `POST /api/search`
Search web and extract content:

```json
{
  "query": "machine learning tutorials",
  "maxResults": 3,
  "scrapingTool": "raw-http",
  "outputFormats": ["markdown"]
}
```

#### `GET /health`
Check server status and available providers

#### `GET /api/info`
Complete API documentation

## 🔄 Providers Comparison

| Feature | Tavily | Apify |
|---------|--------|-------|
| Free credits | $5 USD | $5 USD |
| Searches approx. | ~1,000 | ~2,000 (standby) |
| Setup complexity | Simple | Moderate |
| AI optimized | ✅ Yes | ✅ Yes |
| Speed | Fast | Very fast (standby) |

**Recommendation**: Start with **Tavily** for simplicity, use **Apify** for high volume.

## 🐍 Integration Examples

### LangChain Tool

```python
from langchain.tools import BaseTool
import requests

class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Search web and extract content"
    
    def _run(self, query: str) -> str:
        response = requests.post('http://localhost:3000/api/search', 
            json={'query': query, 'maxResults': 3})
        
        data = response.json()
        if not data['success']:
            return f"Error: {data['error']}"
        
        results = []
        for result in data['results']:
            results.append(f"**{result['title']}**\n{result['markdown'][:500]}")
        
        return "\n\n---\n\n".join(results)

# Use with agent
from langchain.agents import initialize_agent
from langchain_openai import ChatOpenAI

tools = [WebSearchTool()]
agent = initialize_agent(tools, ChatOpenAI(), verbose=True)
result = agent.run("What are the latest AI developments?")
```

### LlamaIndex Integration

```python
from llama_index.tools import FunctionTool
import requests

def web_search_tool(query: str, max_results: int = 3) -> str:
    """Search web and return content."""
    response = requests.post('http://localhost:3000/api/search', json={
        'query': query,
        'maxResults': max_results
    })
    
    data = response.json()
    return f"Found {len(data['results'])} results: " + \
           "\n\n".join([r['markdown'] for r in data['results']])

tool = FunctionTool.from_defaults(fn=web_search_tool)
```

## 🐋 Docker Deployment

### Single Container
```bash
docker build -t mcp-rag-browser .
docker run -p 3000:3000 --env-file .env mcp-rag-browser
```

### Docker Compose (with Nginx)
```bash
docker-compose up -d
```

Includes:
- Main service on port 3000
- Nginx reverse proxy with rate limiting
- Health checks and auto-restart

## 🛠️ Development

### Available Scripts
```bash
npm run start:dev        # MCP server development
npm run start:http:dev   # HTTP server development  
npm run build           # Build TypeScript
npm run test            # Test search providers
npm run lint            # Code linting
npm run inspector       # MCP Inspector for debugging
```

### Project Structure
```
src/
├── index.ts              # MCP entry point
├── server.ts            # MCP server logic
├── http-server.ts       # HTTP REST API
├── providers/           # Search provider implementations
│   ├── base-search.ts   # Common interfaces
│   ├── tavily-search.ts # Tavily implementation
│   ├── apify-search.ts  # Apify implementation
│   └── search-factory.ts # Provider factory
└── test-search.ts       # Test utilities

docker-compose.yml       # Docker orchestration
Dockerfile              # Container definition
nginx/                  # Nginx configuration
```

## 🔒 Security & Production

- CORS enabled for HTTP API
- Rate limiting via Nginx
- Environment variables for secrets
- Health checks for monitoring
- Graceful shutdown handling
- Non-root Docker user

## 🐛 Troubleshooting

### Common Issues

**No providers configured**
```bash
# Check environment variables
echo $TAVILY_API_KEY
echo $SEARCH_PROVIDER

# Test configuration
npm test
```

**MCP connection issues**
```bash
# Debug with MCP Inspector
npm run inspector

# Check Claude Desktop config
cat "%APPDATA%/Claude/claude_desktop_config.json"
```

**HTTP server issues**
```bash
# Check health endpoint
curl http://localhost:3000/health

# View server logs
npm run start:http:dev
```

## 📄 License

MIT License - Same as original project

## 🙏 Credits

Based on [mcp-server-rag-web-browser](https://github.com/apify/mcp-server-rag-web-browser) by Apify.

Enhanced with multi-provider support and HTTP API by [JhonHander](https://github.com/JhonHander).

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- 🐛 [Report bugs](https://github.com/JhonHander/mcp-rag-browser-enhanced/issues)
- 💡 [Request features](https://github.com/JhonHander/mcp-rag-browser-enhanced/issues)
- 📖 [Documentation](https://github.com/JhonHander/mcp-rag-browser-enhanced/wiki)
