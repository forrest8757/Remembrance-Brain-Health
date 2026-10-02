// Occupations (T6 Form C, Remembrance-original second category; equated: false).
// Credit rules, written in the style of the vegetable rules: any paid job,
// trade or profession, general or specific (doctor and surgeon); ranks and
// specialties (sergeant, pediatrician); job titles in common use.
// No credit: repetitions, the same job under another name or gender
// (actor/actress, waiter/waitress, mail carrier/mailman count once),
// fictional or non-job roles (wizard, superhero, grandmother), workplaces
// (hospital, factory).
import type { LexiconSource } from './lexicon';

export const occupationsSource: LexiconSource = {
  category: 'occupations',
  categoryNames: ['occupation', 'job', 'profession', 'career', 'work', 'worker', 'employee', 'trade'],
  groups: {
    health: [
      'doctor=physician', 'nurse', 'registered nurse', 'nurse practitioner', 'surgeon', 'dentist', 'dental hygienist=hygienist', 'pharmacist',
      'paramedic=emt', 'pediatrician', 'psychiatrist', 'psychologist', 'therapist', 'physical therapist', 'occupational therapist',
      'counselor', 'chiropractor', 'optometrist', 'ophthalmologist', 'veterinarian=vet', 'midwife', 'radiologist', 'anesthesiologist',
      'cardiologist', 'dermatologist', 'orthodontist', 'nursing assistant=cna', 'medical assistant', 'caregiver', 'home health aide',
      'lab technician', 'x ray technician', 'dietitian=nutritionist', 'audiologist', 'speech therapist', 'oncologist', 'neurologist',
    ],
    education: [
      'teacher', 'professor', 'principal', 'tutor', 'librarian', 'teaching assistant', 'coach', 'substitute teacher', 'kindergarten teacher',
      'school counselor', 'dean', 'lecturer', 'instructor', 'nanny', 'babysitter', 'daycare worker', 'preschool teacher',
    ],
    trades: [
      'carpenter', 'plumber', 'electrician', 'mechanic', 'welder', 'mason=bricklayer=stonemason', 'roofer', 'painter', 'builder',
      'construction worker', 'contractor', 'handyman', 'machinist', 'locksmith', 'blacksmith', 'glazier', 'plasterer', 'tiler',
      'landscaper', 'gardener', 'janitor=custodian', 'maintenance man', 'exterminator', 'upholsterer', 'tailor=seamstress',
      'cobbler=shoemaker', 'jeweler', 'watchmaker', 'cabinet maker', 'auto mechanic', 'hvac technician', 'lineman', 'ironworker',
      'pipefitter', 'boilermaker', 'millwright', 'surveyor', 'architect', 'drafter=draftsman', 'factory worker', 'assembly line worker',
    ],
    food: [
      'chef', 'cook', 'baker', 'butcher', 'waiter=waitress=server', 'bartender', 'dishwasher', 'busboy', 'host=hostess', 'barista',
      'caterer', 'pastry chef', 'sous chef', 'line cook', 'short order cook', 'sommelier', 'grocer', 'fishmonger', 'brewer', 'winemaker',
    ],
    law: [
      'lawyer=attorney', 'judge', 'paralegal', 'police officer=policeman=cop=policewoman', 'detective', 'sheriff', 'deputy', 'state trooper=trooper',
      'firefighter=fireman', 'security guard=guard', 'prison guard=corrections officer', 'bailiff', 'court reporter', 'politician',
      'senator', 'congressman=representative', 'mayor', 'governor', 'president', 'diplomat', 'ambassador', 'clerk', 'notary',
      'park ranger=ranger', 'game warden', 'fbi agent', 'spy', 'mail carrier=mailman=postman=letter carrier=postal worker', 'postmaster',
    ],
    military: ['soldier', 'sailor', 'marine', 'pilot', 'airman', 'general', 'colonel', 'captain', 'lieutenant', 'sergeant', 'admiral', 'officer', 'private', 'corporal', 'major', 'commander', 'navy seal'],
    arts: [
      'actor=actress', 'singer', 'musician', 'artist', 'painter', 'sculptor', 'dancer', 'ballerina', 'writer=author', 'poet', 'novelist',
      'journalist=reporter', 'editor', 'photographer', 'director', 'producer', 'composer', 'conductor', 'comedian', 'magician', 'clown',
      'model', 'designer', 'fashion designer', 'graphic designer', 'interior designer', 'illustrator', 'animator', 'news anchor=anchorman',
      'radio host=dj=disc jockey', 'pianist', 'guitarist', 'drummer', 'violinist', 'playwright', 'screenwriter', 'cartoonist', 'publisher',
    ],
    business: [
      'accountant', 'bookkeeper', 'banker', 'bank teller=teller', 'cashier', 'secretary', 'receptionist', 'administrative assistant',
      'office manager', 'manager', 'ceo=chief executive', 'executive', 'businessman=businesswoman=business owner', 'entrepreneur',
      'salesman=salesperson=saleswoman=sales rep', 'real estate agent=realtor', 'insurance agent', 'stockbroker=broker', 'financial advisor',
      'economist', 'consultant', 'auditor', 'tax preparer', 'loan officer', 'marketing manager', 'advertiser', 'human resources', 'recruiter',
      'clerk', 'store clerk', 'shopkeeper=store owner', 'retail worker', 'stock clerk', 'buyer', 'auctioneer', 'appraiser', 'telemarketer',
    ],
    science: [
      'scientist', 'chemist', 'biologist', 'physicist', 'engineer', 'civil engineer', 'mechanical engineer', 'electrical engineer',
      'computer programmer=programmer', 'software engineer=software developer=developer', 'web designer', 'data scientist', 'statistician',
      'mathematician', 'astronomer', 'geologist', 'meteorologist=weatherman', 'astronaut', 'researcher', 'lab assistant', 'pharmacologist',
      'archaeologist', 'anthropologist', 'botanist', 'zoologist', 'marine biologist', 'technician', 'it technician', 'analyst',
    ],
    transport: [
      'driver', 'truck driver=trucker', 'bus driver', 'taxi driver=cab driver=cabbie', 'chauffeur', 'delivery driver=delivery man',
      'pilot', 'flight attendant=stewardess=steward', 'air traffic controller', 'train conductor', 'engineer', 'captain', 'sailor',
      'ship captain', 'deckhand', 'mover', 'courier', 'dispatcher', 'garbage man=garbage collector=sanitation worker', 'crossing guard',
    ],
    agriculture: ['farmer', 'rancher', 'cowboy', 'fisherman', 'logger=lumberjack', 'miner=coal miner', 'beekeeper', 'shepherd', 'dairy farmer', 'farmhand=ranch hand', 'forester', 'hunter', 'trapper', 'groundskeeper'],
    religion: ['priest', 'minister', 'pastor', 'preacher', 'rabbi', 'nun', 'monk', 'bishop', 'chaplain', 'missionary', 'imam', 'reverend', 'deacon', 'pope'],
    sports: ['athlete', 'football player', 'baseball player', 'basketball player', 'golfer', 'jockey', 'referee=umpire=ref', 'personal trainer=trainer', 'lifeguard', 'boxer', 'wrestler', 'swimmer', 'tennis player', 'hockey player', 'soccer player'],
    service: [
      'hairdresser=hairstylist=stylist', 'barber', 'beautician=cosmetologist', 'manicurist', 'massage therapist=masseuse', 'housekeeper=maid',
      'cleaner', 'butler', 'doorman', 'bellhop', 'concierge', 'tour guide', 'travel agent', 'funeral director=undertaker=mortician',
      'social worker', 'pet groomer=groomer', 'dog walker', 'florist', 'photographer', 'interpreter=translator', 'usher', 'valet',
    ],
  },
  noCredit: {
    notAJob: [
      'wizard', 'witch', 'superhero', 'pirate', 'king', 'queen', 'prince', 'princess', 'knight', 'mother', 'father', 'mom', 'dad',
      'grandmother', 'grandfather', 'parent', 'student', 'retiree', 'volunteer', 'boss', 'hospital', 'factory', 'office', 'school',
    ],
  },
  review: ['homemaker', 'housewife', 'student', 'clown', 'spy', 'hunter', 'cowboy'],
};
