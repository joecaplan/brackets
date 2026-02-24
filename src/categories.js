// Category data extracted from Bracket_Options.xlsx
// Capitalize every option in every category
function capitalizeOption(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const CATEGORIES = {
  "Vegetables": [
    "Carrot", "Broccoli", "Cauliflower", "Spinach",
    "Kale", "Lettuce", "Cabbage", "Brussels Sprouts",
    "Asparagus", "Green Beans", "Peas", "Corn",
    "Zucchini", "Cucumber", "Bell Pepper", "Chili Pepper",
    "Eggplant", "Tomato", "Potato", "Sweet Potato",
    "Onion", "Garlic", "Leek", "Celery",
    "Radish", "Beet", "Turnip", "Parsnip",
    "Mushroom", "Pumpkin", "Squash", "Okra",
  ].map(capitalizeOption),
  "Fruits": [
    "Apple", "Banana", "Orange", "Strawberry",
    "Blueberry", "Raspberry", "Blackberry", "Grapes",
    "Watermelon", "Cantaloupe", "Honeydew", "Pineapple",
    "Mango", "Papaya", "Kiwi", "Peach",
    "Plum", "Nectarine", "Cherry", "Apricot",
    "Pomegranate", "Lemon", "Lime", "Grapefruit",
    "Tangerine", "Coconut", "Fig", "Date",
    "Dragon Fruit", "Lychee", "Passion Fruit", "Guava",
  ].map(capitalizeOption),
  "Painters": [
    "Leonardo da Vinci", "Michelangelo", "Raphael", "Rembrandt",
    "Vincent van Gogh", "Pablo Picasso", "Claude Monet", "Salvador Dalí",
    "Jackson Pollock", "Andy Warhol", "Artemisia Gentileschi", "Élisabeth Vigée Le Brun",
    "Berthe Morisot", "Mary Cassatt", "Georgia O'Keeffe", "Frida Kahlo",
    "Hilma af Klint", "Yayoi Kusama", "Agnes Martin", "Joan Mitchell",
    "Gustav Klimt", "Edvard Munch", "Paul Cézanne", "Henri Matisse",
    "Caravaggio", "Diego Velázquez", "Francisco Goya", "Jean-Michel Basquiat",
    "Paul Gauguin", "Tamara de Lempicka", "Sofonisba Anguissola", "Bridget Riley",
  ].map(capitalizeOption),
  "Oscar Winners": [
    "Gone with the Wind", "Casablanca", "The Godfather", "The Godfather II",
    "Schindler's List", "Forrest Gump", "Titanic", "Gladiator",
    "A Beautiful Mind", "LOTR: Return of King", "No Country for Old Men", "The Hurt Locker",
    "Argo", "Birdman", "12 Years a Slave", "The Shape of Water",
    "Green Book", "Parasite", "Nomadland", "Everything Everywhere",
    "American Beauty", "Rocky", "Out of Africa", "Lawrence of Arabia",
    "One Flew Over Cuckoo's", "The English Patient", "Silence of the Lambs", "Million Dollar Baby",
    "Slumdog Millionaire", "The Departed", "Mad Max: Fury Road", "CODA",
  ].map(capitalizeOption),
  "Pokemon": [
    "Pikachu", "Charizard", "Bulbasaur", "Squirtle",
    "Jigglypuff", "Meowth", "Eevee", "Snorlax",
    "Mewtwo", "Gengar", "Lucario", "Greninja",
    "Togepi", "Psyduck", "Vulpix", "Arcanine",
    "Alakazam", "Machamp", "Gyarados", "Dragonite",
    "Blastoise", "Venusaur", "Lapras", "Scyther",
    "Mew", "Ditto", "Magikarp", "Umbreon",
    "Espeon", "Infernape", "Tyranitar", "Garchomp",
  ].map(capitalizeOption),
  "random": [
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
  ].map(capitalizeOption),
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

// Gather only the specified subgroups from the 'random' category for ??????
export function getAllOptions() {
  // Indices for each subgroup in the random category array
  // animals: 0-49, famous people: 50-89, emotions: 90-109, life events: 110-128,
  // cars: 129-148, clothing: 149-171, countries: 172-196, instruments: 197-221,
  // bands: 222-239, sports: 240-267, foods: 268-302, movies: 303-end
  const random = CATEGORIES["random"];
  return [
    ...random.slice(0, 50),      // animals
    ...random.slice(50, 90),     // famous people
    ...random.slice(90, 110),    // emotions
    ...random.slice(110, 129),   // life events
    ...random.slice(129, 149),   // cars
    ...random.slice(149, 172),   // clothing
    ...random.slice(172, 197),   // countries
    ...random.slice(197, 222),   // instruments
    ...random.slice(222, 240),   // bands
    ...random.slice(240, 268),   // sports
    ...random.slice(268, 303),   // foods
    ...random.slice(303)         // movies
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
