import { z } from 'zod';
import { ovhClient } from '../lib/ovh-client.js';

/**
 * Outil pour récupérer les services backup OVHcloud
 */
export default function(server) {
  server.tool(
    'get-ovh-services',
    {
      serviceName: z.string().optional()
        .describe('Nom d\'un service spécifique pour obtenir ses détails'),
    },
    async (params) => {
      try {
        if (!global.ovhAuth) {
          return {
            content: [{
              type: 'text',
              text: '❌ Configuration OVH non validée. Utilisez l\'outil auth-ovh d\'abord.',
            }],
            isError: true,
          };
        }

        if (params.serviceName) {
          // Récupérer les détails d'un service spécifique
          const details = await ovhClient.getBackupServiceDetails(params.serviceName);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(details, null, 2),
            }],
          };
        } else {
          // Lister tous les services
          const services = await ovhClient.getBackupServices();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(services, null, 2),
            }],
          };
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur lors de la récupération des services OVHcloud: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
