// ─── Full text sources will be added to chapters[] as they are fetched from
// the Latin Library (thelatinlibrary.com), Perseus (perseus.tufts.edu),
// and A.S. Kline's translations (poetryintranslation.com).
//
// For now, each book has one chapter (the opening).
// Add more chapters to each book's array for full-text parallel reading.
// Curriculum (syllabus) texts are marked with '(Curriculum)' in the chapter title.
//
// The LATIN_DICT and GREEK_DICT cover the ~21 opening lines.
// Extend dictionaries as each new chapter is added.

const BOOKS = [
  // ─── LATIN ──────────────────────────────────────────────────────────────
  // BOOK 1: Vergilius — Aeneis I (Year 5, mandatory)
  { id: "vergil-aeneis-1", title: "Vergilius — Aeneis I", author: "Vergilius", year: -19, lang: "latin",
    chapters: [
      {
        title: "Liber I — Prooemium (Curriculum)",
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
      },
      // Chapter 1 — Full Aeneid I (Curriculum) ~ lines 1-756
      {
        title: "Liber I — volledige tekst (Curriculum)",
        lines: [
          "Arma virumque canō, Trōiae quī prīmus ab ōrīs Ītaliam, fātō profugus, Lāvīniaque vēnit lītora, multum ille et terrīs iactātus et altō vī superum saevae memorem Iūnōnis ob īram; multa quoque et bellō passus, dum conderet urbem, 5 inferretque deōs Latiō, genus unde Latīnum, Albānīque patrēs, atque altae moenia Rōmae.",
          "Mūsa, mihī causās memorā, quō nūmine laesō, quidve dolēns, rēgīna deum tot volvere cāsūs īnsīgnem pietāte virum, tot adīre labōrēs 10 impulerit. Tantaene animīs caelestibus īrae?",
          "Urbs antīqua fuit, Tyriī tenuēre colōnī, Karthāgō, Ītaliam contrā Tiberīnaque longē ōstia, dīves opum studiīsque asperrima bellī, quam Iūnō fertur terrīs magis omnibus ūnam 15 posthabitā coluisse Samō; hīc illius arma, hīc currus fuit; hōc rēgnum dea gentibus esse, sī quā Fāta sinant, iam tum tenditque fovetque.",
          "Prōgeniem sed enim Trōiānō ā sanguine dūcī audierat, Tyriās olim quae verteret arcēs; 20 hinc populum lātē regem bellōque superbum ventūrum excidiō Libyae: sīc volvere Parcās. Id metuēns, veterisque memor Sāturnia bellī, prīma quod ad Trōiam prō cārīs gesserat Argīs— necdum etiam causae īrārum saevīque dolōrēs 25 exciderant animō: manet altā mente repostum iūdicium Paridis sprētaeque iniūria fōrmae, et genus invīsum, et raptī Ganymēdis honōrēs.",
          "Hīs accēnsa super, iactātōs aequore tōtō Trōas, rēliquiās Danaum atque immītis Achillī, 30 arcēbat longē Latiō, multōsque per annōs errābant, āctī Fātīs, maria omnia circum. Tantae mōlis erat Rōmānam condere gentem!",
          "Vix e conspectu Siculae telluris in altum vela dabant laeti, et spumas salis aere ruebant, 35 cum Iuno, aeternum servans sub pectore volnus, haec secum: 'Mene incepto desistere victam, nec posse Italia Teucrorum avertere regem? Quippe vetor fatis. Pallasne exurere classem Argivom atque ipsos potuit submergere ponto, 40 unius ob noxam et furias Aiacis Oilei?",
          "Ipsa, Iovis rapidum iaculata e nubibus ignem, disiecitque rates evertitque aequora ventis, illum expirantem transfixo pectore flammas turbine corripuit scopuloque infixit acuto. 45 Ast ego, quae divom incedo regina, Iovisque et soror et coniunx, una cum gente tot annos bella gero! Et quisquam numen Iunonis adoret praeterea, aut supplex aris imponet honorem?'",
          "Talia flammato secum dea corde volutans 50 nimborum in patriam, loca feta furentibus austris, Aeoliam venit. Hic vasto rex Aeolus antro luctantes ventos tempestatesque sonoras imperio premit ac vinclis et carcere frenat.",
          "Illi indignantes magno cum murmure montis 55 circum claustra fremunt; celsa sedet Aeolus arce sceptra tenens, mollitque animos et temperat iras. Ni faciat, maria ac terras caelumque profundum quippe ferant rapidi secum verrantque per auras.",
          "Sed pater omnipotens speluncis abdidit atris, 60 hoc metuens, molemque et montis insuper altos imposuit, regemque dedit, qui foedere certo et premere et laxas sciret dare iussus habenas."
        ],
        translation: [
          "Ik zing van wapens en de man — hij die, door het lot verbannen, eerst van de kust van Troje naar Italië kwam, en naar de Lavinische kusten — veel werd hij op land en zee geteisterd, door de wil der goden, door Juno's onvergetelijke wrede toorn",
          "Muse, vertel me de oorzaak: hoe was zij in haar godheid gekrenkt",
          "Er was een oude stad — Carthago, door kolonisten uit Tyrus gesticht",
          "Maar zij had gehoord dat uit Trojaans bloed een geslacht zou komen",
          "Dit vrezende, en de oude krijg indachtig die zij te Troje om haar geliefde Argos had gevoerd",
          "Hierdoor nog meer ontvlamd, joeg zij de Trojanen over de ganse oceaan, ver van Latium",
          "Zij zwalkten vele jaren lang, door de schikking gedreven, rond op alle zeeën",
          "Zoveel moeite kostte het om het Romeinse volk te stichten"
        ]
      }
    ]
  },
  // BOOK 2: Ovidius — Metamorphoses I
  { id: "ovid-met-1", title: "Ovidius — Metamorphoses I", author: "Ovidius", year: 8, lang: "latin",
    chapters: [
      {
        title: "Liber I — Prooemium (Curriculum)",
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
  // BOOK 3: Homerus — Ilias I
  { id: "homer-iliad-1", title: "Homerus — Ilias I", author: "Homerus", year: -800, lang: "greek",
    chapters: [
      {
        title: "Rhapsodia I — De toorn van Achilleus (Curriculum)",
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
  // BOOK 4: Sophocles — Oedipus Rex
  { id: "sophocles-oedipus", title: "Sophocles — Oedipus Rex", author: "Sophocles", year: -429, lang: "greek",
    chapters: [
      {
        title: "Oedipus Tyrannus (Curriculum)",
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