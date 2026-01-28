# MCP OVHcloud Backup Agent

Serveur MCP (Model Context Protocol) pour gérer et monitorer les backups OVHcloud et VSPC Veeam via Claude AI.

## 📋 Table des matières

- [Qu'est-ce qu'un MCP ?](#quest-ce-quun-mcp-)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Outils disponibles](#outils-disponibles)
- [Architecture](#architecture)
- [Développement](#développement)

## Qu'est-ce qu'un MCP ?

**MCP (Model Context Protocol)** est un protocole standardisé qui permet à une IA (comme Claude) de communiquer avec des outils externes. Ce serveur MCP agit comme un "traducteur" entre Claude et les APIs VSPC Veeam et OVHcloud.

### Comment ça fonctionne ?

1. **Vous posez une question** à Claude : "Montre-moi les backups en échec"
2. **Claude comprend** qu'il doit utiliser un outil du MCP
3. **Le MCP reçoit la demande**, appelle l'API appropriée (VSPC ou OVH)
4. **L'API répond** avec les données
5. **Le MCP formate** la réponse et la renvoie à Claude
6. **Claude vous présente** les résultats de façon compréhensible

## Installation

### Prérequis

- Node.js 18+ installé
- Compte VSPC Veeam avec accès API
- Compte OVHcloud avec clés API configurées

### Étapes d'installation

1. **Cloner ou télécharger le projet**

```bash
cd e:\veeammcp2\veeam-mcp
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez le fichier `.env.example` vers `.env` et remplissez vos identifiants :

```bash
copy .env.example .env
```

Éditez le fichier `.env` avec vos informations :

```env
# VSPC Veeam - Console de gestion des backups
VSPC_HOST=vspc.prod01.eu-west-rbx.backup.ovhcloud.com
VSPC_PORT=1280
VSPC_USERNAME=votre_utilisateur
VSPC_PASSWORD=votre_mot_de_passe

# API OVHcloud - Pour gérer vos services
OVH_ENDPOINT=ovh-eu
OVH_APP_KEY=votre_app_key
OVH_APP_SECRET=votre_app_secret
OVH_CONSUMER_KEY=votre_consumer_key
```

## Configuration

### Configuration pour Claude Desktop

Pour utiliser ce serveur MCP avec Claude Desktop, éditez le fichier de configuration :

**Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "OVHcloud Backup Agent": {
      "command": "node",
      "args": ["E:\\veeammcp2\\veeam-mcp\\mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Note** : Ajustez le chemin `E:\\veeammcp2\\veeam-mcp\\mcp-server.js` selon votre installation.

### Configuration pour Cursor

Pour utiliser ce serveur MCP avec Cursor, ajoutez la configuration dans les paramètres MCP de Cursor.

## Utilisation

Une fois le MCP installé et configuré, vous pouvez demander à Claude :

### Exemples de questions

- **Authentification** :
  - "Connecte-toi à la VSPC"
  - "Vérifie la configuration OVHcloud"

- **Monitoring des backups** :
  - "Montre-moi les backups en échec"
  - "Y a-t-il des alertes actives sur mes backups ?"
  - "Quel est le statut du backup de mon serveur web ?"
  - "Montre-moi les sessions de backup des dernières 24 heures"

- **Gestion des agents** :
  - "Combien d'agents sont actuellement protégés ?"
  - "Liste tous les agents installés"

- **Services OVHcloud** :
  - "Liste tous mes services backup OVHcloud"
  - "Montre-moi les détails du service backup X"

## Outils disponibles

### Outils d'authentification

#### `auth-vspc`
Se connecte à la VSPC avec un nom d'utilisateur et un mot de passe.

**Paramètres** :
- `username` (optionnel) : Nom d'utilisateur VSPC
- `password` (optionnel) : Mot de passe VSPC

**Note** : Si non fournis, les valeurs du fichier `.env` seront utilisées.

#### `auth-ovh`
Vérifie que la configuration OVHcloud est correcte.

**Paramètres** :
- `appKey` (optionnel) : Clé d'application OVH
- `appSecret` (optionnel) : Secret d'application OVH
- `consumerKey` (optionnel) : Clé consommateur OVH

**Note** : Si non fournis, les valeurs du fichier `.env` seront utilisées.

### Outils de monitoring VSPC

#### `get-backup-sessions`
Récupère les sessions de backup récentes.

**Paramètres** :
- `limit` (optionnel, défaut: 50) : Nombre maximum de sessions
- `offset` (optionnel, défaut: 0) : Pagination
- `status` (optionnel) : Filtrer par statut (Success, Failed, Warning, Running)
- `startTime` (optionnel) : Date de début (format ISO)
- `endTime` (optionnel) : Date de fin (format ISO)

#### `get-backup-jobs`
Récupère les jobs de backup et leur statut.

**Paramètres** :
- `limit` (optionnel, défaut: 50) : Nombre maximum de jobs
- `offset` (optionnel, défaut: 0) : Pagination
- `status` (optionnel) : Filtrer par statut (Success, Failed, Warning, Running)

#### `get-active-alerts`
Récupère les alertes actives (problèmes à résoudre).

**Paramètres** :
- `limit` (optionnel, défaut: 50) : Nombre maximum d'alertes
- `offset` (optionnel, défaut: 0) : Pagination
- `severity` (optionnel) : Filtrer par sévérité (Critical, Warning, Info)

#### `get-managed-agents`
Récupère la liste des agents installés sur vos serveurs.

**Paramètres** :
- `limit` (optionnel, défaut: 50) : Nombre maximum d'agents
- `offset` (optionnel, défaut: 0) : Pagination
- `status` (optionnel) : Filtrer par statut (Online, Offline, Unknown)

#### `get-usage-report`
Récupère le rapport d'utilisation le plus récent.

**Paramètres** : Aucun

### Outils OVHcloud

#### `get-ovh-services`
Liste vos services backup OVHcloud ou récupère les détails d'un service spécifique.

**Paramètres** :
- `serviceName` (optionnel) : Nom d'un service spécifique pour obtenir ses détails

## Architecture

### Structure des fichiers

```
veeam-mcp/
│
├── package.json                 # Liste des dépendances Node.js
├── .env                         # Vos identifiants (secrets, ne pas partager!)
├── .env.example                 # Template de configuration
├── mcp-server.js                # Fichier principal qui démarre le serveur
│
├── lib/                         # Bibliothèques partagées
│   ├── vspc-client.js           # Gère la connexion à la VSPC Veeam
│   └── ovh-client.js            # Gère la connexion à l'API OVHcloud
│
└── tools/                       # Les outils que Claude peut utiliser
    ├── auth-vspc.js             # Outil: se connecter à la VSPC
    ├── auth-ovh.js              # Outil: se connecter à OVHcloud
    ├── vspc-sessions.js         # Outil: voir les sessions de backup
    ├── vspc-jobs.js             # Outil: voir les jobs de backup
    ├── vspc-alerts.js           # Outil: voir les alertes
    ├── vspc-agents.js           # Outil: voir les agents installés
    ├── vspc-usage-report.js     # Outil: voir le rapport d'utilisation
    └── ovh-services.js          # Outil: voir les services OVHcloud
```

### Flux de communication

```
┌─────────────┐
│ Claude AI   │
└──────┬──────┘
       │ MCP Protocol
       ▼
┌─────────────────────┐
│ Serveur MCP          │
│ (mcp-server.js)      │
├─────────────────────┤
│ Outils (Tools)      │
│ ├─ auth-vspc        │
│ ├─ get-backup-jobs  │
│ └─ ...              │
└──────┬──────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ VSPC     │    │ OVHcloud │    │ ...      │
│ Client   │    │ Client   │    │          │
└────┬─────┘    └────┬─────┘    └──────────┘
     │              │
     ▼              ▼
┌──────────┐    ┌──────────┐
│ API VSPC │    │ API OVH  │
└──────────┘    └──────────┘
```

## Développement

### Dépendances

- `@modelcontextprotocol/sdk` : SDK officiel pour créer un serveur MCP
- `dotenv` : Permet de lire les variables depuis le fichier .env
- `node-fetch` : Permet de faire des requêtes HTTP vers les APIs
- `zod` : Permet de valider les paramètres des outils

### Ajouter un nouvel outil

1. Créez un nouveau fichier dans le dossier `tools/`
2. Suivez le modèle des outils existants :

```javascript
import { z } from 'zod';
import { vspcClient } from '../lib/vspc-client.js';

export default function(server) {
  server.tool(
    'nom-de-l-outil',
    {
      param1: z.string().describe('Description du paramètre'),
      param2: z.number().optional().default(10),
    },
    async (params) => {
      // Votre logique ici
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );
}
```

3. Le serveur MCP chargera automatiquement votre nouvel outil au démarrage.

### Tester le serveur

Pour tester le serveur en mode développement :

```bash
node mcp-server.js
```

Le serveur communique via STDIO, donc vous ne verrez pas de sortie normale. Les erreurs sont envoyées sur `stderr`.

## Sécurité

⚠️ **Important** :
- Ne partagez jamais votre fichier `.env`
- Ne commitez jamais le fichier `.env` dans Git
- Gardez vos clés API secrètes
- Utilisez des permissions restrictives sur le fichier `.env`

## Support

Pour toute question ou problème :
1. Vérifiez que vos identifiants dans `.env` sont corrects
2. Vérifiez que vous avez accès aux APIs VSPC et OVHcloud
3. Consultez les logs d'erreur du serveur MCP

## Licence

MIT
