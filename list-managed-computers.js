#!/usr/bin/env node

import { vspcClient } from './lib/vspc-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function listManagedComputers() {
  try {
    // Authentification avec API Key
    const apiKey = process.env.VSPC_KEY;
    if (!apiKey) {
      console.error('❌ Erreur: VSPC_KEY doit être défini dans le fichier .env');
      process.exit(1);
    }

    console.log('🔐 Authentification à la VSPC...');
    await vspcClient.authenticateWithApiKey(apiKey);
    console.log('✅ Authentifié!\n');

    // Récupérer les ordinateurs gérés depuis différents endpoints
    console.log('📊 Récupération des ordinateurs gérés...\n');
    
    let allComputers = [];
    let totalCount = 0;
    
    // 1. Agents de backup
    try {
      console.log('   🔍 Recherche des agents de backup...');
      const backupAgents = await vspcClient.request('GET', '/infrastructure/backupAgents', { params: { limit: 500 } });
      if (backupAgents.data && backupAgents.data.length > 0) {
        allComputers.push(...backupAgents.data.map(a => ({ ...a, source: 'backupAgents' })));
        totalCount += backupAgents.meta?.pagingInfo?.total || backupAgents.data.length;
        console.log(`      ✅ ${backupAgents.data.length} agent(s) de backup trouvé(s)`);
      }
    } catch (e) {
      console.log(`      ⚪ Aucun agent de backup trouvé`);
    }
    
    // 2. Ordinateurs découverts
    try {
      console.log('   🔍 Recherche des ordinateurs découverts...');
      const discoveredComputers = await vspcClient.request('GET', '/discovery/computers', { params: { limit: 500 } });
      if (discoveredComputers.data && discoveredComputers.data.length > 0) {
        // Éviter les doublons basés sur instanceUid
        const existingUids = new Set(allComputers.map(c => c.instanceUid));
        const newComputers = discoveredComputers.data
          .filter(c => !existingUids.has(c.instanceUid))
          .map(a => ({ ...a, source: 'discovery' }));
        allComputers.push(...newComputers);
        totalCount += discoveredComputers.meta?.pagingInfo?.total || discoveredComputers.data.length;
        console.log(`      ✅ ${discoveredComputers.data.length} ordinateur(s) découvert(s)`);
      }
    } catch (e) {
      console.log(`      ⚪ Aucun ordinateur découvert trouvé`);
    }
    
    console.log('');
    
    const agents = { data: allComputers, meta: { pagingInfo: { total: totalCount } } };
    
    if (agents.data && agents.data.length > 0) {
      // Dédupliquer par instanceUid
      const uniqueComputers = [];
      const seenUids = new Set();
      
      agents.data.forEach(agent => {
        if (agent.instanceUid && !seenUids.has(agent.instanceUid)) {
          seenUids.add(agent.instanceUid);
          uniqueComputers.push(agent);
        } else if (!agent.instanceUid) {
          uniqueComputers.push(agent);
        }
      });
      
      const total = uniqueComputers.length;
      console.log(`\n✅ ${total} ordinateur(s) géré(s) trouvé(s):\n`);
      console.log('═'.repeat(120));
      
      uniqueComputers.forEach((agent, index) => {
        console.log(`\n${index + 1}. ${agent.name || agent.computerName || 'Sans nom'}`);
        console.log('─'.repeat(120));
        
        if (agent.source) {
          console.log(`   Source: ${agent.source === 'backupAgents' ? 'Agent de backup' : 'Découverte'}`);
        }
        
        if (agent.instanceUid) {
          console.log(`   ID: ${agent.instanceUid}`);
        }
        
        if (agent.computerName && agent.computerName !== agent.name) {
          console.log(`   Nom de l'ordinateur: ${agent.computerName}`);
        }
        
        if (agent.status) {
          const statusEmoji = {
            'Online': '🟢',
            'Offline': '🔴',
            'Unknown': '⚪',
            'Unverified': '🟡',
            'Active': '✅',
            'Inactive': '⏸️'
          };
          const emoji = statusEmoji[agent.status] || '📋';
          console.log(`   Statut: ${emoji} ${agent.status}`);
        }
        
        if (agent.agentPlatform) {
          console.log(`   Plateforme: ${agent.agentPlatform}`);
        }
        
        if (agent.operatingSystem) {
          console.log(`   Système d'exploitation: ${agent.operatingSystem}`);
        }
        
        if (agent.backupAgentVersion) {
          console.log(`   Version de l'agent de backup: ${agent.backupAgentVersion}`);
        }
        
        if (agent.version) {
          console.log(`   Version: ${agent.version}`);
        }
        
        if (agent.operationMode) {
          console.log(`   Mode d'opération: ${agent.operationMode}`);
        }
        
        if (agent.backupAgentInstallationStatus) {
          console.log(`   Statut d'installation: ${agent.backupAgentInstallationStatus}`);
        }
        
        if (agent.backupAgentManagementStatus) {
          console.log(`   Statut de gestion: ${agent.backupAgentManagementStatus}`);
        }
        
        if (agent.managementAgentStatus) {
          console.log(`   Statut du management agent: ${agent.managementAgentStatus}`);
        }
        
        if (agent.ipAddress) {
          console.log(`   Adresse IP: ${agent.ipAddress}`);
        }
        
        if (agent.organizationName) {
          console.log(`   Organisation: ${agent.organizationName}`);
        }
        
        if (agent.locationName) {
          console.log(`   Localisation: ${agent.locationName}`);
        }
        
        if (agent.backupServerName) {
          console.log(`   Serveur de backup: ${agent.backupServerName}`);
        }
        
        if (agent.discoveredTime) {
          const discoveredDate = new Date(agent.discoveredTime);
          console.log(`   Découvert le: ${discoveredDate.toLocaleString('fr-FR')}`);
        }
        
        if (agent.lastSeen) {
          const lastSeenDate = new Date(agent.lastSeen);
          const now = new Date();
          const diffHours = Math.round((now - lastSeenDate) / (1000 * 60 * 60));
          console.log(`   Dernière vue: ${lastSeenDate.toLocaleString('fr-FR')} (il y a ${diffHours}h)`);
        }
        
        if (agent.managementAgentUid) {
          console.log(`   Management Agent UID: ${agent.managementAgentUid}`);
        }
        
        if (agent.isManaged !== undefined) {
          console.log(`   Géré: ${agent.isManaged ? 'Oui' : 'Non'}`);
        }
        
        if (agent.agentType) {
          console.log(`   Type d'agent: ${agent.agentType}`);
        }
      });
      
      console.log('\n' + '═'.repeat(120));
      
      // Statistiques
      const stats = {
        total: uniqueComputers.length,
        online: uniqueComputers.filter(a => a.status === 'Online' || a.status === 'Active').length,
        offline: uniqueComputers.filter(a => a.status === 'Offline' || a.status === 'Inactive').length,
        unknown: uniqueComputers.filter(a => a.status === 'Unknown').length,
        unverified: uniqueComputers.filter(a => a.status === 'Unverified').length,
      };

      console.log('\n📈 Statistiques:');
      console.log(`   Total: ${stats.total}`);
      if (stats.online > 0) console.log(`   🟢 En ligne/Actif: ${stats.online}`);
      if (stats.offline > 0) console.log(`   🔴 Hors ligne/Inactif: ${stats.offline}`);
      if (stats.unknown > 0) console.log(`   ⚪ Statut inconnu: ${stats.unknown}`);
      if (stats.unverified > 0) console.log(`   🟡 Non vérifiés: ${stats.unverified}`);
      
      // Statistiques par OS/Plateforme
      const osStats = {};
      uniqueComputers.forEach(agent => {
        const os = agent.agentPlatform || agent.operatingSystem || 'Inconnu';
        osStats[os] = (osStats[os] || 0) + 1;
      });
      
      if (Object.keys(osStats).length > 0) {
        console.log('\n💻 Répartition par système d\'exploitation:');
        Object.entries(osStats).forEach(([os, count]) => {
          console.log(`   ${os}: ${count}`);
        });
      }
      
    } else {
      console.log('\n⚠️  Aucun ordinateur géré trouvé.');
      console.log('\n💡 Cela peut signifier que:');
      console.log('   - Aucun agent n\'est installé sur vos ordinateurs');
      console.log('   - Les agents ne sont pas encore découverts par VSPC');
      console.log('   - Votre API Key n\'a pas les permissions pour voir les agents');
      console.log('   - Les agents sont gérés par une autre organisation/tenant');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

listManagedComputers();
