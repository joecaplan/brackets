// Category data extracted from Bracket_Options.xlsx
// Capitalize every option in every category
function capitalizeOption(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Random pool — used only for the ????? mode
const RANDOM_POOL = [
    // Animals
    "pangolin", "narwhal", "quokka", "axolotl", "okapi", "dog", "cat", "rabbit", "hamster", "horse", "cow", "pig", "sheep", "chicken", "goldfish", "parrot", "turtle", "gecko", "capybara", "meerkat", "wolverine", "manatee", "ocelot", "elephant", "lion", "tiger", "bear", "wolf", "dolphin", "penguin", "giraffe", "zebra", "puffin", "koala", "kangaroo", "panda", "fox", "deer", "owl", "eagle", "wombat", "platypus", "cheetah", "gorilla", "crocodile", "flamingo", "seahorse", "otter", "hedgehog", "squirrel",
    // Famous People
    "Albert Einstein", "William Shakespeare", "Frida Kahlo", "Nelson Mandela", "Marie Curie", "Mahatma Gandhi", "Pablo Picasso", "Ludwig Van Beethoven", "Nikola Tesla", "Michelangelo Buonarroti", "Nicolaus Copernicus", "Charles Darwin", "Jane Austen", "Leo Tolstoy", "Florence Nightingale", "Emily Dickinson", "Simón Bolívar", "Malala Yousafzai", "Stephen Hawking", "Alan Turing", "Beyoncé Knowles", "Barack Obama", "Oprah Winfrey", "Serena Williams", "LeBron James", "Lionel Messi", "Cristiano Ronaldo", "Adele Adkins", "Rihanna Fenty", "Taylor Swift", "Roger Federer", "Simone Biles", "Usain Bolt", "Greta Thunberg", "Meryl Streep", "Denzel Washington", "Chadwick Boseman", "Lin-Manuel Miranda", "Morgan Freeman", "Audrey Hepburn",
    // Emotions
    "Joy", "Grief", "Anger", "Awe", "Shame", "Envy", "Pride", "Fear", "Disgust", "Longing", "Surprise", "Contentment", "Guilt", "Excitement", "Melancholy", "Gratitude", "Anxiety", "Empathy", "Nostalgia", "Hope",
    // Life Events
    "First kiss", "Moving abroad", "Losing someone", "Getting married", "Seeing aurora", "Graduating school", "Having children", "Climbing mountains", "Winning competition", "Being heartbroken", "Traveling alone", "Finding purpose", "Watching sunrise", "Making amends", "Starting over", "Falling in love", "Achieving dreams", "Forgiving someone", "Feeling lost", "Coming home",
    // Cars
    "1967 Ford Mustang", "1963 Ferrari 250 GTO", "1969 Dodge Charger", "1955 Mercedes 300SL", "1970 Plymouth Barracuda", "1961 Jaguar E-Type", "1987 Ferrari Testarossa", "1966 Shelby Cobra", "1973 Porsche 911", "1969 Chevrolet Camaro", "1954 Mercedes 300SLR", "1971 Lamborghini Miura", "1968 Pontiac GTO", "1962 Aston Martin DB4", "1964 Chevrolet Corvette", "1979 BMW M1", "1969 Ford GT40", "1985 Lamborghini Countach", "1958 Porsche 356", "1972 De Tomaso Pantera",
    // Clothing
    "cardigan", "trench coat", "blazer", "dungarees", "kimono", "sarong", "beret", "loafers", "sundress", "hoodie", "turtleneck", "poncho", "leggings", "kaftan", "windbreaker", "camisole", "waistcoat", "culottes", "jumpsuit", "romper", "peacoat", "moccasins", "fedora",
    // Countries
    "Brazil", "Iceland", "Morocco", "Vietnam", "Kenya", "Portugal", "Argentina", "Finland", "Thailand", "Colombia", "Egypt", "Norway", "Peru", "Jamaica", "Greece", "Ethiopia", "Austria", "Nepal", "Croatia", "Uruguay", "Senegal", "Cambodia", "Hungary", "Tunisia", "Ecuador",
    // Instruments
    "guitar", "piano", "violin", "drums", "trumpet", "cello", "flute", "saxophone", "banjo", "ukulele", "harp", "trombone", "clarinet", "oboe", "bassoon", "mandolin", "accordion", "sitar", "theremin", "xylophone", "harmonica", "tuba", "harpsichord", "dulcimer", "didgeridoo",
    // Bands
    "Beatles", "Nirvana", "Queen", "ABBA", "Radiohead", "Coldplay", "Metallica", "U2", "Blondie", "Weezer", "Oasis", "Toto", "Cream", "Rush", "Phish", "Wilco", "Pixies", "Gorillaz",
    // Sports
    "soccer", "basketball", "swimming", "tennis", "volleyball", "hockey", "cricket", "rugby", "cycling", "archery", "fencing", "wrestling", "badminton", "surfing", "skiing", "gymnastics", "boxing", "rowing", "polo", "lacrosse", "triathlon", "curling", "weightlifting", "skateboarding", "handball", "squash", "judo", "karate",
    // Foods
    "pizza", "sushi", "mango", "burrito", "croissant", "ramen", "tacos", "waffles", "hummus", "lasagna", "guacamole", "pancakes", "risotto", "falafel", "pho", "tiramisu", "bruschetta", "enchilada", "paella", "dumplings", "gelato", "quiche", "brisket", "tempura", "shawarma", "cornbread", "ceviche", "gnocchi", "baklava", "pretzel", "kimchi", "moussaka", "chowder", "crepe", "biryani",
    // Movies
    "Inception", "Avatar", "Casablanca", "Gladiator", "Interstellar", "Titanic", "Jaws", "Vertigo", "Clueless", "Grease", "Spotlight", "Braveheart", "Alien", "Psycho", "Singin", "Moonlight", "Parasite", "Amélie", "Fargo", "Ratatouille", "Rocky", "Beetlejuice", "Dunkirk", "Goodfellas", "Coco", "Aladdin", "Memento", "Selma", "Chicago", "Shrek", "Platoon", "Arrival", "Elf", "Wall-E"
].map(capitalizeOption);

// Per-player accent colors (index assigned on join, 0-based)
export const PLAYER_COLORS = [
  "#c8f55a", // lime  (brand)
  "#f55a8a", // pink
  "#5ae8f5", // cyan
  "#f5c85a", // gold
  "#b05af5", // purple
  "#5a8af5", // blue
  "#f5785a", // orange
  "#5af596", // mint
  "#f54a4a", // red
  "#ff9933", // amber
  "#f0f055", // yellow
  "#44e8aa", // seafoam
  "#44aaff", // sky
  "#e844e8", // magenta
  "#ff88bb", // rose
  "#88ffee", // aqua
  "#bb88ff", // lavender
  "#ff6666", // coral
  "#aaee44", // yellow-green
  "#55ddff", // ice
];

// Subtle background accent color per category
export const CATEGORY_ACCENT = {
  "Vegetables":    "#2d6a2d",
  "Fruits":        "#c86020",
  "Painters":      "#5a2d8a",
  "Oscar Winners": "#8a6a00",
  "Pokemon":       "#e8a000",
  "TV Shows":      "#005080",
  "Fast Food":     "#8a3000",
  "Disney Movies": "#002a80",
  "Video Games":   "#500080",
  "?????":         "#2a2a5a",
  "Custom":        "#3a2a1a",
};

// Gather only the specified subgroups from the random pool for ??????
export function getAllOptions() {
  const r = RANDOM_POOL;
  return [
    ...r.slice(0, 50),      // animals
    ...r.slice(50, 90),     // famous people
    ...r.slice(90, 110),    // emotions
    ...r.slice(110, 129),   // life events
    ...r.slice(129, 149),   // cars
    ...r.slice(149, 172),   // clothing
    ...r.slice(172, 197),   // countries
    ...r.slice(197, 222),   // instruments
    ...r.slice(222, 240),   // bands
    ...r.slice(240, 268),   // sports
    ...r.slice(268, 303),   // foods
    ...r.slice(303),        // movies
  ];
}

// Pick n random unique items from an array (Fisher-Yates shuffle slice)
export function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
