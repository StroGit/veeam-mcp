import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';

/**
 * Outil pour récupérer les agents gérés VSPC
 */
export default function(server) {
  server.tool(
    'get-managed-agents',
    {
      limit: z.number().optional().default(50)
        .describe('Nombre maximum d\'agents à retourner'),
      offset: z.number().optional().default(0)
        .describe('Nombre d\'agents à ignorer (pour la pagination)'),
      status: z.string().optional()
        .describe('Filtrer par statut: Online, Offline, Unknown'),
    },
    async (params) => {
      try {
        if (!global.vspcAuth) {
          return {
            content: [{
              type: 'text',
              text: '❌ Non authentifié. Utilisez l\'outil auth-vspc d\'abord.',
            }],
            isError: true,
          };
        }

        const filters = {};
        if (params.limit) filters.limit = params.limit;
        if (params.offset) filters.offset = params.offset;
        if (params.status) filters.status = params.status;

        const agents = await vspcClient.getManagedAgents(filters);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(agents, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur lors de la récupération des agents: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
