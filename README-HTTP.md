# MCP RAG Web Browser - HTTP Server

Servidor HTTP que expone la funcionalidad del MCP RAG Web Browser como una API REST, permitiendo su consumo desde frameworks de agentes como LangChain, LlamaIndex, etc.

## 🚀 Inicio Rápido

### 1. Configuración

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys
```

### 2. Ejecutar localmente

```bash
# Modo desarrollo
npm run start:http:dev

# Modo producción
npm run build
npm run start:http
```

### 3. Ejecutar con Docker

```bash
# Construir imagen
npm run docker:build

# Ejecutar contenedor
npm run docker:run

# O usar docker-compose
docker-compose up -d
```

## 📋 Variables de Entorno

```env
# Proveedor de búsqueda (tavily o apify)
SEARCH_PROVIDER=tavily

# API Keys (configurar al menos una)
TAVILY_API_KEY=your_tavily_api_key
APIFY_TOKEN=your_apify_token

# Configuración del servidor HTTP
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

## 🔌 API Endpoints

### POST /api/search
Realizar búsqueda web y extracción de contenido.

**Request:**
```json
{
  "query": "artificial intelligence 2024",
  "maxResults": 3,
  "scrapingTool": "raw-http",
  "outputFormats": ["markdown"],
  "requestTimeoutSecs": 40
}
```

**Response:**
```json
{
  "success": true,
  "query": "artificial intelligence 2024",
  "maxResults": 3,
  "totalResults": 3,
  "provider": "tavily",
  "processingTimeMs": 2140,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "results": [
    {
      "title": "AI Developments in 2024",
      "url": "https://example.com/ai-2024",
      "content": "Latest developments in AI...",
      "markdown": "# AI Developments in 2024\n\nLatest developments...",
      "publishedDate": "2024-01-01",
      "score": 0.95
    }
  ]
}
```

### GET /health
Estado del servidor y proveedores disponibles.

### GET /api/info
Documentación completa de la API.

## 🐍 Integración con Python/LangChain

### Cliente Básico

```python
import requests

def search_web(query: str, max_results: int = 1):
    response = requests.post('http://localhost:3000/api/search', json={
        'query': query,
        'maxResults': max_results
    })
    return response.json()

# Usar
results = search_web("Python tutorials", 2)
```

### LangChain Tool

```python
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
import requests

class WebSearchInput(BaseModel):
    query: str = Field(description="Search query")
    max_results: int = Field(default=1, description="Max results")

class MCPWebSearchTool(BaseTool):
    name = "web_search"
    description = "Search web and extract content"
    args_schema = WebSearchInput
    
    def _run(self, query: str, max_results: int = 1) -> str:
        response = requests.post('http://localhost:3000/api/search', json={
            'query': query,
            'maxResults': max_results
        })
        data = response.json()
        
        if not data['success']:
            return f"Error: {data['error']}"
        
        results = []
        for result in data['results']:
            results.append(f"**{result['title']}**\\n{result['markdown'][:500]}")
        
        return "\\n\\n---\\n\\n".join(results)

# Usar con agente
from langchain.agents import initialize_agent
from langchain_openai import ChatOpenAI

tools = [MCPWebSearchTool()]
agent = initialize_agent(tools, ChatOpenAI(), verbose=True)
result = agent.run("What are the latest AI developments?")
```

## 🐋 Docker

### Dockerfile
- Base: `node:18-alpine`
- Puerto: `3000`
- Health check incluido
- Usuario no-root para seguridad

### Docker Compose
- Servicio principal en puerto 3000
- Nginx opcional como reverse proxy
- Health checks configurados
- Red interna para comunicación

### Comandos Docker

```bash
# Construir imagen
docker build -t mcp-rag-web-browser .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env mcp-rag-web-browser

# Con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f mcp-rag-web-browser

# Escalar servicio
docker-compose up -d --scale mcp-rag-web-browser=3
```

## 🔧 Configuración de Producción

### Nginx (incluido en docker-compose)
- Rate limiting (10 req/s)
- Security headers
- Proxy a contenedor principal
- Load balancing ready

### Environment Variables
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your_api_key
```

### Monitoring
```bash
# Health check
curl http://localhost:3000/health

# Metrics endpoint (custom)
curl http://localhost:3000/metrics
```

## 🧪 Testing

### Probar API manualmente
```bash
# Health check
curl http://localhost:3000/health

# Búsqueda simple
curl -X POST http://localhost:3000/api/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "machine learning", "maxResults": 2}'

# Extracción de URL
curl -X POST http://localhost:3000/api/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "https://www.example.com"}'
```

### Cliente Python de prueba
```bash
python test_http_client.py
```

## 🛠️ Desarrollo

### Scripts disponibles
```bash
npm run start:http:dev    # Desarrollo con hot reload
npm run start:http        # Producción
npm run build            # Compilar TypeScript
npm run lint             # Linter
npm run docker:build     # Construir imagen Docker
npm run docker:run       # Ejecutar contenedor
```

### Estructura del proyecto
```
src/
├── http-server.ts       # Servidor HTTP principal
├── server.ts           # Clase MCP original
├── providers/          # Proveedores de búsqueda
│   ├── search-factory.ts
│   ├── tavily-search.ts
│   └── apify-search.ts
└── index.ts            # Entry point MCP stdio

docker-compose.yml      # Configuración Docker Compose
Dockerfile             # Imagen Docker
nginx/
└── nginx.conf         # Configuración Nginx
test_http_client.py    # Cliente de prueba Python
```

## 🔒 Seguridad

- CORS habilitado
- Rate limiting via Nginx
- Headers de seguridad
- Usuario no-root en Docker
- Variables de entorno para secrets
- Health checks para monitoring

## 📈 Performance

- Timeout configurable por request
- Connection pooling en providers
- Compression habilitada
- Cache-friendly headers
- Graceful shutdown

## 🐛 Troubleshooting

### Error: Provider not configured
```bash
# Verificar variables de entorno
echo $TAVILY_API_KEY
echo $SEARCH_PROVIDER

# Verificar health endpoint
curl http://localhost:3000/health
```

### Error: Port already in use
```bash
# Cambiar puerto
PORT=3001 npm run start:http

# O en Docker
docker run -p 3001:3000 mcp-rag-web-browser
```

### Error: Docker build fails
```bash
# Limpiar cache
docker system prune -f

# Rebuild sin cache
docker build --no-cache -t mcp-rag-web-browser .
```
