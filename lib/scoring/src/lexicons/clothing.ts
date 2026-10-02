// Articles of clothing: the T6 practice category (build doc §T6 practice:
// "shirt, tie, hat"; "shoes or coat"). Used to classify practice answers
// (codes 0–4) and to log clothing intrusions during the test categories.
import type { LexiconSource } from './lexicon';

export const clothingSource: LexiconSource = {
  category: 'clothing',
  categoryNames: ['clothing', 'clothes', 'article', 'articles', 'garment', 'outfit', 'apparel'],
  groups: {
    tops: ['shirt', 't shirt=tshirt=tee shirt=tee', 'blouse', 'sweater', 'sweatshirt', 'hoodie', 'cardigan', 'turtleneck', 'polo=polo shirt', 'tank top', 'vest', 'camisole', 'jersey', 'tunic', 'pullover'],
    bottoms: ['pants=trousers=slacks', 'jeans', 'shorts', 'skirt', 'leggings', 'tights', 'overalls', 'sweatpants', 'khakis', 'capris', 'culottes', 'kilt'],
    outer: ['coat', 'jacket', 'raincoat', 'parka', 'windbreaker', 'blazer', 'overcoat', 'trench coat', 'poncho', 'cape', 'shawl', 'fleece'],
    whole: ['dress', 'gown', 'suit', 'tuxedo=tux', 'jumpsuit', 'romper', 'uniform', 'robe', 'bathrobe', 'pajamas=pyjamas=pjs', 'nightgown', 'overall', 'sari', 'kimono', 'leotard', 'onesie', 'apron', 'bathing suit=swimsuit=swimming suit', 'bikini', 'swim trunks=trunks', 'wetsuit'],
    under: ['underwear', 'bra', 'boxers', 'briefs', 'panties', 'slip', 'undershirt', 'long johns', 'girdle', 'stockings', 'pantyhose', 'socks=sock', 'diaper', 'thong'],
    footwear: ['shoes=shoe', 'boots=boot', 'sneakers=sneaker=tennis shoes', 'sandals=sandal', 'slippers=slipper', 'heels=high heels', 'loafers', 'flip flops', 'clogs', 'moccasins', 'pumps', 'galoshes', 'cleats', 'oxfords'],
    accessories: ['hat', 'cap', 'baseball cap', 'beanie', 'bonnet', 'beret', 'fedora', 'helmet', 'tie=necktie', 'bow tie', 'scarf', 'gloves=glove', 'mittens=mitten', 'belt', 'suspenders', 'earmuffs', 'bandana', 'headband', 'cummerbund', 'veil', 'turban', 'cowboy hat', 'sun hat'],
  },
};
