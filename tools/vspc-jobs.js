import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';

/**
 * Outil pour récupérer les jobs de backup VSPC
 */
export default function(server) {
  server.tool(
    'get-backup-jobs',
    {
      limit: z.number().optional().default(50)
        .describe('Nombre maximum de jobs à retourner'),
      offset: z.number().optional().default(0)
        .describe('Nombre de jobs à ignorer (pour la pagination)'),
      status: z.string().optional()
        .describe('Filtrer par statut: Success, Failed, Warning, Running'),
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

        const jobs = await vspcClient.getJobs(filters);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(jobs, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur lors de la récupération des jobs: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
