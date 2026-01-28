import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';

/**
 * Outil pour récupérer le rapport d'utilisation VSPC
 */
export default function(server) {
  server.tool(
    'get-usage-report',
    {},
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

        const report = await vspcClient.getUsageReport();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(report, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur lors de la récupération du rapport d'utilisation: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
