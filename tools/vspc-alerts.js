import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';

/**
 * Outil pour récupérer les alertes actives VSPC
 */
export default function(server) {
  server.tool(
    'get-active-alerts',
    {
      limit: z.number().optional().default(50)
        .describe('Nombre maximum d\'alertes à retourner'),
      offset: z.number().optional().default(0)
        .describe('Nombre d\'alertes à ignorer (pour la pagination)'),
      severity: z.string().optional()
        .describe('Filtrer par sévérité: Critical, Warning, Info'),
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
        if (params.severity) filters.severity = params.severity;

        const alerts = await vspcClient.getActiveAlerts(filters);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(alerts, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur lors de la récupération des alertes: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
