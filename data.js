const BOOKS = [
  // ─── LATIN ──────────────────────────────────────────────────────────────
  // BOOK 1: Vergilius — Aeneis I (Year 5, mandatory)
  { id: "vergil-aeneis-1", title: "Vergilius — Aeneis I", author: "Vergilius", year: -19, lang: "latin",
    chapters: [
      {
        title: "Liber I — Prooemium",
        lines: [
          "Arma virumque cano, Troiae qui primus ab oris",
          "Italiam fato profugus Laviniaque venit",
          "litora — multum ille et terris iactatus et alto",
          "vi superum, saevae memorem Iunonis ob iram,",
          "multa quoque et bello passus, dum conderet urbem",
          "inferretque deos Latio; genus unde Latinum",
          "Albanique patres atque altae moenia Romae."
        ],
        translation: [
          "Ik zing van wapens en de man, die eerst van de kusten van Troje",
          "naar Italië kwam, een vluchteling door het lot, naar de Lavinische kusten",
          "— veel werd hij op het land en op de diepe zee geteisterd",
          "door de macht van de goden, om de onvergetelijke toorn van de wrede Juno",
          "veel leed hij ook in de oorlog, totdat hij een stad kon stichten",
          "en zijn goden naar Latium bracht; hieruit ontstond het Latijnse geslacht",
          "de Albanese vaderen en de hoge muren van Rome."
        ]
      }
    ]
  },
  // BOOK 2: Ovidius — Metamorphoses I (Year 5, mandatory)
  { id: "ovid-met-1", title: "Ovidius — Metamorphoses I", author: "Ovidius", year: 8, lang: "latin",
    chapters: [
      {
        title: "Liber I — De nieuwe gestalten",
        lines: [
          "In nova fert animus mutatas dicere formas",
          "corpora; di, coeptis (nam vos mutastis et illas)",
          "adspirate meis primaque ab origine mundi",
          "ad mea perpetuum deducite tempora carmen!"
        ],
        translation: [
          "Mijn geest drijft mij om veranderde vormen in nieuwe lichamen te bezingen",
          "goden, begunstig mijn ondernemingen — gij hebt ook die veranderd",
          "en leid mijn voortdurende zang van het begin van de wereld af",
          "tot mijn eigen tijden!"
        ]
      }
    ]
  },
  // ─── GREEK ────────────────────────────────────────────────────────────
  // BOOK 3: Homerus — Ilias I (Year 5, mandatory)
  { id: "homer-iliad-1", title: "Homerus — Ilias I", author: "Homerus", year: -800, lang: "greek",
    chapters: [
      {
        title: "Rhapsodia I — De toorn van Achilleus",
        lines: [
          "Μῆνιν ἄειδε, θεά, Πηληιάδεω Ἀχιλῆος",
          "οὐλομένην, ἣ μυρί Ἀχαιοῖς ἄλγε' ἔθηκε",
          "πολλὰς δ' ἰφθίμους ψυχὰς Ἄϊδι προΐαψεν",
          "ἡρώων, αὐτοὺς δὲ ἑλώρια τεῦχε κύνεσσιν",
          "οἰωνοῖσί τε — Διὸς δ' ἐτελείετο βουλή —"
        ],
        translation: [
          "Zing, godin, de verwoestende toorn van Achilleus, de zoon van Peleus",
          "die ontelbare ellende bracht aan de Achaeërs",
          "en vele moedige zielen naar de Hades zond",
          "van helden, en hen zelf tot prooi maakte voor de honden",
          "en de vogels — de wil van Zeus voltrok zich —"
        ]
      }
    ]
  },
  // BOOK 4: Sophocles — Oedipus Rex (Year 5, mandatory)
  { id: "sophocles-oedipus", title: "Sophocles — Oedipus Rex", author: "Sophocles", year: -429, lang: "greek",
    chapters: [
      {
        title: "Oedipus Tyrannus",
        lines: [
          "ὦ τέκνα, Κάδμου τοῦ πάλαι νέα τροφή",
          "τίνας ποθ' ἕδρας τάσδε μοι θοάζετε",
          "ἱκτηρίοις κλάδοισιν ἐστεμμένοι",
          "πόλις δ' ὁμοῦ μὲν θυμιαμάτων γέμει",
          "ὁμοῦ δὲ παιάνων τε καὶ στεναγμάτων"
        ],
        translation: [
          "O kinderen, nieuwe nakomelingen van de oude Kadmos",
          "waarom zit gij op deze plaatsen voor mij",
          "met smeekbede-takken omkranst",
          "De stad is vol van wierookgeuren",
          "en van overwinningszangen en van weeklachten"
        ]
      }
    ]
  }
];