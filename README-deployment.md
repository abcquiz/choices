# Déploiement de l'application Quiz

## Configuration locale (développement)

Pour lancer l'application en local avec HTTP :

```bash
# Utilise automatiquement le fichier .env
docker-compose up -d
```

L'application sera accessible sur http://localhost:8080

## Configuration production

### Prérequis
1. Configurer le DNS pour pointer quiz.hachim.fr vers votre serveur
2. Ouvrir les ports 80 et 443 sur votre serveur

### Déploiement
```bash
# Copier le fichier de configuration production
cp .env.prod .env

# Lancer l'application en production
docker-compose up -d
```

L'application sera accessible sur :
- http://quiz.hachim.fr (redirige automatiquement vers HTTPS)
- https://quiz.hachim.fr (avec certificat SSL automatique Let's Encrypt)

### Fichiers de configuration

- `.env` : Configuration locale (HTTP, port 8080)
- `.env.prod` : Configuration production (HTTPS, ports 80/443)
- `Caddyfile.local` : Configuration Caddy pour le développement local
- `Caddyfile.prod` : Configuration Caddy pour la production avec HTTPS automatique

### Changement de configuration

Pour passer de local à production :
```bash
cp .env.prod .env
docker-compose down
docker-compose up -d
```

Pour revenir en local :
```bash
git checkout .env  # ou restaurer le fichier .env local
docker-compose down  
docker-compose up -d
```