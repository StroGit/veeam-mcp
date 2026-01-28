#!/usr/bin/env node

import { vspcClient } from './lib/vspc-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function listBackupJobs() {
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

    // Récupérer les jobs de backup (tous types)
    console.log('📊 Récupération des jobs de backup...\n');
    
    let allJobs = [];
    let totalCount = 0;
    
    // 1. Jobs VBR (Veeam Backup & Replication)
    try {
      console.log('   🔍 Recherche des jobs VBR...');
      const vbrJobs = await vspcClient.getJobs({ limit: 500 });
      if (vbrJobs.data && vbrJobs.data.length > 0) {
        allJobs.push(...vbrJobs.data.map(j => ({ ...j, type: 'VBR' })));
        totalCount += vbrJobs.meta?.pagingInfo?.total || vbrJobs.data.length;
        console.log(`      ✅ ${vbrJobs.data.length} job(s) VBR trouvé(s)`);
      }
    } catch (e) {
      console.log(`      ⚠️  Erreur: ${e.message.substring(0, 80)}`);
    }
    
    // 2. Jobs d'agents de backup
    try {
      console.log('   🔍 Recherche des jobs d\'agents de backup...');
      const agentJobs = await vspcClient.request('GET', '/backupAgentJobs', { params: { limit: 500 } });
      if (agentJobs.data && agentJobs.data.length > 0) {
        allJobs.push(...agentJobs.data.map(j => ({ ...j, type: 'Agent' })));
        totalCount += agentJobs.meta?.pagingInfo?.total || agentJobs.data.length;
        console.log(`      ✅ ${agentJobs.data.length} job(s) d'agent trouvé(s)`);
      }
    } catch (e) {
      console.log(`      ⚪ Aucun job d'agent trouvé`);
    }
    
    console.log('');
    
    const jobs = { data: allJobs, meta: { pagingInfo: { total: totalCount } } };
    
    if (jobs.data && jobs.data.length > 0) {
      const total = jobs.meta?.pagingInfo?.total || jobs.data.length;
      console.log(`\n✅ ${total} job(s) de backup trouvé(s):\n`);
      console.log('═'.repeat(100));
      
      jobs.data.forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.name || job.agentName || 'Sans nom'}`);
        console.log('─'.repeat(100));
        
        if (job.type) {
          console.log(`   Type: ${job.type}`);
        }
        
        if (job.instanceUid) {
          console.log(`   ID: ${job.instanceUid}`);
        }
        
        if (job.status) {
          const statusEmoji = {
            'Success': '✅',
            'Failed': '❌',
            'Warning': '⚠️',
            'Running': '🔄',
            'Idle': '⏸️',
            'Stopped': '⏹️'
          };
          const emoji = statusEmoji[job.status] || '📋';
          console.log(`   Statut: ${emoji} ${job.status}`);
        }
        
        if (job.type) {
          console.log(`   Type: ${job.type}`);
        }
        
        if (job.backupServerName) {
          console.log(`   Serveur de backup: ${job.backupServerName}`);
        }
        
        if (job.organizationName) {
          console.log(`   Organisation: ${job.organizationName}`);
        }
        
        if (job.lastRun) {
          const lastRunDate = new Date(job.lastRun);
          const now = new Date();
          const diffHours = Math.round((now - lastRunDate) / (1000 * 60 * 60));
          console.log(`   Dernière exécution: ${lastRunDate.toLocaleString('fr-FR')} (il y a ${diffHours}h)`);
        }
        
        if (job.nextRun) {
          const nextRunDate = new Date(job.nextRun);
          console.log(`   Prochaine exécution: ${nextRunDate.toLocaleString('fr-FR')}`);
        }
        
        if (job.schedule) {
          console.log(`   Planification: ${JSON.stringify(job.schedule)}`);
        }
        
        if (job.description) {
          console.log(`   Description: ${job.description}`);
        }
        
        // Informations sur les objets protégés
        if (job.objectsCount !== undefined) {
          console.log(`   Objets protégés: ${job.objectsCount}`);
        }
        
        // Informations sur les restore points
        if (job.restorePointsCount !== undefined) {
          console.log(`   Points de restauration: ${job.restorePointsCount}`);
        }
        
        // Détails supplémentaires si disponibles
        if (job.backupServerUid) {
          console.log(`   Backup Server UID: ${job.backupServerUid}`);
        }
        
        if (job.locationUid) {
          console.log(`   Location UID: ${job.locationUid}`);
        }
      });
      
      console.log('\n' + '═'.repeat(100));
      
      // Statistiques
      const stats = {
        total: jobs.data.length,
        success: jobs.data.filter(j => j.status === 'Success').length,
        failed: jobs.data.filter(j => j.status === 'Failed').length,
        warning: jobs.data.filter(j => j.status === 'Warning').length,
        running: jobs.data.filter(j => j.status === 'Running').length,
        idle: jobs.data.filter(j => j.status === 'Idle').length,
      };

      console.log('\n📈 Statistiques:');
      console.log(`   Total: ${stats.total}`);
      if (stats.success > 0) console.log(`   ✅ Réussis: ${stats.success}`);
      if (stats.failed > 0) console.log(`   ❌ Échecs: ${stats.failed}`);
      if (stats.warning > 0) console.log(`   ⚠️  Avertissements: ${stats.warning}`);
      if (stats.running > 0) console.log(`   🔄 En cours: ${stats.running}`);
      if (stats.idle > 0) console.log(`   ⏸️  Inactifs: ${stats.idle}`);
      
    } else {
      console.log('\n⚠️  Aucun job de backup trouvé.');
      console.log('\n💡 Cela peut signifier que:');
      console.log('   - Aucun job n\'est configuré dans votre infrastructure VSPC');
      console.log('   - Les jobs sont gérés par une autre organisation/tenant');
      console.log('   - Votre API Key n\'a pas les permissions pour voir les jobs');
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

listBackupJobs();
