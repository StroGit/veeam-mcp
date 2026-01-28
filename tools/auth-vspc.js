import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Outil d'authentification VSPC
 * Permet de se connecter à la VSPC avec un nom d'utilisateur et un mot de passe
 */
export default function(server) {
  server.tool(
    'auth-vspc',
    {
      username: z.string().optional()
        .describe('Nom d\'utilisateur VSPC (optionnel si défini dans .env)'),
      password: z.string().optional()
        .describe('Mot de passe VSPC (optionnel si défini dans .env)'),
    },
    async (params) => {
      try {
        const username = params.username || process.env.VSPC_USERNAME;
        const password = params.password || process.env.VSPC_PASSWORD;

        if (!username || !password) {
          return {
            content: [{
              type: 'text',
              text: 'Erreur: Nom d\'utilisateur et mot de passe requis. ' +
                    'Fournissez-les en paramètres ou configurez-les dans le fichier .env',
            }],
            isError: true,
          };
        }

        const token = await vspcClient.authenticate(username, password);
        global.vspcAuth = { username, token };

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
