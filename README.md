# WebAudioSampler  
  
Mathis ANDRÉ  

<p align="center"><img src="images/Capture.png" width="1000%"></p>  
  
Un sampler audio qui utilise une api pour récupérer les sons  

  
## Fonctionnalités  
  
- Choix des presets via l'api
- Wave form qui permet de voir les ondes sonores    
- Trim bars qui permettent de contrôler la longueur de chaque son  
- Possibilité d'interagir avec le pad via les touches de clavier (1234  AZER  QSDF  WXCV)  

## Utilisation  

Pour utiliser le projet, il faut lancer le serveur avec node.js puis lancer le client avec Live Server

#### Lancer le serveur  
Installer les dépendances et lancer le serveur avec node.js  
```
$ cd server
$ npm i
$ npm run dev
``` 

#### Lancer le client  
Ouvrir client\src\index.html avec Live Server  