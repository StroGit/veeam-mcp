import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Outil d'authentification VSPC
 * Permet de se connecter à la VSPC avec une API Key (recommandé) ou username/password
 */
export default function(server) {
  server.tool(
    'auth-vspc',
    {
      apiKey: z.string().optional()
        .describe('Clé API VSPC (optionnel si défini dans .env comme VSPC_KEY)'),
      username: z.string().optional()
        .describe('Nom d\'utilisateur VSPC (optionnel si défini dans .env)'),
      password: z.string().optional()
        .describe('Mot de passe VSPC (optionnel si défini dans .env)'),
    },
    async (params) => {
      try {
        // Priorité à l'API Key si disponible
        const apiKey = params.apiKey || process.env.VSPC_KEY;
        
        if (apiKey) {
          // Authentification par API Key (méthode recommandée)
          const token = await vspcClient.authenticateWithApiKey(apiKey);
          const username = params.username || process.env.VSPC_USERNAME || 'API Key User';
          global.vspcAuth = { username, token, method: 'apiKey' };

          return {
            content: [{
              type: 'text',
              text: `✅ Authentification VSPC réussie avec API Key`,
            }],
          };
        }

        // Fallback sur username/password
        const username = params.username || process.env.VSPC_USERNAME;
        const password = params.password || process.env.VSPC_PASSWORD;

        if (!username || !password) {
          return {
            content: [{
              type: 'text',
              text: 'Erreur: API Key ou nom d\'utilisateur/mot de passe requis. ' +
                    'Configurez VSPC_KEY ou VSPC_USERNAME/VSPC_PASSWORD dans le fichier .env',
            }],
            isError: true,
          };
        }

        const token = await vspcClient.authenticate(username, password);
        global.vspcAuth = { username, token, method: 'password' };

        return {
          content: [{
            type: 'text',
            text: `✅ Authentification VSPC réussie pour l'utilisateur "${username}"`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Erreur d'authentification VSPC: ${error.message}`,
          }],
          isError: true,
        };
      }
    }
  );
}
