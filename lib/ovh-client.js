import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Client pour communiquer avec l'API OVHcloud
 */
class OVHClient {
  constructor() {
    this.endpoint = process.env.OVH_ENDPOINT || 'ovh-eu';
    this.baseUrl = `https://${this.endpoint === 'ovh-eu' ? 'eu.api.ovh.com' : 'api.ovh.com'}/v2`;
    this.appKey = process.env.OVH_APP_KEY;
    this.appSecret = process.env.OVH_APP_SECRET;
    this.consumerKey = process.env.OVH_CONSUMER_KEY;
    this.timeDelta = null;
  }

  /**
   * Synchronise l'horloge avec le serveur OVH pour calculer le delta de temps
   * @returns {Promise<number>} Delta de temps en secondes
   */
  async getTimeDelta() {
    if (this.timeDelta !== null) {
      return this.timeDelta;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/time`);
      const serverTime = parseInt(await response.text());
      const localTime = Math.floor(Date.now() / 1000);
      this.timeDelta = serverTime - localTime;
      return this.timeDelta;
    } catch (error) {
      // En cas d'erreur, on assume que le delta est 0
      this.timeDelta = 0;
      return 0;
    }
  }

  /**
   * Calcule la signature OVH pour une requête
   * @param {string} method - Méthode HTTP
   * @param {string} url - URL complète de la requête
   * @param {string} body - Corps de la requête (JSON stringifié ou vide)
   * @param {number} timestamp - Timestamp Unix
   * @returns {string} Signature calculée
   */
  sign(method, url, body, timestamp) {
    const signature = [
      this.appSecret,
      this.consumerKey,
      method,
      url,
      body || '',
      timestamp.toString(),
    ].join('+');

    return '$1$' + crypto.createHash('sha1').update(signature).digest('hex');
  }

  /**
   * Effectue une requête authentifiée vers l'API OVHcloud
   * @param {string} method - Méthode HTTP (GET, POST, etc.)
   * @param {string} path - Chemin de l'endpoint (ex: /backupServices)
   * @param {object} options - Options supplémentaires (body, query params, etc.)
   * @returns {Promise<object>} Réponse de l'API
   */
  async request(method, path, options = {}) {
    if (!this.appKey || !this.appSecret || !this.consumerKey) {
      throw new Error('Les credentials OVH ne sont pas configurés. Vérifiez votre fichier .env');
    }

    // Construire l'URL complète
    const url = new URL(`${this.baseUrl}${path}`);
    
    // Ajouter les paramètres de requête si fournis
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Obtenir le timestamp synchronisé
    const delta = await this.getTimeDelta();
    const timestamp = Math.floor(Date.now() / 1000) + delta;

    // Préparer le corps de la requête
    const body = options.body ? JSON.stringify(options.body) : '';

    // Calculer la signature
    const signature = this.sign(method, url.toString(), body, timestamp);

    // Préparer les headers
    const headers = {
      'X-Ovh-Application': this.appKey,
      'X-Ovh-Timestamp': timestamp.toString(),
      'X-Ovh-Consumer': this.consumerKey,
      'X-Ovh-Signature': signature,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body || undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API OVHcloud: ${response.status} ${errorText}`);
      }

      // Certaines réponses peuvent être vides
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { success: true };
    } catch (error) {
      throw new Error(`Erreur lors de la requête OVHcloud: ${error.message}`);
    }
  }

  /**
   * Récupère la liste des services backup
   * @returns {Promise<Array<string>>} Liste des noms de services
   */
  async getBackupServices() {
    return this.request('GET', '/backupServices');
  }

  /**
   * Récupère les détails d'un service backup spécifique
   * @param {string} serviceName - Nom du service
   * @returns {Promise<object>} Détails du service
   */
  async getBackupServiceDetails(serviceName) {
    return this.request('GET', `/backupServices/${serviceName}`);
  }
}

// Exporte une instance singleton
export const ovhClient = new OVHClient();
