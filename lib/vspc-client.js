import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Client pour communiquer avec l'API VSPC (Veeam Service Provider Console)
 */
class VSPCClient {
  constructor() {
    this.baseUrl = `https://${process.env.VSPC_HOST}:${process.env.VSPC_PORT}/api/v3`;
    this.accessToken = null;
  }

  /**
   * Authentifie l'utilisateur et obtient un token d'accès
   * @param {string} username - Nom d'utilisateur VSPC
   * @param {string} password - Mot de passe VSPC
   * @returns {Promise<string>} Token d'accès
   */
  async authenticate(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: username,
          password: password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Échec de l'authentification VSPC: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      return this.accessToken;
    } catch (error) {
      throw new Error(`Erreur lors de l'authentification VSPC: ${error.message}`);
    }
  }

  /**
   * Effectue une requête authentifiée vers l'API VSPC
   * @param {string} method - Méthode HTTP (GET, POST, etc.)
   * @param {string} endpoint - Endpoint API (ex: /sessions)
   * @param {object} options - Options supplémentaires (body, query params, etc.)
   * @returns {Promise<object>} Réponse de l'API
   */
  async request(method, endpoint, options = {}) {
    if (!this.accessToken) {
      throw new Error('Non authentifié. Appelez authenticate() d\'abord.');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Ajouter les paramètres de requête si fournis
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url.toString(), fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API VSPC: ${response.status} ${errorText}`);
      }

      // Certaines réponses peuvent être vides
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { success: true };
    } catch (error) {
      throw new Error(`Erreur lors de la requête VSPC: ${error.message}`);
    }
  }

  /**
   * Récupère les sessions de backup
   * @param {object} filters - Filtres optionnels (limit, offset, status, etc.)
   * @returns {Promise<object>} Liste des sessions
   */
  async getSessions(filters = {}) {
    return this.request('GET', '/sessions', { params: filters });
  }

  /**
   * Récupère les jobs de backup
   * @param {object} filters - Filtres optionnels (limit, offset, status, etc.)
   * @returns {Promise<object>} Liste des jobs
   */
  async getJobs(filters = {}) {
    return this.request('GET', '/infrastructure/backupServers/jobs', { params: filters });
  }

  /**
   * Récupère les alertes actives
   * @param {object} filters - Filtres optionnels
   * @returns {Promise<object>} Liste des alertes
   */
  async getActiveAlerts(filters = {}) {
    return this.request('GET', '/alarms/active', { params: filters });
  }

  /**
   * Récupère les agents gérés
   * @param {object} filters - Filtres optionnels
   * @returns {Promise<object>} Liste des agents
   */
  async getManagedAgents(filters = {}) {
    return this.request('GET', '/infrastructure/managedAgents', { params: filters });
  }

  /**
   * Récupère le rapport d'utilisation le plus récent
   * @returns {Promise<object>} Rapport d'utilisation
   */
  async getUsageReport() {
    return this.request('GET', '/licensing/reports/latest');
  }
}

// Exporte une instance singleton
export const vspcClient = new VSPCClient();
