// Vegetables (T6 Form A, C2T Q9b). Credit rules (build doc §T6): superordinate
// and subordinate (peppers and jalapeños); less specific names (greens); nuts
// (peanuts, acorns); grains (corn, rice, wheat, oats); gourds; sugarcane;
// herbs; seaweed; tomato, avocado, pumpkin; legumes; culturally specific
// vegetables if dictionary-verifiable (e.g. jicama).
// No credit: repetitions, prepared products (pickles, tomato sauce, ketchup), spices.
import type { LexiconSource } from './lexicon';

export const vegetablesSource: LexiconSource = {
  category: 'vegetables',
  categoryNames: ['vegetable', 'veggie', 'veg', 'produce'],
  groups: {
    leafy: [
      'lettuce', 'iceberg lettuce=iceberg', 'romaine=romaine lettuce', 'butter lettuce', 'leaf lettuce', 'spinach', 'kale', 'chard=swiss chard',
      'collard greens=collards=collard', 'mustard greens', 'turnip greens', 'beet greens', 'greens', 'arugula', 'endive', 'escarole',
      'radicchio', 'watercress', 'cress', 'bok choy=bok choi=pak choi', 'napa cabbage', 'frisee', 'mesclun', 'microgreens', 'dandelion greens',
    ],
    cruciferous: [
      'cabbage', 'red cabbage', 'broccoli', 'cauliflower', 'brussels sprouts=brussels sprout=brussel sprouts=brussel sprout', 'kohlrabi',
      'broccolini', 'broccoli rabe=rapini', 'kale', 'bok choy=bok choi=pak choi', 'turnip', 'rutabaga', 'radish', 'daikon', 'horseradish',
      'collard greens=collards=collard', 'romanesco',
    ],
    roots: [
      'carrot', 'potato', 'sweet potato', 'yam', 'beet=beetroot', 'turnip', 'parsnip', 'radish', 'rutabaga', 'jicama', 'taro', 'cassava=yuca',
      'celery root=celeriac', 'ginger', 'turmeric root', 'horseradish', 'daikon', 'salsify', 'burdock', 'jerusalem artichoke=sunchoke',
      'red potato', 'russet potato=russet', 'yukon gold', 'new potato', 'fingerling', 'water chestnut', 'lotus root',
    ],
    alliums: ['onion', 'red onion', 'white onion', 'yellow onion', 'sweet onion', 'vidalia onion', 'green onion=scallion', 'spring onion', 'shallot', 'leek', 'garlic', 'chive', 'ramp', 'pearl onion'],
    legumes: [
      'bean', 'green bean=string bean', 'snap pea', 'snow pea', 'sugar snap pea', 'pea', 'green pea', 'chickpea=garbanzo=garbanzo bean',
      'lentil', 'kidney bean', 'black bean', 'pinto bean', 'navy bean', 'lima bean=butter bean', 'fava bean=broad bean', 'soybean=soy bean',
      'edamame', 'black eyed pea=blackeyed pea', 'wax bean', 'cannellini bean', 'mung bean', 'bean sprout', 'alfalfa sprout', 'sprout',
      'peanut', 'pole bean', 'runner bean', 'split pea', 'okra',
    ],
    squash: [
      'squash', 'zucchini', 'yellow squash', 'summer squash', 'winter squash', 'butternut squash=butternut', 'acorn squash', 'spaghetti squash',
      'pumpkin', 'gourd', 'cucumber', 'pickling cucumber', 'chayote', 'bitter melon', 'calabash', 'delicata squash', 'hubbard squash', 'kabocha',
    ],
    nightshades: [
      'tomato', 'cherry tomato', 'roma tomato', 'grape tomato', 'tomatillo', 'eggplant=aubergine', 'pepper', 'bell pepper',
      'green pepper', 'red pepper', 'yellow pepper', 'orange pepper', 'sweet pepper', 'chili pepper=chili=chile=chilli', 'jalapeno=jalapeño',
      'habanero', 'serrano', 'poblano', 'anaheim pepper', 'banana pepper', 'cayenne pepper', 'potato', 'pimento=pimiento',
    ],
    stalks: ['celery', 'asparagus', 'rhubarb', 'fennel', 'artichoke', 'bamboo shoot', 'hearts of palm=heart of palm', 'cardoon', 'kohlrabi', 'leek'],
    fruitVegetables: ['avocado', 'tomato', 'cucumber', 'eggplant=aubergine', 'olive', 'okra', 'corn', 'sweet corn', 'corn on the cob', 'pumpkin', 'plantain'],
    fungi: ['mushroom', 'portobello=portabella', 'shiitake', 'button mushroom', 'cremini', 'morel', 'chanterelle', 'oyster mushroom', 'truffle', 'enoki'],
    grains: ['corn', 'sweet corn', 'rice', 'wild rice', 'brown rice', 'wheat', 'oat', 'barley', 'rye', 'quinoa', 'millet', 'sorghum', 'buckwheat', 'maize', 'amaranth', 'spelt', 'sugarcane=sugar cane', 'bulgur', 'farro'],
    nuts: ['nut', 'peanut', 'acorn', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut=filbert', 'chestnut', 'macadamia', 'brazil nut', 'pine nut', 'water chestnut', 'sunflower seed', 'pumpkin seed', 'seed'],
    herbs: [
      'herb', 'parsley', 'cilantro=coriander', 'basil', 'mint', 'dill', 'oregano', 'thyme', 'rosemary', 'sage', 'tarragon', 'chive',
      'bay leaf', 'lemongrass', 'marjoram', 'chervil', 'sorrel', 'lovage', 'fennel', 'garlic',
    ],
    seaweed: ['seaweed', 'kelp', 'nori', 'kombu', 'wakame', 'dulse', 'sea vegetable'],
    other: ['plantain', 'cactus=nopal=nopales', 'aloe', 'yam', 'breadfruit', 'jackfruit', 'taro', 'malanga', 'tomatillo', 'fiddlehead', 'purslane'],
  },
  noCredit: {
    prepared: [
      'pickle', 'ketchup=catsup', 'tomato sauce', 'tomato paste', 'salsa', 'french fry=french fries=fries=fry', 'chip', 'potato chip',
      'coleslaw=cole slaw=slaw', 'sauerkraut', 'kimchi', 'hummus', 'guacamole', 'mashed potato', 'baked potato', 'hash brown',
      'salad', 'soup', 'pesto', 'relish', 'popcorn', 'tofu', 'soy sauce', 'peanut butter', 'cornbread=corn bread', 'bread', 'tater tot',
      'onion ring', 'succotash', 'ratatouille', 'stew', 'casserole', 'v8', 'vegetable juice', 'pasta', 'noodle', 'tortilla', 'flour',
      'oatmeal', 'cereal', 'grits', 'polenta', 'veggie burger', 'baked beans=baked bean', 'refried beans=refried bean', 'tempeh',
    ],
    spice: [
      'spice', 'black pepper', 'white pepper', 'salt', 'cinnamon', 'nutmeg', 'paprika', 'cumin', 'turmeric', 'clove', 'allspice',
      'cardamom', 'curry', 'curry powder', 'saffron', 'chili powder', 'garlic powder', 'onion powder', 'mustard', 'vanilla',
      'peppercorn', 'anise', 'star anise', 'mace', 'red pepper flakes',
    ],
  },
  // Commonly called fruits; credited for vegetables only after a person checks.
  review: ['olive', 'ginger', 'seed', 'sunflower seed', 'pumpkin seed', 'aloe', 'jackfruit', 'breadfruit', 'truffle', 'rhubarb'],
};
