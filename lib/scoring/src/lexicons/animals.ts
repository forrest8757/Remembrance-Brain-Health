// Animals (T6, C2T Q9a). Credit rules (build doc §T6): breeds (terrier);
// male/female/infant names (bull, cow, calf); superordinate AND subordinate
// both credited (dog and terrier); birds, fish, reptiles, insects.
// No credit: repetitions, mythical animals.
//
// Subcategories follow Troyer et al. (1997): living environment (africa,
// australia, arctic, farm, northAmerica, water), human use (beastsOfBurden,
// fur, pets) and zoological groups.
import type { LexiconSource } from './lexicon';

export const animalsSource: LexiconSource = {
  category: 'animals',
  categoryNames: ['animal', 'creature', 'beast', 'critter', 'wildlife', 'pet'],
  groups: {
    africa: [
      'aardvark', 'antelope', 'baboon', 'buffalo', 'cheetah', 'chimpanzee=chimp', 'crocodile', 'elephant', 'gazelle',
      'giraffe', 'gnu', 'gorilla', 'hippopotamus=hippo', 'hyena', 'impala', 'jackal', 'leopard', 'lion', 'lioness',
      'meerkat', 'mongoose', 'ostrich', 'rhinoceros=rhino', 'warthog', 'wildebeest', 'zebra', 'okapi', 'lemur', 'mandrill',
      'cape buffalo', 'water buffalo', 'wild dog', 'flamingo', 'vulture', 'camel', 'dromedary',
    ],
    australia: ['kangaroo', 'koala=koala bear', 'wallaby', 'wombat', 'platypus', 'dingo', 'emu', 'kookaburra', 'tasmanian devil', 'echidna', 'cockatoo', 'joey', 'cassowary', 'quokka', 'numbat', 'possum', 'sugar glider'],
    arctic: ['polar bear', 'penguin', 'seal', 'walrus', 'arctic fox', 'caribou', 'reindeer', 'musk ox', 'snowy owl', 'narwhal', 'beluga=beluga whale', 'puffin', 'lemming', 'arctic hare', 'snow leopard', 'yak', 'sea lion', 'orca=killer whale', 'husky'],
    farm: [
      'cow', 'bull', 'calf', 'heifer', 'steer', 'ox', 'cattle', 'horse', 'stallion', 'mare', 'foal', 'colt', 'filly', 'pony',
      'pig', 'hog', 'boar', 'sow', 'piglet', 'swine', 'sheep', 'ram', 'ewe', 'lamb', 'goat', 'billy goat', 'nanny goat', 'kid',
      'chicken', 'rooster', 'hen', 'chick', 'turkey', 'duck', 'drake', 'duckling', 'goose', 'gander', 'gosling', 'donkey',
      'mule', 'burro', 'llama', 'alpaca', 'rabbit', 'barn cat', 'sheepdog', 'border collie', 'angus', 'hereford', 'holstein',
      'jersey cow', 'longhorn', 'clydesdale', 'guinea fowl', 'peacock', 'peahen', 'pheasant', 'quail', 'bantam', 'leghorn',
    ],
    northAmerica: [
      'bear', 'black bear', 'brown bear', 'grizzly=grizzly bear', 'deer', 'elk', 'moose', 'bison', 'buffalo', 'raccoon', 'skunk',
      'squirrel', 'chipmunk', 'opossum=possum', 'porcupine', 'beaver', 'groundhog=woodchuck', 'coyote', 'wolf', 'fox', 'red fox',
      'bobcat', 'lynx', 'cougar=mountain lion=puma', 'badger', 'otter', 'mink', 'armadillo', 'prairie dog', 'jackrabbit',
      'pronghorn', 'mountain goat', 'bighorn sheep', 'wolverine', 'marten', 'weasel', 'bald eagle', 'eagle', 'hawk',
      'rattlesnake', 'alligator', 'gila monster', 'roadrunner', 'turkey vulture', 'wild turkey',
    ],
    water: [
      'fish', 'whale', 'dolphin', 'porpoise', 'shark', 'great white=great white shark', 'hammerhead=hammerhead shark', 'octopus',
      'squid', 'jellyfish', 'starfish=sea star', 'crab', 'lobster', 'shrimp', 'prawn', 'clam', 'oyster', 'mussel', 'scallop',
      'snail', 'sea urchin', 'sea horse=seahorse', 'eel', 'stingray=ray', 'manta ray', 'seal', 'sea lion', 'walrus', 'otter',
      'sea otter', 'manatee', 'dugong', 'sea turtle', 'turtle', 'frog', 'crawfish=crayfish=crawdad', 'coral', 'sponge',
      'anemone=sea anemone', 'barnacle', 'krill', 'plankton', 'blue whale', 'humpback=humpback whale', 'sperm whale', 'orca=killer whale',
      'narwhal', 'beluga=beluga whale', 'pelican', 'seagull=gull', 'duck', 'swan', 'goose', 'penguin', 'hippopotamus=hippo',
      'beaver', 'platypus', 'alligator', 'crocodile', 'nautilus', 'cuttlefish', 'sea cucumber', 'sand dollar', 'conch',
    ],
    pets: [
      'dog', 'puppy=pup', 'cat', 'kitten=kitty', 'tomcat=tom cat', 'hamster', 'gerbil', 'guinea pig', 'rabbit', 'bunny', 'mouse', 'rat',
      'ferret', 'parakeet', 'budgie', 'parrot', 'canary', 'cockatiel', 'goldfish', 'guppy', 'betta=beta fish', 'turtle', 'tortoise',
      'iguana', 'gecko', 'chinchilla', 'hedgehog', 'snake', 'lizard', 'pony', 'horse', 'lovebird', 'finch', 'angelfish', 'tetra',
    ],
    beastsOfBurden: ['horse', 'donkey', 'mule', 'ox', 'camel', 'llama', 'yak', 'elephant', 'water buffalo', 'burro', 'reindeer', 'sled dog', 'husky', 'clydesdale'],
    fur: ['mink', 'fox', 'beaver', 'chinchilla', 'rabbit', 'sable', 'ermine', 'muskrat', 'seal', 'raccoon', 'otter', 'lynx', 'bobcat', 'coyote', 'wolf', 'bear'],
    birds: [
      'bird', 'robin', 'sparrow', 'blue jay=bluejay', 'jay', 'cardinal', 'crow', 'raven', 'blackbird', 'starling', 'pigeon', 'dove',
      'mourning dove', 'eagle', 'bald eagle', 'golden eagle', 'hawk', 'falcon', 'peregrine falcon', 'osprey', 'kestrel', 'vulture',
      'buzzard', 'condor', 'owl', 'barn owl', 'snowy owl', 'hoot owl', 'woodpecker', 'hummingbird', 'swallow', 'wren', 'finch',
      'goldfinch', 'chickadee', 'oriole', 'bluebird', 'meadowlark', 'mockingbird', 'thrush', 'warbler', 'lark', 'nightingale',
      'magpie', 'parrot', 'macaw', 'cockatoo', 'parakeet', 'canary', 'toucan', 'pelican', 'flamingo', 'stork', 'crane', 'heron',
      'egret', 'ibis', 'seagull=gull', 'albatross', 'puffin', 'penguin', 'ostrich', 'emu', 'kiwi', 'peacock', 'pheasant', 'quail',
      'grouse', 'partridge', 'turkey', 'chicken', 'rooster', 'hen', 'duck', 'mallard', 'goose', 'swan', 'loon', 'kingfisher',
      'roadrunner', 'cuckoo', 'grackle', 'cowbird', 'nuthatch', 'titmouse', 'sandpiper', 'killdeer', 'tern', 'cormorant',
      'condor', 'myna=mynah', 'lovebird', 'budgie', 'cockatiel', 'whippoorwill', 'tanager', 'bunting', 'junco',
    ],
    canine: [
      'dog', 'puppy=pup', 'wolf', 'fox', 'coyote', 'jackal', 'dingo', 'hyena', 'wild dog', 'terrier', 'poodle', 'labrador=lab=labrador retriever',
      'golden retriever', 'retriever', 'beagle', 'collie', 'border collie', 'bulldog', 'dachshund=wiener dog', 'chihuahua',
      'german shepherd', 'shepherd', 'husky', 'boxer', 'great dane', 'pug', 'rottweiler', 'doberman=doberman pinscher', 'greyhound',
      'spaniel', 'cocker spaniel', 'shih tzu', 'schnauzer', 'pit bull=pitbull', 'corgi', 'sheepdog', 'dalmatian', 'mastiff',
      'bloodhound', 'basset hound', 'hound', 'saint bernard=st bernard', 'yorkie=yorkshire terrier', 'maltese', 'pomeranian',
      'labradoodle', 'goldendoodle', 'malamute', 'pekingese', 'setter', 'irish setter', 'pointer', 'weimaraner', 'whippet',
      'akita', 'chow=chow chow', 'samoyed', 'newfoundland', 'airedale', 'scottie=scottish terrier', 'jack russell', 'sled dog',
    ],
    feline: [
      'cat', 'kitten=kitty', 'tomcat=tom cat', 'lion', 'lioness', 'tiger', 'leopard', 'cheetah', 'jaguar', 'panther', 'cougar=mountain lion=puma',
      'lynx', 'bobcat', 'ocelot', 'snow leopard', 'wildcat', 'siamese', 'persian', 'tabby', 'calico', 'maine coon', 'burmese', 'alley cat', 'barn cat',
    ],
    bovine: ['cow', 'bull', 'calf', 'heifer', 'steer', 'ox', 'cattle', 'bison', 'buffalo', 'yak', 'water buffalo', 'musk ox', 'angus', 'hereford', 'holstein', 'jersey cow', 'longhorn', 'gnu', 'wildebeest'],
    deer: ['deer', 'buck', 'doe', 'fawn', 'stag', 'elk', 'moose', 'caribou', 'reindeer', 'antelope', 'gazelle', 'impala', 'pronghorn', 'white tail=whitetail'],
    equine: ['horse', 'stallion', 'mare', 'foal', 'colt', 'filly', 'pony', 'shetland pony', 'donkey', 'mule', 'burro', 'zebra', 'mustang', 'bronco', 'arabian', 'clydesdale', 'thoroughbred', 'appaloosa', 'palomino', 'quarter horse', 'pinto'],
    primates: ['monkey', 'ape', 'gorilla', 'chimpanzee=chimp', 'orangutan', 'baboon', 'lemur', 'gibbon', 'bonobo', 'mandrill', 'marmoset', 'capuchin', 'spider monkey', 'howler monkey', 'tamarin', 'macaque'],
    rodents: [
      'mouse', 'rat', 'squirrel', 'chipmunk', 'hamster', 'gerbil', 'guinea pig', 'beaver', 'porcupine', 'groundhog=woodchuck', 'prairie dog',
      'chinchilla', 'lemming', 'vole', 'mole', 'shrew', 'muskrat', 'gopher', 'capybara', 'dormouse', 'field mouse', 'flying squirrel',
    ],
    rabbits: ['rabbit', 'bunny', 'hare', 'jackrabbit', 'cottontail', 'arctic hare', 'pika'],
    weasels: ['weasel', 'ferret', 'mink', 'otter', 'sea otter', 'badger', 'wolverine', 'skunk', 'marten', 'ermine', 'stoat', 'sable', 'polecat', 'honey badger'],
    bears: ['bear', 'black bear', 'brown bear', 'grizzly=grizzly bear', 'polar bear', 'panda=panda bear=giant panda', 'kodiak=kodiak bear', 'sun bear', 'sloth bear', 'cub'],
    reptiles: [
      'reptile', 'amphibian', 'snake', 'rattlesnake', 'cobra', 'python', 'boa=boa constrictor', 'anaconda', 'viper', 'copperhead',
      'cottonmouth=water moccasin', 'garter snake', 'king snake', 'black mamba=mamba', 'lizard', 'iguana', 'gecko', 'chameleon',
      'komodo dragon', 'gila monster', 'skink', 'monitor lizard', 'horned toad', 'alligator=gator', 'crocodile=croc', 'caiman',
      'turtle', 'tortoise', 'sea turtle', 'snapping turtle', 'box turtle', 'frog', 'bullfrog', 'tree frog', 'toad', 'tadpole',
      'salamander', 'newt', 'axolotl', 'dinosaur', 'tyrannosaurus=t rex=trex', 'brontosaurus', 'triceratops', 'stegosaurus', 'velociraptor=raptor', 'pterodactyl',
    ],
    insects: [
      'insect', 'bug', 'ant', 'fire ant', 'bee', 'honeybee=honey bee', 'bumblebee=bumble bee', 'wasp', 'hornet', 'yellow jacket',
      'fly', 'housefly', 'fruit fly', 'horsefly', 'mosquito', 'gnat', 'beetle', 'ladybug=ladybird', 'firefly=lightning bug',
      'butterfly', 'moth', 'caterpillar', 'grasshopper', 'cricket', 'locust', 'cicada', 'katydid', 'praying mantis=mantis',
      'dragonfly', 'damselfly', 'cockroach=roach', 'termite', 'flea', 'tick', 'louse', 'aphid', 'earwig', 'silverfish',
      'stink bug', 'walking stick=stick bug', 'june bug', 'weevil', 'boll weevil', 'spider', 'tarantula', 'black widow', 'scorpion',
      'centipede', 'millipede', 'worm', 'earthworm', 'inchworm', 'slug', 'leech', 'mite', 'monarch=monarch butterfly',
    ],
    fish: [
      'fish', 'salmon', 'trout', 'rainbow trout', 'bass', 'largemouth bass', 'catfish', 'carp', 'perch', 'pike', 'walleye', 'tuna',
      'swordfish', 'marlin', 'sailfish', 'cod', 'halibut', 'flounder', 'sole', 'tilapia', 'snapper', 'red snapper', 'grouper',
      'mackerel', 'herring', 'sardine', 'anchovy', 'minnow', 'goldfish', 'koi', 'guppy', 'betta=beta fish', 'angelfish', 'clownfish',
      'piranha', 'barracuda', 'eel', 'shark', 'stingray=ray', 'blowfish=pufferfish=puffer fish', 'sturgeon', 'crappie', 'bluegill',
      'sunfish', 'haddock', 'pollock', 'whitefish', 'mahi mahi=mahi', 'seahorse=sea horse', 'tetra', 'zebrafish', 'lionfish', 'swordtail',
    ],
    insectivores: ['mole', 'shrew', 'hedgehog', 'bat', 'vampire bat', 'fruit bat', 'anteater', 'aardvark', 'armadillo', 'pangolin', 'echidna'],
    other: ['sloth', 'kangaroo rat', 'tapir', 'red panda', 'wild boar', 'boar', 'mammal', 'marsupial', 'raccoon dog', 'binturong', 'manatee', 'hyrax'],
  },
  noCredit: {
    mythical: [
      'unicorn', 'dragon', 'griffin=gryphon', 'phoenix', 'mermaid', 'merman', 'centaur', 'pegasus', 'bigfoot', 'sasquatch', 'yeti',
      'loch ness monster=nessie', 'chupacabra', 'kraken', 'minotaur', 'hydra', 'cyclops', 'werewolf', 'vampire', 'sphinx', 'basilisk',
      'jackalope', 'leprechaun', 'fairy', 'goblin', 'troll', 'ogre', 'hippogriff', 'manticore', 'sea serpent', 'thunderbird',
    ],
  },
  // Extinct animals are real animals, but scorers differ; credit after review.
  review: ['dinosaur', 'tyrannosaurus', 'brontosaurus', 'triceratops', 'stegosaurus', 'velociraptor', 'pterodactyl', 'kid', 'jersey cow', 'worm', 'earthworm', 'inchworm', 'slug', 'leech', 'coral', 'sponge', 'plankton'],
};
