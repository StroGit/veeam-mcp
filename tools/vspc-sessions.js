import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';

/**
 * Outil pour récupérer les sessions de backup VSPC
 */
export default function(server) {
  server.tool(
    'get-backup-sessions',
    {
      limit: z.number().optional().default(50)
        .describe('Nombre maximum de sessions à retourner'),
      offset: z.number().optional().default(0)
        .describe('Nombre de sessions à ignorer (pour la pagination)'),
      status: z.string().optional()
        .describe('Filtrer par statut: Success, Failed, Warning, Running'),
      startTime: z.string().optional()
        .describe('Date de début au format ISO (ex: 2024-01-01T00:00:00Z)'),
      endTime: z.string().optional()
        .describe('Date de fin au format ISO (ex: 2024-01-31T23:59:59Z)'),
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
        if (params.startTime) filters.startTime = params.startTime;
        if (params.endTime) filters.endTime = params.endTime;

        const sessions = await vspcClient.getSessions(filters);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(sessions, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur lors de la récupération des sessions: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
