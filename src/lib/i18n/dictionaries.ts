export type Locale = "fr" | "wo";

export const dictionaries = {
  fr: {
    siteName: "Journal Ferñent",
    motto:
      "Union libre des peuples libres d'Afrique. Solidarité internationaliste des travailleurs",
    nav: {
      senegal: "Sénégal",
      afrique: "Afrique",
      international: "International",
      economie: "Économie",
      social: "Social",
      "notre-journal": "Notre Journal",
      videos: "Vidéos",
      archives: "Archives",
      contact: "Contact",
      admin: "Admin",
      home: "Accueil",
    },
    home: {
      aLaUne: "À la une",
      recent: "Dernières publications",
      ourGoal: "Notre objectif",
      ourGoalText:
        "Un média dématérialisé pour informer, analyser et mobiliser. Plus qu'un journal : un courant politique au service des peuples et des travailleurs.",
      readMore: "Lire la suite",
      newsletterTitle: "Recevoir Ferñent",
      newsletterText:
        "Analyses et alertes — sans spam, sans vente de données.",
      newsletterPlaceholder: "Votre e-mail",
      newsletterSubmit: "S'inscrire",
      by: "Par",
    },
    article: {
      comments: "Commentaires",
      commentsOff: "Les commentaires sont désactivés pour cet article.",
      leaveComment: "Laisser un commentaire",
      name: "Nom",
      message: "Message",
      publish: "Publier",
      noComments: "Aucun commentaire pour le moment.",
      back: "Retour",
    },
    contact: {
      title: "Contact",
      intro:
        "Proposez un texte, un témoignage ou une correction. Nous lisons chaque message.",
      email: "E-mail",
      writeUs: "Écrire à la rédaction",
    },
    videos: {
      title: "Vidéos",
      intro: "Reportages et entretiens — lecteurs légers, bande passante basse.",
      comingSoon: "Lecture bientôt disponible",
      duration: "Durée",
    },
    archives: {
      title: "Archives",
      intro:
        "Catalogue chronologique des publications. La recherche avancée arrive prochainement.",
      placeholder: "Archives en construction — consultez les rubriques en attendant.",
    },
    newsletter: {
      success: "Inscription enregistrée. Merci.",
      error: "Impossible d'enregistrer cet e-mail.",
      invalid: "E-mail invalide.",
    },
    admin: {
      title: "Administration",
      login: "Connexion",
      password: "Mot de passe",
      logout: "Déconnexion",
      articles: "Articles",
      newArticle: "Nouvel article",
      edit: "Modifier",
      delete: "Supprimer",
      save: "Enregistrer",
      cancel: "Annuler",
      demoNote:
        "Prototype : en production sur Vercel, les écritures peuvent être en mémoire (demo). Définissez ADMIN_PASSWORD.",
      unauthorized: "Mot de passe incorrect.",
      fields: {
        title: "Titre",
        slug: "Slug",
        excerpt: "Chapô",
        body: "Corps",
        rubric: "Rubrique",
        author: "Auteur",
        publishedAt: "Date",
        featured: "À la une",
        commentsEnabled: "Commentaires",
      },
    },
    footer: {
      rights: "Ferñent — journal de combat",
      contact: "Contact",
    },
    lang: {
      fr: "FR",
      wo: "WO",
      label: "Langue",
    },
  },
  wo: {
    siteName: "Journal Ferñent",
    motto:
      "Bokk buñu liber ci mbooloo yu liber yu Afrik. Solidarité bu internationaliste bu liggéeykat yi",
    nav: {
      senegal: "Senegaal",
      afrique: "Afrik",
      international: "International",
      economie: "Ekonomi",
      social: "Sosial",
      "notre-journal": "Sunu Journal",
      videos: "Widewo",
      archives: "Archives",
      contact: "Jokkalante",
      admin: "Admin",
      home: "Accueil",
    },
    home: {
      aLaUne: "Ci kaw",
      recent: "Yi mujj génn",
      ourGoal: "Sunu jublu",
      ourGoalText:
        "Ab média buñu mën a jàng ci telefon bu ndaw : xibaar, xool, te dajale mbooloo yi ak liggéeykat yi.",
      readMore: "Jàngati",
      newsletterTitle: "Jël Ferñent",
      newsletterText: "Analyses ak alert — du spam, du jaay data.",
      newsletterPlaceholder: "Sa e-mail",
      newsletterSubmit: "Bindu",
      by: "Ci",
    },
    article: {
      comments: "Kàddu yi",
      commentsOff: "Kàddu yi dañu leen tëj ci jukki bii.",
      leaveComment: "Bàyyi ab kàddu",
      name: "Tur",
      message: "Bataaxal",
      publish: "Yónnee",
      noComments: "Amul kàddu mukk.",
      back: "Dellu",
    },
    contact: {
      title: "Jokkalante",
      intro: "Indil ab mbind, ab seede walla ab korrigasion. Dinu jàng lépp.",
      email: "E-mail",
      writeUs: "Bindal rédaction bi",
    },
    videos: {
      title: "Widewo",
      intro: "Reportages ak entretiens — léegi, léegi.",
      comingSoon: "Dina ñëw",
      duration: "Waxtu",
    },
    archives: {
      title: "Archives",
      intro: "Limu jukki yi. Seetukaay bu baax dina ñëw.",
      placeholder: "Archives dafa nekk ci construction — seetal rubriques yi.",
    },
    newsletter: {
      success: "Bindu bi jot na. Jërëjëf.",
      error: "Mënul a aar e-mail bi.",
      invalid: "E-mail bu baaxul.",
    },
    admin: {
      title: "Administration",
      login: "Dugg",
      password: "Baatu jàll",
      logout: "Génn",
      articles: "Jukki yi",
      newArticle: "Jukki bu bees",
      edit: "Soppi",
      delete: "Far",
      save: "Aar",
      cancel: "Neenal",
      demoNote:
        "Prototype : ci Vercel, bind yi mën a nekk ci mémoire. Definal ADMIN_PASSWORD.",
      unauthorized: "Baatu jàll bu baaxul.",
      fields: {
        title: "Bopp",
        slug: "Slug",
        excerpt: "Chapô",
        body: "Mbind",
        rubric: "Rubrique",
        author: "Bindkat",
        publishedAt: "Bes",
        featured: "Ci kaw",
        commentsEnabled: "Kàddu yi",
      },
    },
    footer: {
      rights: "Ferñent — journal bu xeex",
      contact: "Jokkalante",
    },
    lang: {
      fr: "FR",
      wo: "WO",
      label: "Làkk",
    },
  },
} as const;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Dictionary = DeepStringify<(typeof dictionaries)["fr"]>;
