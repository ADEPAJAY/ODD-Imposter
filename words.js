// words.js — Word pair database for Odd One Out
// Format: [majority_word, odd_word] — both are related but different enough to be suspicious

const WORD_PAIRS = {
  food: [
    ["Pizza", "Burger"], ["Sushi", "Sashimi"], ["Coffee", "Tea"],
    ["Ice Cream", "Gelato"], ["Pasta", "Noodles"], ["Bread", "Roti"],
    ["Chocolate", "Candy"], ["Cake", "Pastry"], ["Sandwich", "Wrap"],
    ["Fries", "Chips"], ["Salad", "Coleslaw"], ["Soup", "Stew"],
    ["Biryani", "Pulao"], ["Dosa", "Crepe"], ["Butter", "Margarine"],
    ["Milk", "Cream"], ["Orange Juice", "Lemonade"], ["Paneer", "Tofu"],
    ["Tacos", "Nachos"], ["Waffles", "Pancakes"], ["Mango", "Papaya"],
    ["Samosa", "Spring Roll"], ["Idli", "Dhokla"], ["Chicken", "Mutton"],
    ["Cheese", "Paneer"], ["Naan", "Paratha"], ["Kebab", "Tikka"],
    ["Brownie", "Cookie"], ["Croissant", "Muffin"], ["Lasagne", "Moussaka"],
    ["Popcorn", "Nachos"], ["Pani Puri", "Golgappa"], ["Halwa", "Kheer"],
  ],
  places: [
    ["Beach", "Desert"], ["Airport", "Train Station"], ["Hospital", "Clinic"],
    ["School", "College"], ["Library", "Bookstore"], ["Hotel", "Hostel"],
    ["Restaurant", "Café"], ["Stadium", "Arena"], ["Temple", "Mosque"],
    ["Mountain", "Hill"], ["Forest", "Jungle"], ["City", "Town"],
    ["Museum", "Gallery"], ["Park", "Garden"], ["Cinema", "Theatre"],
    ["Bank", "ATM"], ["Market", "Mall"], ["Office", "Workspace"],
    ["Gym", "Yoga Studio"], ["Spa", "Salon"], ["Prison", "Detention Centre"],
    ["Submarine", "Boat"], ["Space Station", "Satellite"], ["Farm", "Ranch"],
    ["Lighthouse", "Watchtower"], ["Cave", "Tunnel"], ["Bridge", "Overpass"],
    ["Palace", "Mansion"], ["Zoo", "Safari"], ["Waterfall", "Dam"],
    ["Taj Mahal", "Qutub Minar"], ["Hyderabad", "Secunderabad"],
  ],
  objects: [
    ["Pen", "Pencil"], ["Chair", "Stool"], ["Phone", "Tablet"],
    ["Laptop", "Desktop"], ["Watch", "Clock"], ["Knife", "Scissors"],
    ["Mirror", "Window"], ["Door", "Gate"], ["Bag", "Backpack"],
    ["Shoes", "Sandals"], ["Shirt", "T-Shirt"], ["Glasses", "Sunglasses"],
    ["Camera", "Webcam"], ["Headphones", "Earphones"], ["Pillow", "Cushion"],
    ["Toothbrush", "Toothpaste"], ["Key", "Lock"], ["Umbrella", "Raincoat"],
    ["Candle", "Torch"], ["Book", "Notebook"], ["Map", "GPS"],
    ["Hammer", "Wrench"], ["Needle", "Pin"], ["Rope", "Chain"],
    ["Guitar", "Ukulele"], ["Piano", "Keyboard"], ["Drum", "Tabla"],
    ["Soap", "Shampoo"], ["Towel", "Napkin"], ["Bottle", "Flask"],
    ["Remote", "Controller"], ["Battery", "Charger"], ["Cable", "Wire"],
  ],
  animals: [
    ["Lion", "Tiger"], ["Dog", "Wolf"], ["Cat", "Leopard"],
    ["Eagle", "Hawk"], ["Dolphin", "Whale"], ["Frog", "Toad"],
    ["Butterfly", "Moth"], ["Ant", "Termite"], ["Crocodile", "Alligator"],
    ["Rabbit", "Hare"], ["Horse", "Donkey"], ["Cow", "Buffalo"],
    ["Sheep", "Goat"], ["Monkey", "Gorilla"], ["Parrot", "Crow"],
    ["Elephant", "Rhinoceros"], ["Giraffe", "Camel"], ["Zebra", "Horse"],
    ["Shark", "Barracuda"], ["Penguin", "Seal"], ["Snake", "Lizard"],
    ["Spider", "Scorpion"], ["Pigeon", "Sparrow"], ["Peacock", "Pheasant"],
    ["Fox", "Jackal"], ["Bear", "Panda"], ["Deer", "Gazelle"],
    ["Crab", "Lobster"], ["Shrimp", "Prawn"], ["Turtle", "Tortoise"],
    ["Flamingo", "Heron"], ["Octopus", "Squid"], ["Bat", "Flying Fox"],
  ],
  movies: [
    ["Avengers", "Justice League"], ["Titanic", "The Poseidon Adventure"],
    ["Harry Potter", "Percy Jackson"], ["Star Wars", "Star Trek"],
    ["The Lion King", "The Jungle Book"], ["Fast & Furious", "Need for Speed"],
    ["Batman", "Superman"], ["Frozen", "Moana"], ["Inception", "Interstellar"],
    ["The Dark Knight", "Batman Begins"], ["RRR", "Baahubali"],
    ["3 Idiots", "Munna Bhai"], ["Pushpa", "KGF"], ["Dangal", "Mary Kom"],
    ["Sholay", "Deewar"], ["Bahubali", "Magadheera"], ["Liger", "Tiger"],
    ["Toy Story", "Shrek"], ["Finding Nemo", "Finding Dory"],
    ["Spider-Man", "Venom"], ["Iron Man", "Thor"], ["Black Panther", "Wakanda Forever"],
    ["The Matrix", "The Terminator"], ["Jurassic Park", "King Kong"],
    ["Home Alone", "Macaulay Culkin Movie"], ["Forrest Gump", "Cast Away"],
    ["The Godfather", "Scarface"], ["Parasite", "Oldboy"],
    ["Dilwale", "DDLJ"], ["Kabir Singh", "Arjun Reddy"],
    ["Allu Arjun Movie", "Ram Charan Movie"],
  ],
};

// Flat list of all pairs for "all categories" mode
WORD_PAIRS.all = Object.values(WORD_PAIRS)
  .flat()
  .filter((_, i, arr) => arr !== WORD_PAIRS.all); // avoid recursion

// Helper: get a random pair from a category, excluding recently used ones
function getRandomPair(category, usedPairs = []) {
  const pool = WORD_PAIRS[category] || WORD_PAIRS.all;
  const available = pool.filter(
    (pair) => !usedPairs.includes(pair[0] + "|" + pair[1])
  );
  if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return available[Math.floor(Math.random() * available.length)];
}
