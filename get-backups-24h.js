#!/usr/bin/env node

import { vspcClient } from './lib/vspc-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function getBackupsLast24h() {
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

    // Calculer les dates pour les dernières 24 heures
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const startTime = yesterday.toISOString();
    const endTime = now.toISOString();

    console.log(`📅 Période: ${startTime} → ${endTime}\n`);

    // Récupérer les sessions de backup
    console.log('📊 Récupération des sessions de backup...');
    const sessions = await vspcClient.getSessions({
      startTime: startTime,
      endTime: endTime,
      limit: 100, // Augmenter la limite pour avoir plus de résultats
    });

    // Afficher les résultats
    if (sessions.data && sessions.data.length > 0) {
      console.log(`\n✅ ${sessions.meta?.pagingInfo?.total || sessions.data.length} session(s) trouvée(s):\n`);
      
      sessions.data.forEach((session, index) => {
        const startDate = new Date(session.startTime || session.creationTime);
        const endDate = session.endTime ? new Date(session.endTime) : null;
        const duration = endDate ? Math.round((endDate - startDate) / 1000 / 60) : 'En cours';
        
        console.log(`${index + 1}. ${session.name || session.jobName || 'Sans nom'}`);
        console.log(`   Statut: ${session.status || 'N/A'}`);
        console.log(`   Début: ${startDate.toLocaleString('fr-FR')}`);
        if (endDate) {
          console.log(`   Fin: ${endDate.toLocaleString('fr-FR')}`);
          console.log(`   Durée: ${duration} minutes`);
        }
        if (session.result) {
          console.log(`   Résultat: ${session.result}`);
        }
        if (session.progress) {
          console.log(`   Progression: ${session.progress}%`);
        }
        console.log('');
      });

      // Statistiques
      const stats = {
        total: sessions.data.length,
        success: sessions.data.filter(s => s.status === 'Success').length,
        failed: sessions.data.filter(s => s.status === 'Failed').length,
        warning: sessions.data.filter(s => s.status === 'Warning').length,
        running: sessions.data.filter(s => s.status === 'Running').length,
      };

      console.log('\n📈 Statistiques:');
      console.log(`   Total: ${stats.total}`);
      console.log(`   ✅ Réussis: ${stats.success}`);
      console.log(`   ❌ Échecs: ${stats.failed}`);
      console.log(`   ⚠️  Avertissements: ${stats.warning}`);
      console.log(`   🔄 En cours: ${stats.running}`);
    } else {
      console.log('\n⚠️  Aucune session de backup trouvée pour les dernières 24 heures.');
      console.log('\n💡 Vérifications possibles:');
      console.log('   - Vérifiez que des jobs de backup sont configurés');
      console.log('   - Vérifiez que des backups ont été exécutés récemment');
      console.log('   - Vérifiez les permissions de votre compte API');
      
      // Essayer de récupérer les jobs pour voir s'il y en a
      console.log('\n📋 Vérification des jobs de backup...');
      try {
        const jobs = await vspcClient.getJobs({ limit: 10 });
        if (jobs.data && jobs.data.length > 0) {
          console.log(`   ${jobs.data.length} job(s) configuré(s) mais aucune session récente.`);
        } else {
          console.log('   Aucun job de backup configuré.');
        }
      } catch (e) {
        console.log(`   Erreur lors de la vérification: ${e.message}`);
      }
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

getBackupsLast24h();
