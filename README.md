# WebAudioSampler  
  
Mathis ANDRÉ  

<p align="center"><img src="images/Capture.png" width="1000%"></p>  
  
Un sampler audio qui utilise une api pour récupérer les sons  

  
## Fonctionnalités  
  
- Choix des presets via l'api
- Wave form qui permet de voir les ondes sonores    
- Trim bars qui permettent de contrôler la longueur de chaque son  
- Possibilité d'interagir avec le pad via les touches de clavier (1234  AZER  QSDF  WXCV)  
- Bouton pour charger un preset et jouer un son sans interface graphique
- Catégories de presets
- Barres de progression animées lors du chargement des presets
- Possibilité de charger des sons extérieurs au serveur via une URL externe, exemple : `https://mainline.i3s.unice.fr/WamSampler/audio/Grand%20Piano/piano-f-a4.wav`

## Utilisation  

Pour utiliser le projet, il faut lancer le serveur avec node.js puis lancer le client avec Live Server

### Installation  
Installer les dépendances  
```
$ cd server
$ npm i
``` 

### Lancer le serveur  
Lancer le serveur avec node.js  
```
$ cd server
$ npm run dev
``` 

### Lancer le client  
Ouvrir client\src\index.html avec Live Server  


## Utilisation de l'IA

Utilisation de chatgpt pour ajouter updateProgressBar dans loadAndDecodeSound() de soundutils.js (pour mettre à jour les barres de progression depuis le gui au lieu de le faire dans soundutils.js) (on passe une fonction en paramètre et on l'appelle plus tard)
