#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Stockage global pour l'authentification
global.vspcAuth = null;
global.ovhAuth = null;

/**
 * Serveur MCP pour gérer les backups OVHcloud et VSPC Veeam
 */
class OVHBackupMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'ovhcloud-backup-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupErrorHandling();
    this.setupToolHandlers();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Charge dynamiquement tous les outils du dossier tools/
   */
  async setupToolHandlers() {
    const toolsDir = join(__dirname, 'tools');
    
    try {
      const files = await readdir(toolsDir);
      const toolFiles = files.filter(file => file.endsWith('.js'));

      for (const file of toolFiles) {
        try {
          const toolModule = await import(`file://${join(toolsDir, file)}`);
          if (toolModule.default && typeof toolModule.default === 'function') {
            toolModule.default(this.server);
            console.error(`[MCP] Outil chargé: ${file}`);
          }
        } catch (error) {
          console.error(`[MCP] Erreur lors du chargement de ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('[MCP] Erreur lors de la lecture du dossier tools:', error);
    }

    // Handler pour lister les outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.server.listTools(),
      };
    });

    // Handler pour appeler les outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const tool = this.server.getTool(name);
        if (!tool) {
          return {
            content: [
              {
                type: 'text',
                text: `Outil "${name}" non trouvé.`,
              },
            ],
            isError: true,
          };
        }

        const result = await tool.handler(args || {});
        return result;
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur lors de l'exécution de l'outil "${name}": ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[MCP] Serveur OVHcloud Backup Agent démarré');
  }
}

// Démarrer le serveur
const server = new OVHBackupMCPServer();
server.run().catch(console.error);
