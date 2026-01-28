import http2 from 'http2';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Client pour communiquer avec l'API VSPC (Veeam Service Provider Console)
 * Utilise HTTP/2 requis par le serveur VSPC OVHcloud sur le port 443
 */
class VSPCClient {
  constructor() {
    this.host = process.env.VSPC_HOST;
    this.port = process.env.VSPC_PORT || 443;
    this.baseUrl = `https://${this.host}:${this.port}`;
    this.basePath = '/api/v3';
    this.accessToken = null;
  }

  /**
   * Effectue une requête HTTP/2
   * @private
   */
  _http2Request(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const client = http2.connect(this.baseUrl, {
        rejectUnauthorized: false,
      });

      client.on('error', (err) => {
        reject(new Error(`HTTP/2 connection error: ${err.message}`));
      });

      const requestHeaders = {
        ':method': method,
        ':path': path,
        ...headers,
      };

      if (body) {
        requestHeaders['content-length'] = Buffer.byteLength(body);
      }

      const req = client.request(requestHeaders);
      let responseData = '';
      let responseHeaders = {};

      req.on('response', (hdrs) => {
        responseHeaders = hdrs;
      });

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', () => {
        client.close();
        resolve({
          status: responseHeaders[':status'],
          headers: responseHeaders,
          body: responseData,
        });
      });

      req.on('error', (err) => {
        client.close();
        reject(new Error(`HTTP/2 request error: ${err.message}`));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  /**
   * Authentifie avec une API Key (méthode recommandée)
   * L'API Key est utilisée directement comme Bearer token sans appeler /token
   * @param {string} apiKey - Clé API VSPC
   * @returns {Promise<string>} La clé API (utilisée comme token)
   */
  async authenticateWithApiKey(apiKey) {
    try {
      // Valider la clé API en faisant une requête test
      this.accessToken = apiKey;
      
      const response = await this._http2Request(
        'GET',
        `${this.basePath}/about/version`,
        {
          'authorization': `Bearer ${apiKey}`,
          'accept': 'application/json',
        }
      );

      if (response.status !== 200) {
        this.accessToken = null;
        let errorMessage = `${response.status}`;
        try {
          const errorData = JSON.parse(response.body);
          errorMessage = errorData.error_description || errorData.error || response.body;
        } catch {
          errorMessage = response.body;
        }
        throw new Error(`Échec de l'authentification VSPC avec API Key: ${errorMessage}`);
      }

      return this.accessToken;
    } catch (error) {
      this.accessToken = null;
      throw new Error(`Erreur lors de l'authentification VSPC: ${error.message}`);
    }
  }

  /**
   * Authentifie l'utilisateur avec nom d'utilisateur et mot de passe
   * @param {string} username - Nom d'utilisateur VSPC
   * @param {string} password - Mot de passe VSPC
   * @returns {Promise<string>} Token d'accès
   */
  async authenticate(username, password) {
    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        username: username,
        password: password,
      }).toString();

      const response = await this._http2Request(
        'POST',
        `${this.basePath}/token`,
        {
          'content-type': 'application/x-www-form-urlencoded',
          'accept': 'application/json',
        },
        body
      );

      if (response.status !== 200) {
        let errorMessage = `${response.status}`;
        try {
          const errorData = JSON.parse(response.body);
          errorMessage = errorData.error_description || errorData.error || response.body;
        } catch {
          errorMessage = response.body;
        }
        throw new Error(`Échec de l'authentification VSPC: ${errorMessage}`);
      }

      const data = JSON.parse(response.body);
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

    let path = `${this.basePath}${endpoint}`;
    
    // Ajouter les paramètres de requête si fournis
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        searchParams.append(key, value);
      });
      path += `?${searchParams.toString()}`;
    }

    const headers = {
      'authorization': `Bearer ${this.accessToken}`,
      'content-type': 'application/json',
      'accept': 'application/json',
      ...options.headers,
    };

    const body = options.body ? JSON.stringify(options.body) : null;

    try {
      const response = await this._http2Request(method, path, headers, body);

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Erreur API VSPC: ${response.status} ${response.body}`);
      }

      // Certaines réponses peuvent être vides
      if (response.body && response.headers['content-type']?.includes('application/json')) {
        return JSON.parse(response.body);
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
