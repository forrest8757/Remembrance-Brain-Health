// Fruits (T6 Form B, Remembrance-original second category; equated: false).
// Credit rules, written in the style of the vegetable rules: superordinate and
// subordinate (apples and Granny Smith); varieties; less specific names
// (berries, melon); dried fruits named as fruits (raisins, prunes); botanical
// fruits commonly eaten as fruit (tomato and avocado after review).
// No credit: repetitions, prepared products (jam, juice, pie, applesauce,
// fruit salad), nuts and grains (they belong to the vegetable category).
import type { LexiconSource } from './lexicon';

export const fruitsSource: LexiconSource = {
  category: 'fruits',
  categoryNames: ['fruit'],
  groups: {
    berries: [
      'berry', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry', 'gooseberry', 'boysenberry', 'huckleberry',
      'elderberry', 'mulberry', 'loganberry', 'currant', 'black currant', 'red currant', 'acai=acai berry', 'goji berry', 'cloudberry',
      'lingonberry', 'marionberry', 'salmonberry', 'dewberry', 'serviceberry', 'chokeberry',
    ],
    citrus: [
      'orange', 'navel orange', 'blood orange', 'mandarin=mandarin orange', 'tangerine', 'clementine', 'satsuma', 'lemon', 'meyer lemon',
      'lime', 'key lime', 'grapefruit', 'pink grapefruit', 'pomelo=pummelo', 'kumquat', 'tangelo', 'citron', 'yuzu', 'bergamot', 'ugli fruit',
    ],
    tropical: [
      'banana', 'pineapple', 'mango', 'papaya', 'coconut', 'kiwi=kiwifruit=kiwi fruit', 'passion fruit', 'guava', 'lychee=litchi',
      'dragon fruit=pitaya', 'star fruit=carambola', 'jackfruit', 'durian', 'rambutan', 'mangosteen', 'longan', 'plantain', 'breadfruit',
      'tamarind', 'soursop', 'cherimoya', 'custard apple', 'feijoa', 'persimmon', 'pomegranate', 'date', 'fig', 'banana fruit', 'loquat',
    ],
    stoneFruit: ['peach', 'nectarine', 'plum', 'apricot', 'cherry', 'sour cherry', 'bing cherry', 'maraschino cherry', 'pluot', 'damson', 'olive', 'mango', 'date', 'lychee=litchi'],
    pome: [
      'apple', 'pear', 'quince', 'asian pear', 'crabapple=crab apple', 'granny smith', 'fuji=fuji apple', 'gala=gala apple', 'honeycrisp',
      'red delicious', 'golden delicious', 'mcintosh', 'pink lady', 'braeburn', 'jonagold', 'bartlett pear', 'bosc pear', 'anjou pear',
    ],
    melons: ['melon', 'watermelon', 'cantaloupe=cantelope', 'honeydew', 'muskmelon', 'casaba', 'crenshaw', 'galia melon', 'horned melon'],
    grapes: ['grape', 'red grape', 'green grape', 'concord grape', 'muscadine', 'scuppernong', 'raisin', 'sultana', 'champagne grape'],
    dried: ['raisin', 'prune', 'dried apricot', 'dried fig', 'date', 'craisin', 'dried cranberry', 'currant'],
    botanical: ['tomato', 'avocado', 'cucumber', 'pumpkin', 'eggplant', 'pepper', 'olive', 'rhubarb'],
  },
  noCredit: {
    prepared: [
      'jam', 'jelly', 'juice', 'orange juice', 'apple juice', 'lemonade', 'pie', 'apple pie', 'applesauce=apple sauce', 'fruit salad',
      'smoothie', 'marmalade', 'preserve', 'fruit cocktail', 'fruitcake=fruit cake', 'cider', 'wine', 'raisin bran', 'fruit roll up',
    ],
    notFruit: ['nut', 'peanut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'acorn', 'corn', 'rice', 'wheat', 'oat'],
  },
  // Usually called vegetables; credited for fruits only after a person checks.
  review: ['tomato', 'avocado', 'cucumber', 'pumpkin', 'eggplant', 'pepper', 'olive', 'rhubarb', 'plantain', 'coconut'],
};
