/**
 * 39 CAFÉ & BISTROT - DEFAULT SEED DATA & SCHEMA
 * Dati iniziali completi con Piatti, Bibite, Vini, Allergeni e Tag Alimentari.
 */

const SEED_DATA = {
  restaurant: {
    name: "39 Café & Bistrot",
    subtitle: "Caffetteria speciale, cucina artigianale & aperitivi d'autore",
    photo: "cover.jpg",
    logo: "39",
    address: "Via del Corso, 39 - Roma",
    phone: "+39 06 8765 4321",
    wifi: "39Cafe_Guest (pass: cafe39bistrot)",
    pin: "3939",
    syncChannel: "cafe39_menu_live_sync"
  },
  categories: [
    {
      id: "antipasti",
      name: "Antipasti & Finger Food",
      description: "Piccole delizie da condividere al tavolo con un calice",
      order: 0
    },
    {
      id: "primi",
      name: "Primi Piatti",
      description: "Pasta fresca artigianale e grandi classici della tradizione",
      order: 1
    },
    {
      id: "secondi",
      name: "Secondi Piatti",
      description: "Carni pregiate, pescato del giorno e creazioni dello chef",
      order: 2
    },
    {
      id: "dolci",
      name: "Dolci & Pasticceria",
      description: "Fatti ogni giorno con calma nel nostro laboratorio",
      order: 3
    },
    {
      id: "bibite",
      name: "Bibite & Beverage",
      description: "Caffetteria, bibite artigianali, birre selezionate, calici e distillati",
      order: 4
    }
  ],
  dishes: [
    // ANTIPASTI
    {
      id: "ant-1",
      categoryId: "antipasti",
      name: "Carciofo alla Giudia con Menta",
      description: "Carciofo romanesco fritto due volte, dorato e croccante con sale maldon e fogliolina di mentuccia.",
      price: 12.00,
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Nessuno",
      dietary: ["veg", "vegan", "glutenFree"],
      badge: "Consigliato"
    },
    {
      id: "ant-2",
      categoryId: "antipasti",
      name: "Tris di Supplì al Telefono 39",
      description: "Classico al ragù di manzo, cacio e pepe con scorza di lime, e amatriciano con cuore di fior di latte filante.",
      price: 9.50,
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Latte, Uova",
      dietary: ["veg"],
      badge: "Popolare"
    },
    {
      id: "ant-3",
      categoryId: "antipasti",
      name: "Tagliere Selezione '39 Bistrot'",
      description: "Prosciutto crudo di Parma 24 mesi, finocchiona toscana, pecorino romano DOP, focaccia calda al rosmarino e composte artigianali.",
      price: 18.00,
      image: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Latte, Frutta a guscio",
      dietary: [],
      badge: "Per 2 persone"
    },

    // PRIMI
    {
      id: "primi-1",
      categoryId: "primi",
      name: "La Carbonara 'Origini'",
      description: "Spaghettoni trafilati al bronzo, guanciale di Amatrice croccante, tuorli d'uovo da allevamento all'aperto, Pecorino Romano DOP e pepe nero del Madagascar.",
      price: 16.00,
      image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Uova, Latte",
      dietary: [],
      badge: "Specialità dello Chef"
    },
    {
      id: "primi-2",
      categoryId: "primi",
      name: "Tonnarelli Cacio & Pepe Cremosi",
      description: "Pasta all'uovo lavorata a mano, crema di pecorino buccia nera a tre stagionature e tostatura di cinque pepi profumati.",
      price: 15.00,
      image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Latte",
      dietary: ["veg"],
      badge: ""
    },
    {
      id: "primi-3",
      categoryId: "primi",
      name: "Paccheri all'Amatriciana di Campo",
      description: "Pomodoro San Marzano DOP cotto a fuoco lento, listarelle di guanciale dorato, sfumata di vino bianco secco e fiocchi di pecorino.",
      price: 15.50,
      image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Latte",
      dietary: [],
      badge: ""
    },

    // SECONDI
    {
      id: "sec-1",
      categoryId: "secondi",
      name: "Polpette della Domenica al Sugo Ricco",
      description: "Macinato scelto di manzo e vitella con cuore morbido di pane e parmigiano, glassate nel sugo di pomodoro fresco e basilico.",
      price: 18.00,
      image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Latte, Uova",
      dietary: [],
      badge: "Tradizione"
    },
    {
      id: "sec-2",
      categoryId: "secondi",
      name: "Saltimbocca alla Romana con Salvia",
      description: "Fettine di vitella di latte tenerissime, prosciutto crudo di montagna e foglia di salvia fresca, cotte al burro chiarificato e vino bianco.",
      price: 21.00,
      image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Latte, Glutine",
      dietary: [],
      badge: ""
    },
    {
      id: "sec-3",
      categoryId: "secondi",
      name: "Filetto di Spigola in Crosta di Zucchine",
      description: "Pesce freschissimo scottato su letto di zucchine romanesche a rondelle, emulsione al limone di Sorrento ed erbette fini.",
      price: 22.50,
      image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Pesce",
      dietary: ["glutenFree"],
      badge: "Pescato Fresco"
    },

    // DOLCI
    {
      id: "dolci-1",
      categoryId: "dolci",
      name: "Tiramisù Espresso 'Café 39'",
      description: "Crema al mascarpone montata soffice, savoiardi inzuppati nel nostro blend espresso 100% Arabica e spolverata generosa di cacao amaro Valrhona.",
      price: 8.00,
      image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine, Latte, Uova",
      dietary: ["veg"],
      badge: "Il Nostro Simbolo"
    },
    {
      id: "dolci-2",
      categoryId: "dolci",
      name: "Mousse al Cioccolato Fondente 72% e Sale Maldon",
      description: "Cioccolato fondente monorigine, crumble di nocciole tostate di Viterbo e cristalli di sale marino.",
      price: 8.50,
      image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Latte, Frutta a guscio, Soia",
      dietary: ["veg", "glutenFree"],
      badge: ""
    },

    // BIBITE & BEVERAGE
    {
      id: "bev-1",
      categoryId: "bibite",
      name: "Caffè Espresso Monorigine 39",
      description: "100% Arabica Specialty Coffee tostato artigianalmente, note di cioccolato e gelsomino.",
      price: 1.50,
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Nessuno",
      dietary: ["veg", "vegan", "glutenFree"],
      badge: "Specialty"
    },
    {
      id: "bev-2",
      categoryId: "bibite",
      name: "Acqua Minerale Naturale / Frizzante (0.75L)",
      description: "Acqua oligominerale in bottiglia di vetro nobile.",
      price: 3.00,
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Nessuno",
      dietary: ["veg", "vegan", "glutenFree"],
      badge: ""
    },
    {
      id: "bev-3",
      categoryId: "bibite",
      name: "Bibite Vintage Lurisia & San Pellegrino",
      description: "Coca Cola Classica / Zero in vetro (33cl), Chinotto Lurisia, Cedrata Tassoni, Aranciata Amara.",
      price: 4.00,
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Nessuno",
      dietary: ["veg", "vegan", "glutenFree"],
      badge: ""
    },
    {
      id: "bev-4",
      categoryId: "bibite",
      name: "Birra Artigianale 'Bionda 39' alla Spina (0.40L)",
      description: "Pils non filtrata a bassa fermentazione, maltata, fresca con finale piacevolmente luppolato.",
      price: 6.50,
      image: "https://images.unsplash.com/photo-1608270119859-96860f4df6c5?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Glutine",
      dietary: ["vegan"],
      badge: "Artigianale"
    },
    {
      id: "bev-5",
      categoryId: "bibite",
      name: "Calice Prosecco Superiore di Valdobbiadene DOCG",
      description: "Glera 100%, perlage finissimo e persistente, bouquet floreale ed elegante.",
      price: 7.00,
      image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Solfiti",
      dietary: ["veg", "vegan", "glutenFree"],
      badge: "Aperitivo"
    },
    {
      id: "bev-6",
      categoryId: "bibite",
      name: "Selezione Amari & Grappe Barrique",
      description: "Amaro del Capo, Jefferson, Montenegro, Braulio Riserva, Grappa morbida di Nebbiolo in barrique.",
      price: 5.00,
      image: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=800&q=80",
      available: true,
      allergens: "Solfiti (alcuni)",
      dietary: ["veg", "vegan", "glutenFree"],
      badge: "Digestivo"
    }
  ]
};

// Export to window
window.SEED_DATA = SEED_DATA;
