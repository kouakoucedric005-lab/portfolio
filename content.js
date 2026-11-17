// Contenu du portfolio — c'est le seul fichier à modifier pour changer les textes.
// (Vous pouvez aussi utiliser l'éditeur local : index.html#admin, puis « Exporter content.js ».)
// Les liens doivent commencer par https://. Un projet sans lien n'affiche pas de bouton.
// Icônes disponibles : voir la liste dans l'éditeur.
window.PORTFOLIO_CONTENT = {
  "name": "Kouakou Cédric",
  "badge": "Formation CompTIA en cours",
  "photo": "photo.webp",
  "photoAlt": "Portrait de Kouakou Cédric, en blazer bleu marine et chemise à carreaux violette, debout, les mains dans les poches",
  "words": [
    "Étudiant en cybersécurité",
    "Développeur Python",
    "Préparation CompTIA Security+"
  ],
  "desc": "J'apprends à protéger les systèmes, et je construis en Python les outils qui m'aident à le faire.",
  "about1": "Étudiant en cybersécurité, je termine en décembre ma formation CompTIA et je prépare la certification Security+. Dans mon laboratoire (une machine virtuelle Kali Linux), je pratique le chiffrement, l'analyse de malwares, l'ingénierie sociale et les scans réseau avec Nmap et Nikto.",
  "about2": "Développeur Python, je transforme ce que j'apprends en projets concrets : une boîte à outils de sécurité (intégrité des fichiers, surveillance des processus et du réseau, audit de durcissement) et des applications web avec Django. Mon fil rouge : construire des choses utiles, et les sécuriser dès la conception.",
  "stats": [
    { "n": "3", "l": "Projets personnels" },
    { "n": "Python", "l": "Langage principal" },
    { "n": "Security+", "l": "Certification visée" }
  ],
  "projects": [
    {
      "icon": "shield",
      "title": "Boîte à outils de sécurité",
      "desc": "Outils Python pour protéger mon PC : vérification de l'intégrité des fichiers, surveillance des processus et du réseau, audit de durcissement.",
      "tags": ["Python", "Sécurité", "Audit"],
      "link": ""
    },
    {
      "icon": "layers",
      "title": "Boutique de parfums",
      "desc": "Site e-commerce avec Django : catalogue et filtres, fiches produit, panier et administration.",
      "tags": ["Django", "Python", "E-commerce"],
      "link": ""
    },
    {
      "icon": "sliders",
      "title": "Tableau de bord financier",
      "desc": "Suivi des revenus et des charges, au mois et à l'année, en francs CFA. Pensé pour être sécurisé dès le départ.",
      "tags": ["Python", "Dashboard", "Sécurité"],
      "link": ""
    }
  ],
  "skills": ["Python", "Django", "Cybersécurité", "CompTIA Security+", "Kali Linux", "Nmap & Nikto", "Chiffrement"],
  "bars": [
    { "label": "Python", "pct": 60 },
    { "label": "Cybersécurité", "pct": 45 },
    { "label": "Développement web", "pct": 40 }
  ],
  // Laissé vide volontairement : les messages arrivent par Netlify Forms (adresse réglée dans Netlify,
  // donc invisible ici). Si vous renseignez une adresse, elle sert de repli (mailto:) et devient publique.
  "email": "",
  "socials": [
    { "icon": "github", "url": "https://github.com/kouakoucedric005-lab", "title": "GitHub" },
    { "icon": "linkedin", "url": "https://www.linkedin.com/in/cedric-kouakou-37636444b", "title": "LinkedIn" }
  ]
};
