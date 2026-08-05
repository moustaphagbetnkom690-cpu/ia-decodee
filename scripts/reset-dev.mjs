#!/usr/bin/env node
/**
 * Remise à zéro sûre de l'environnement de développement.
 *
 * POURQUOI CE SCRIPT EXISTE
 *
 * Le serveur `next dev` conserve ses artefacts compilés dans `.next/dev/`.
 * Si ce dossier disparaît pendant qu'il tourne — typiquement parce qu'un
 * `rm -rf .next` ou un `npm run build` a été lancé en parallèle — le serveur
 * ne le reconstruit pas : il continue de servir des requêtes en cherchant des
 * fichiers qui n'existent plus, et renvoie « Internal Server Error » sur
 * toutes les routes. Le code applicatif est parfaitement sain ; seul le cache
 * est corrompu, et aucun rechargement de page n'y changera rien.
 *
 * Ce script règle la situation dans le bon ordre : arrêter d'abord, nettoyer
 * ensuite. L'inverse est précisément ce qui provoque le problème.
 *
 *   npm run reset
 */
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marqueur = path.basename(racine);
const estWindows = process.platform === 'win32';

console.log('\n1. Arrêt des serveurs Next du projet…');

let arretOk = true;

try {
  if (estWindows) {
    try {
      const netstat = execSync('netstat -ano', { encoding: 'utf8' });
      const portLines = netstat.split('\n').filter((l) => l.includes(':3000') && l.includes('LISTENING'));
      const killedPids = new Set();

      for (const line of portLines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && Number(pid) !== process.pid && !killedPids.has(pid)) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            killedPids.add(pid);
          } catch {}
        }
      }

      if (killedPids.size > 0) {
        console.log(`   ${killedPids.size} processus arrêté(s) sur le port 3000 : ${[...killedPids].join(', ')}`);
      } else {
        console.log('   aucun serveur en écoute sur le port 3000');
      }
    } catch (err) {
      console.log('   aucun serveur actif sur le port 3000');
    }
  } else {
    execSync(`pkill -f "next (dev|start)"`, { stdio: 'ignore' });
    console.log('   processus Next arrêtés');
  }
} catch (err) {
  // pkill sort en 1 quand il ne trouve rien : ce n'est pas une erreur.
  if (!estWindows && err.status === 1) {
    console.log('   aucun serveur Next en cours');
  } else {
    // Sur Windows en revanche, un échec signifie que la détection n'a pas
    // fonctionné. On le dit franchement plutôt que de laisser croire au succès.
    arretOk = false;
    console.error(`   ÉCHEC de la détection : ${err.message.split('\n')[0]}`);
    console.error('   Arrêtez vos serveurs manuellement (Ctrl+C) avant de continuer.');
  }
}

if (!arretOk) process.exit(1);

// Laisse le temps aux verrous de fichiers Windows de se libérer : supprimer
// trop tôt échoue avec EBUSY et laisse un cache à moitié effacé.
await new Promise((r) => setTimeout(r, 1500));

console.log('2. Suppression du cache de compilation…');
const cache = path.join(racine, '.next');

if (existsSync(cache)) {
  try {
    rmSync(cache, { recursive: true, force: true });
    console.log('   .next supprimé');
  } catch (err) {
    console.error(`   ÉCHEC : ${err.message}`);
    console.error('   Un processus verrouille encore le dossier. Fermez vos terminaux et relancez.');
    process.exit(1);
  }
} else {
  console.log('   .next était déjà absent');
}

// Vérification finale : le port de développement doit être libre, sinon
// `next dev` échouera sur EADDRINUSE et l'ancien serveur cassé continuera
// de répondre — exactement le symptôme qu'on cherche à éliminer.
console.log('3. Vérification du port 3000…');
try {
  const net = await import('node:net');
  await new Promise((resolve, reject) => {
    const serveur = net.createServer();
    serveur.once('error', reject);
    serveur.once('listening', () => serveur.close(resolve));
    serveur.listen(3000, '0.0.0.0');
  });
  console.log('   port 3000 libre');
  console.log('\nEnvironnement remis à zéro. Lancez « npm run dev ».\n');
} catch {
  console.error('   PORT 3000 ENCORE OCCUPÉ — un serveur a survécu.');
  console.error('   `next dev` échouera et l’ancien serveur continuera de renvoyer des erreurs 500.');
  console.error('   Fermez le terminal qui l’exécute, puis relancez « npm run reset ».\n');
  process.exit(1);
}
