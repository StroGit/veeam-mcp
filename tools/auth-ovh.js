import { z } from 'zod';
import { ovhClient } from '../lib/ovh-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Outil de vérification de l'authentification OVHcloud
 * Vérifie que les credentials OVH sont correctement configurés
 */
export default function(server) {
  server.tool(
    'auth-ovh',
    {
      appKey: z.string().optional()
        .describe('Clé d\'application OVH (optionnel si défini dans .env)'),
      appSecret: z.string().optional()
        .describe('Secret d\'application OVH (optionnel si défini dans .env)'),
      consumerKey: z.string().optional()
        .describe('Clé consommateur OVH (optionnel si défini dans .env)'),
    },
    async (params) => {
      try {
        // Si des paramètres sont fournis, les utiliser temporairement
        if (params.appKey || params.appSecret || params.consumerKey) {
          const originalAppKey = ovhClient.appKey;
          const originalAppSecret = ovhClient.appSecret;
          const originalConsumerKey = ovhClient.consumerKey;

          if (params.appKey) ovhClient.appKey = params.appKey;
          if (params.appSecret) ovhClient.appSecret = params.appSecret;
          if (params.consumerKey) ovhClient.consumerKey = params.consumerKey;

          try {
            // Tester avec une requête simple (récupération de l'heure)
            await ovhClient.getTimeDelta();
            
            global.ovhAuth = {
              appKey: ovhClient.appKey,
              consumerKey: ovhClient.consumerKey,
            };

            return {
              content: [{
                type: 'text',
                text: '✅ Configuration OVHcloud validée avec succès',
              }],
            };
          } finally {
            // Restaurer les valeurs originales
            ovhClient.appKey = originalAppKey;
            ovhClient.appSecret = originalAppSecret;
            ovhClient.consumerKey = originalConsumerKey;
          }
        }

        // Vérifier que les credentials sont configurés
        if (!ovhClient.appKey || !ovhClient.appSecret || !ovhClient.consumerKey) {
          return {
            content: [{
              type: 'text',
              text: 'Erreur: Les credentials OVH ne sont pas configurés. ' +
                    'Configurez OVH_APP_KEY, OVH_APP_SECRET et OVH_CONSUMER_KEY dans le fichier .env',
            }],
            isError: true,
          };
        }

        // Tester avec une requête simple
        await ovhClient.getTimeDelta();

        global.ovhAuth = {
          appKey: ovhClient.appKey,
          consumerKey: ovhClient.consumerKey,
        };

        return {
          content: [{
            type: 'text',
            text: '✅ Configuration OVHcloud validée avec succès',
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur de configuration OVHcloud: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
