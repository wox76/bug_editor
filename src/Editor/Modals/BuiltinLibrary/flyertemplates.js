export default {
  name: "Flyer",
  assets: [
    {
      id: "flyer_eighteen_birthday",
      name: "Flyer 18th Birthday - Young & Wild",
      width: 726,
      height: 1024,
      category: "Party & Birthday",
      backgroundColor: "#6a142c",
      preview: "flyers/flyer_eighteen_preview.png",
      backgroundImage: "flyers/moda01_bg.png",
      description: "Flyer moda per festa dei 18 anni con layout editoriale, foto ritratto e testi personalizzabili.",
      scriptGraphic: "flyers/young_wild_transparent.png",
      elements: [
        {
          type: "text",
          content: "I AM EIGHTEEN",
          x: 80,
          y: 142,
          fontSize: 58,
          fontFamily: "Italiana",
          fillColor: "#ffffff",
          justification: "left",
          name: "Titolo - I AM EIGHTEEN"
        },
        {
          type: "text",
          content: "123 ANYWHERE ST., ANY CITY",
          x: 82,
          y: 178,
          fontSize: 17,
          fontFamily: "Italiana",
          fillColor: "#ffffff",
          justification: "left",
          name: "Indirizzo"
        },
        {
          type: "text",
          content: "SAMIRA\nHADID",
          x: 643,
          y: 495,
          fontSize: 52,
          fontFamily: "Italiana",
          fillColor: "#ffffff",
          justification: "right",
          leading: 50,
          name: "Nome Festeggiata"
        },
        {
          type: "text",
          content: "TURNS 18",
          x: 643,
          y: 602,
          fontSize: 20,
          fontFamily: "Italiana",
          fillColor: "#ffffff",
          justification: "right",
          name: "Età"
        },
        {
          type: "text",
          content: "SATURDAY\nMAY 6, 2023\n3 PM",
          x: 76,
          y: 590,
          fontSize: 22,
          fontFamily: "Italiana",
          fillColor: "#ffffff",
          justification: "left",
          leading: 32,
          name: "Data e Ora"
        }
      ]
    },
    {
      id: "flyer_giggling_platypus",
      name: "Cocktail Bar Flyer - Giggling Platypus",
      width: 726,
      height: 1024,
      category: "Bar & Drinks",
      backgroundColor: "#f2f2f2",
      preview: "flyers/flyer_cocktails_preview.png",
      description: "Flyer evento cocktail e drink con illustrazione pittorica acquerello, tipografia bold e testi informativi.",
      artworkImage: {
        file: "flyers/cocktails_art.png",
        x: 362,
        y: 633,
        name: "Illustrazione Brindisi Cocktail"
      },
      elements: [
        {
          type: "text",
          content: "GIGGLING",
          x: 360,
          y: 246,
          fontSize: 98,
          fontFamily: "Anton",
          fillColor: "#111111",
          justification: "center",
          name: "Titolo 1 - GIGGLING"
        },
        {
          type: "text",
          content: "PLATYPUS",
          x: 361,
          y: 350,
          fontSize: 98,
          fontFamily: "Anton",
          fillColor: "#111111",
          justification: "center",
          name: "Titolo 2 - PLATYPUS"
        },
        {
          type: "text",
          content: "MAY",
          x: 643,
          y: 462,
          fontSize: 58,
          fontFamily: "Nunito Sans",
          fillColor: "#111111",
          justification: "right",
          name: "Mese"
        },
        {
          type: "text",
          content: "18",
          x: 643,
          y: 526,
          fontSize: 66,
          fontFamily: "Nunito Sans",
          fillColor: "#111111",
          justification: "right",
          name: "Giorno"
        },
        {
          type: "text",
          content: "2025",
          x: 643,
          y: 592,
          fontSize: 66,
          fontFamily: "Nunito Sans",
          fillColor: "#111111",
          justification: "right",
          name: "Anno"
        },
        {
          type: "text",
          content: "ABOUT EVENT",
          x: 75,
          y: 730,
          fontSize: 22,
          fontFamily: "Nunito Sans",
          fillColor: "#111111",
          justification: "left",
          name: "Titolo Sezione Info"
        },
        {
          type: "text",
          content: "Sip on expertly crafted\ndrinks, enjoy delightful\ncompany, and immerse\nyourself in an\natmosphere of\nelegance and fun.",
          x: 75,
          y: 756,
          fontSize: 16,
          fontFamily: "Nunito Sans",
          fillColor: "#222222",
          justification: "left",
          leading: 20,
          name: "Descrizione Evento"
        },
        {
          type: "text",
          content: "FOR MORE INFORMATION:\nWWW.REALLYGREATSITE.COM",
          x: 643,
          y: 896,
          fontSize: 15,
          fontFamily: "Nunito Sans",
          fillColor: "#111111",
          justification: "right",
          leading: 22,
          name: "Contatti / Sito Web"
        }
      ]
    },
    {
      id: "flyer_september_moodboard",
      name: "September Moodboard & Recap",
      width: 822,
      height: 1024,
      category: "Photo Collage",
      backgroundColor: "#d5cfc9",
      preview: "flyers/flyer_september_preview.png",
      backgroundImage: "flyers/september_bg.png",
      description: "Collage fotografico 4 riquadri per moodboard estetico o recap mensile, con sticker a stella e titolo modificabile.",
      stickers: [
        {
          file: "flyers/star_torn.png",
          x: 330,
          y: 500,
          name: "Sticker Stella Strappata"
        },
        {
          file: "flyers/star_gold.png",
          x: 620,
          y: 325,
          name: "Sticker Stella Oro Auto"
        },
        {
          file: "flyers/star_gold.png",
          x: 340,
          y: 700,
          rotation: 12,
          name: "Sticker Stella Oro Lampada"
        },
        {
          file: "flyers/star_pastel.png",
          x: 670,
          y: 580,
          name: "Sticker Stella Pastello Specchio"
        }
      ],
      elements: [
        {
          type: "text",
          content: "sep\ntem\nber",
          x: 411,
          y: 425,
          fontSize: 110,
          fontFamily: "Lilita One",
          fillColor: "#fef8dd",
          justification: "center",
          leading: 110,
          name: "Titolo - September"
        }
      ]
    }
  ]
};
