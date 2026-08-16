/**
 * PuzzlePlot Multi-Language Word Dictionaries & Pattern Search
 * Focused on English and Filipino (Tagalog) vocabulary and wildcard search.
 */

export const DictionaryData = {
  // English Common Crossword Lexicon
  en: [
    'ACE', 'ACT', 'AGE', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARK', 'ARM', 'ART', 'ASH', 'ASK',
    'AURA', 'AUTO', 'AWAY', 'AXIS', 'BABY', 'BACK', 'BAKE', 'BALL', 'BAND', 'BANK', 'BARK', 'BARN', 'BASE',
    'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BELL', 'BELT', 'BEND', 'BEST', 'BIRD', 'BITE', 'BLIP', 'BLOW', 'BLUE',
    'BOAT', 'BOLD', 'BOLT', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BOOT', 'BORE', 'BORN', 'BOSS', 'BOWL', 'BRAG',
    'BRED', 'BREE', 'BRIM', 'BULL', 'BUMP', 'BURN', 'BURP', 'BUSH', 'BUSY', 'CAFE', 'CAKE', 'CALM', 'CAMP',
    'CANE', 'CAPE', 'CARD', 'CARE', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CHAT', 'CHEF', 'CHIP',
    'CITY', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'CODE', 'COIL', 'COIN', 'COLD',
    'COLT', 'COMB', 'CONE', 'COOK', 'COOL', 'COPE', 'CORD', 'CORE', 'CORK', 'CORN', 'COST', 'COZY', 'CRAB',
    'CROP', 'CROW', 'CUBE', 'CURE', 'CURL', 'CUTE', 'DAME', 'DAMP', 'DARE', 'DARK', 'DART', 'DASH', 'DATE',
    'DAWN', 'DEAD', 'DEAF', 'DEAL', 'DEAR', 'DECK', 'DEED', 'DEEP', 'DEER', 'DEMO', 'DENT', 'DESK', 'DIAL',
    'DIET', 'DIME', 'DIRT', 'DISC', 'DISH', 'DISK', 'DIVE', 'DOCK', 'DOLL', 'DOME', 'DOOM', 'DOOR', 'DOSE',
    'DOVE', 'DOWN', 'DRAG', 'DRAW', 'DRIP', 'DROP', 'DRUM', 'DUAL', 'DUCK', 'DUET', 'DULL', 'DUNE', 'DUST',
    'DUTY', 'EACH', 'EARL', 'EARN', 'EARS', 'EASE', 'EAST', 'EASY', 'ECHO', 'EDGE', 'EDIT', 'EMIT', 'ENVY',
    'EPIC', 'EVEN', 'EVER', 'EVIL', 'EXAM', 'EXIT', 'EYES', 'FACE', 'FACT', 'FADE', 'FAIR', 'FALL', 'FAME',
    'FANG', 'FARM', 'FAST', 'FATE', 'FEAR', 'FEAT', 'FEED', 'FEEL', 'FEET', 'FELL', 'FELT', 'FERN', 'FILE',
    'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FLAG', 'FLAT', 'FLEA', 'FLEE', 'FLEX',
    'FLIP', 'FLOW', 'FOAM', 'FOIL', 'FOLD', 'FOLK', 'FOND', 'FOOD', 'FOOL', 'FOOT', 'FORD', 'FORK', 'FORM',
    'FORT', 'FOUL', 'FOUR', 'FREE', 'FROG', 'FROM', 'FUEL', 'FULL', 'FUND', 'FURY', 'FUSE', 'GAIN', 'GALA',
    'GAME', 'GATE', 'GEAR', 'GEMS', 'GENE', 'GIFT', 'GIRL', 'GLAD', 'GLEN', 'GLOW', 'GOAL', 'GOAT', 'GOLD',
    'GOLF', 'GONE', 'GOOD', 'GRAB', 'GRID', 'GRIN', 'GRIP', 'GROW', 'GULF', 'GURU', 'HAIL', 'HAIR', 'HALF',
    'HALL', 'HALT', 'HAND', 'HANG', 'HARD', 'HARE', 'HARM', 'HARP', 'HATE', 'HAVE', 'HAWK', 'HEAD', 'HEAL',
    'HEAP', 'HEAR', 'HEAT', 'HEED', 'HEEL', 'HEIR', 'HELD', 'HELM', 'HELP', 'HERB', 'HERD', 'HERO', 'HIDE',
    'HIGH', 'HIKE', 'HILL', 'HINT', 'HIRE', 'HISS', 'HIVE', 'HOLD', 'HOLE', 'HOME', 'HOOD', 'HOOK', 'HOPE',
    'HORN', 'HOSE', 'HOST', 'HOUR', 'HUGE', 'HUNT', 'HURT', 'HYMN', 'ICON', 'IDEA', 'IDLE', 'IDOL', 'INCH',
    'INFO', 'INTO', 'IRIS', 'IRON', 'ISLE', 'ITEM', 'JADE', 'JAIL', 'JAZZ', 'JEAN', 'JEEP', 'JOIN', 'JOKE',
    'JOLT', 'JUMP', 'JUNE', 'JURY', 'JUST', 'JUTE', 'KEEL', 'KEEN', 'KEEP', 'KELP', 'KICK', 'KILO', 'KIND',
    'KING', 'KISS', 'KITE', 'KNEE', 'KNOB', 'KNOT', 'KNOW', 'LACE', 'LACK', 'LADY', 'LAID', 'LAKE', 'LAMB',
    'LAMP', 'LAND', 'LANE', 'LAST', 'LATE', 'LAVA', 'LAWN', 'LEAD', 'LEAF', 'LEAP', 'LEFT', 'LEND', 'LENS',
    'LIFT', 'LIME', 'LINE', 'LINK', 'LION', 'LIPS', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAN', 'LOCK', 'LOGS',
    'LONG', 'LOOK', 'LOOP', 'LORD', 'LOSE', 'LOSS', 'LOUD', 'LOVE', 'LUCK', 'LUSH', 'LYNX', 'MADE', 'MAID',
    'MAIL', 'MAIN', 'MAKE', 'MALL', 'MANE', 'MAPS', 'MARK', 'MASK', 'MASS', 'MAST', 'MATE', 'MAZE', 'MEAL',
    'MEAN', 'MEAT', 'MEET', 'MELT', 'MEMO', 'MEND', 'MENU', 'MESA', 'MESH', 'MILD', 'MILE', 'MILK', 'MILL',
    'MIND', 'MINE', 'MINT', 'MIST', 'MOCK', 'MODE', 'MOOD', 'MOON', 'MOOR', 'MOSS', 'MOST', 'MOTH', 'MOVE',
    'MUCH', 'MULE', 'MUSE', 'MUST', 'MUTE', 'NAIL', 'NAME', 'NAVY', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEON',
    'NEST', 'NEWS', 'NEXT', 'NICE', 'NODE', 'NOON', 'NORM', 'NOSE', 'NOTE', 'OAKS', 'OARS', 'OATH', 'OBEY',
    'OCEAN', 'OCTET', 'OLIVE', 'OMEGA', 'ONION', 'OPERA', 'ORBIT', 'ORDER', 'ORGAN', 'OTHER', 'OTTER', 'OUNCE',
    'OUTER', 'OXIDE', 'OZONE', 'PANDA', 'PANEL', 'PANIC', 'PANSY', 'PAPER', 'PARCH', 'PARIS', 'PARKA', 'PARTY',
    'PATCH', 'PAUSE', 'PEACE', 'PEACH', 'PEARL', 'PEDAL', 'PENNY', 'PERCH', 'PETAL', 'PHASE', 'PIANO', 'PILOT',
    'PINCH', 'PIPER', 'PIVOT', 'PIXEL', 'PIZZA', 'PLACE', 'PLAID', 'PLAIN', 'PLANE', 'PLANK', 'PLANT', 'PLATE',
    'PLAZA', 'PLUME', 'PLUMP', 'POINT', 'POLAR', 'POLKA', 'POPPY', 'PORCH', 'POUND', 'POWER', 'PRAWN', 'PRIDE',
    'PRIME', 'PRISM', 'PRIZE', 'PROBE', 'PRONE', 'PROOF', 'PROSE', 'PROUD', 'PULSE', 'PUPIL', 'PUPPY', 'PURSE',
    'QUEEN', 'QUERY', 'QUEST', 'QUICK', 'QUIET', 'QUILT', 'QUIRK', 'QUOTA', 'QUOTE', 'RADAR', 'RADIO', 'RADON',
    'RANCH', 'RANGE', 'RAPID', 'RATIO', 'RAVEN', 'RAZOR', 'REACH', 'REACT', 'REALM', 'REBEL', 'REGAL', 'REIGN',
    'RELAX', 'RELIC', 'REMIX', 'RENEW', 'REPAY', 'REPEL', 'REPLY', 'RESET', 'RESIN', 'RETRO', 'RIDER', 'RIDGE',
    'RIGHT', 'RIGID', 'RINSE', 'RIVAL', 'RIVER', 'ROAST', 'ROBOT', 'ROCKY', 'ROGUE', 'ROMAN', 'ROOFT', 'ROOST',
    'ROUND', 'ROUSE', 'ROUTE', 'ROYAL', 'RUBLE', 'RULER', 'RUMOR', 'RURAL', 'RUSTY', 'SABER', 'SADLY', 'SAINT',
    'SALAD', 'SALON', 'SALSA', 'SALTY', 'SANDY', 'SATIN', 'SAUCE', 'SCALE', 'SCARE', 'SCARF', 'SCENE', 'SCENT',
    'SCOOP', 'SCOPE', 'SCORE', 'SCOUT', 'SCRAM', 'SCREW', 'SCRUB', 'SEALS', 'SEDAN', 'SHADE', 'SHAFT', 'SHAKE',
    'SHALL', 'SHAME', 'SHANK', 'SHAPE', 'SHARE', 'SHARK', 'SHARP', 'SHEAR', 'SHED', 'SHEEP', 'SHEER', 'SHEET',
    'SHELF', 'SHELL', 'SHINE', 'SHINY', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE', 'SHORT', 'SHOUT', 'SHOWN', 'SHRUG',
    'SIGHT', 'SIGMA', 'SILENT', 'SILVER', 'SIMPLE', 'SINGER', 'SINGLE', 'SKETCH', 'SLIDER', 'SMILE', 'SMOOTH',
    'SNOWY', 'SOLAR', 'SOLID', 'SOLVE', 'SONAR', 'SONIC', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARK', 'SPAWN',
    'SPEAK', 'SPEAR', 'SPEED', 'SPELL', 'SPICE', 'SPICY', 'SPIDER', 'SPILL', 'SPINE', 'SPIRIT', 'SPLIT', 'SPOIL',
    'SPOON', 'SPORT', 'SPRAY', 'SPRING', 'SPRINT', 'SPRUCE', 'SQUARE', 'SQUASH', 'STABLE', 'STAFF', 'STAGE',
    'STAIN', 'STAIR', 'STAKE', 'STALK', 'STAMP', 'STAND', 'STARE', 'START', 'STATE', 'STEAM', 'STEEL', 'STEEP',
    'STEER', 'STICK', 'STILL', 'STING', 'STOCK', 'STONE', 'STOOL', 'STORM', 'STORY', 'STOVE', 'STRAP', 'STRAW',
    'STRAY', 'STREAM', 'STREET', 'STRESS', 'STRIKE', 'STRING', 'STRIP', 'STRONG', 'STUDIO', 'STYLE', 'SUGAR',
    'SUMMER', 'SUMMIT', 'SUNSET', 'SUPER', 'SUPPLY', 'SURF', 'SURGE', 'SWAN', 'SWEATER', 'SWEEP', 'SWEET',
    'SWIFT', 'SWING', 'SWITCH', 'SWORD', 'SYMBOL', 'SYRUP', 'TABLE', 'TABLET', 'TAILOR', 'TALENT', 'TANGO',
    'TARGET', 'TARIFF', 'TASTE', 'TEACH', 'TEAM', 'TEMPO', 'TENNIS', 'TERRA', 'THEME', 'THEORY', 'THIRST',
    'THORN', 'THREAD', 'THRIVE', 'THRONE', 'THUMB', 'TIGER', 'TIMBER', 'TIMELY', 'TOAST', 'TOKEN', 'TOMATO',
    'TONGUE', 'TOPAZ', 'TORCH', 'TOTAL', 'TOUCH', 'TOWER', 'TRACE', 'TRACK', 'TRACT', 'TRADE', 'TRAIL', 'TRAIN',
    'TRAIT', 'TRAMP', 'TRAVEL', 'TREAT', 'TREND', 'TRIAD', 'TRIAL', 'TRIBE', 'TRICK', 'TRIPOD', 'TROPHY', 'TROPIC',
    'TROUT', 'TRUCK', 'TRULY', 'TRUMP', 'TRUNK', 'TRUST', 'TRUTH', 'TULIP', 'TUNEL', 'TURBO', 'TURKEY', 'TURNIP',
    'TWELVE', 'TWIGS', 'TWIN', 'TWIST', 'TYPING', 'ULTRA', 'UMBRA', 'UNCLE', 'UNDER', 'UNIFY', 'UNION', 'UNIQUE',
    'UNITY', 'UNSET', 'UNTIE', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'UTILE', 'UTTER', 'VACANT',
    'VALET', 'VALID', 'VALLEY', 'VALOR', 'VALVE', 'VAPOR', 'VAULT', 'VECTOR', 'VELVET', 'VENDOR', 'VENT', 'VERB',
    'VERGE', 'VERIFY', 'VESSEL', 'VIABLE', 'VICTOR', 'VIDEO', 'VIGOR', 'VILLA', 'VIOLET', 'VIPER', 'VIRAL', 'VIRTUE',
    'VISION', 'VISIT', 'VISUAL', 'VITAL', 'VIVID', 'VOCAL', 'VOGUE', 'VOICE', 'VOLCANO', 'VORTEX', 'VOTER', 'VOYAGE',
    'WALNUT', 'WARMTH', 'WARNING', 'WARRIOR', 'WATER', 'WAVING', 'WEALTH', 'WEAPON', 'WEATHER', 'WEBSITE', 'WEEKLY',
    'WEIGHT', 'WELCOME', 'WHEEL', 'WHISPER', 'WIDGET', 'WILDLIFE', 'WINDOW', 'WINNER', 'WINTER', 'WISDOM', 'WIZARD',
    'WONDER', 'WOODEN', 'WORKER', 'WORLD', 'WORTHY', 'WRITER', 'YELLOW', 'YIELD', 'ZENITH', 'ZEPHYR', 'ZODIAC'
  ],

  // Filipino (Tagalog) Common Crossword Lexicon
  fil: [
    'AKO', 'ANO', 'ANG', 'ARAW', 'APOY', 'ALAM', 'ALON', 'ASO', 'ATIS', 'AWIT', 'AYOS', 'BATA', 'BALA', 'BAHO',
    'BAKA', 'BALI', 'BATO', 'BAYI', 'BIDA', 'BIGO', 'BILI', 'BISA', 'BITA', 'BIYA', 'BOLA', 'BOSO', 'BUAN',
    'BUHA', 'BUHO', 'BUKA', 'BUKO', 'BULA', 'BULI', 'BULO', 'BUNO', 'BURA', 'BURI', 'BUSA', 'BUSO', 'BUTI',
    'BAYA', 'DAMI', 'DAPO', 'DATI', 'DATO', 'DAYA', 'DILI', 'DINA', 'DITO', 'DIWA', 'DUGO', 'DUHA', 'DUSA',
    'GABI', 'GALA', 'GANA', 'GARA', 'GASA', 'GATA', 'GAYO', 'GIBA', 'GILI', 'GINA', 'GINO', 'GISA', 'GITA',
    'GUBA', 'GUHO', 'GULA', 'GULI', 'GURO', 'GUSA', 'GUTI', 'HABO', 'HAGA', 'HALA', 'HANA', 'HAPA', 'HARA',
    'HARI', 'HASA', 'HATA', 'HATI', 'HAYO', 'HIBA', 'HILA', 'HINA', 'HIPA', 'HITA', 'HIYA', 'HUBO', 'HULA',
    'HULI', 'HUNI', 'HUSA', 'IBON', 'IKAW', 'IKOT', 'ILOG', 'INIT', 'ISDA', 'ISIP', 'KAIN', 'KAPE', 'KASI',
    'KITA', 'KUBO', 'KUHA', 'KULI', 'KULA', 'KULO', 'KUTO', 'KUYA', 'LABI', 'LAKI', 'LAKO', 'LALA', 'LALO',
    'LAMI', 'LANA', 'LAPA', 'LAPI', 'LARA', 'LARI', 'LASA', 'LATA', 'LAWA', 'LAYA', 'LEEG', 'LIMA', 'LIMO',
    'LINA', 'LINO', 'LIPA', 'LIPO', 'LISA', 'LITA', 'LIWA', 'LIYA', 'LUBA', 'LUGA', 'LUHA', 'LUKO', 'LULA',
    'LULI', 'LUMA', 'LUMI', 'LUNA', 'LUPA', 'LUPO', 'LURA', 'LURI', 'LUSA', 'LUTO', 'MABA', 'MAGA', 'MAHA',
    'MAHI', 'MAKA', 'MAKI', 'MAKO', 'MALA', 'MALI', 'MALO', 'MAMA', 'MANA', 'MANI', 'MANO', 'MAPA', 'MARA',
    'MASA', 'MASI', 'MATA', 'MATI', 'MAWA', 'MAYA', 'MAYO', 'MILI', 'MURA', 'MUSA', 'MUTA', 'NANA', 'NANI',
    'NASA', 'NASI', 'NAWA', 'NILA', 'NINA', 'NIPA', 'NITA', 'NOON', 'OPO', 'ORAS', 'PAA', 'PAGA', 'PAGI',
    'PAGO', 'PAHA', 'PAHI', 'PAKA', 'PAKI', 'PAKO', 'PALA', 'PALI', 'PANA', 'PANI', 'PANO', 'PAPA', 'PARA',
    'PARI', 'PASA', 'PASI', 'PATA', 'PATI', 'PAWA', 'PAYO', 'PILI', 'PINO', 'PISO', 'PITA', 'POOK', 'PULA',
    'PULI', 'PULO', 'PUNA', 'PUNO', 'PURA', 'PURI', 'PUSA', 'PUSO', 'PUTI', 'PUTO', 'SABA', 'SABI', 'SABO',
    'SAGA', 'SAGO', 'SAKA', 'SAKI', 'SAKO', 'SALA', 'SALI', 'SAMA', 'SAMI', 'SAMO', 'SANA', 'SANG', 'SAPA',
    'SAPI', 'SAPO', 'SARA', 'SARI', 'SASA', 'SAYA', 'SAYO', 'SIGA', 'SILA', 'SILI', 'SILO', 'SINA', 'SINI',
    'SIPA', 'SIPI', 'SIRA', 'SIRO', 'SITA', 'SIYA', 'SUBO', 'SUHA', 'SUKA', 'SUKI', 'SUKO', 'SULA', 'SULI',
    'SULO', 'SUMA', 'SUNA', 'SUNI', 'SURA', 'SURI', 'SURO', 'SUSA', 'SUTI', 'SUYA', 'TAAS', 'TABA', 'TABI',
    'TABO', 'TAGA', 'TAGI', 'TAGO', 'TAHA', 'TAHI', 'TAHO', 'TAKA', 'TAKI', 'TAKO', 'TALA', 'TALI', 'TALO',
    'TAMA', 'TANA', 'TAPA', 'TAPI', 'TAPO', 'TARA', 'TARI', 'TASA', 'TASI', 'TASO', 'TATA', 'TATI', 'TATO',
    'TAWA', 'TAWI', 'TAWO', 'TAYA', 'TAYO', 'TIBA', 'TIKA', 'TILA', 'TILI', 'TIMA', 'TIMI', 'TIMO', 'TINA',
    'TIPA', 'TIPI', 'TIRA', 'TIRI', 'TIRO', 'TISA', 'TITA', 'TITO', 'TIYA', 'TIYO', 'TUBA', 'TUBI', 'TUBO',
    'TUGA', 'TUGO', 'TUHA', 'TUHO', 'TUKA', 'TUKO', 'TULA', 'TULI', 'TULO', 'TUMA', 'TUMI', 'TUMO', 'TUNA',
    'TUNG', 'TUPA', 'TUPI', 'TUPO', 'TURA', 'TURI', 'TURO', 'TUSA', 'TUSI', 'TUTA', 'TUTI', 'TUTO', 'TUWA',
    'TUWI', 'TUWO', 'UBAS', 'UGAT', 'ULAN', 'ULAT', 'ULAP', 'UMAG', 'UNA', 'UOD', 'UPAN', 'UPIS', 'URAS',
    'USOK', 'UTAK', 'UTOS', 'WALA', 'WALI', 'WATA', 'WIKA', 'WILI',
    'AGILA', 'AKLAT', 'ALAGA', 'ALILA', 'ALIW', 'AMBON', 'ANINO', 'ANTAS', 'ANYO', 'ARAL', 'ASUKAL',
    'BABAE', 'BAGAY', 'BAGYO', 'BAHAY', 'BAKOD', 'BALAK', 'BALAT', 'BALIK', 'BALITA', 'BALON', 'BANAL',
    'BANSA', 'BANYO', 'BARIL', 'BASAG', 'BATAS', 'BATIS', 'BAWAT', 'BAWAL', 'BAYAN', 'BAYANI', 'BIGAS',
    'BIGAT', 'BIGLA', 'BIHIS', 'BILANG', 'BILIS', 'BILOG', 'BINHI', 'BISIG', 'BIYAYA', 'BUKAS', 'BUKID',
    'BUNGA', 'BUNSO', 'BUROL', 'BUTIL', 'BUTO', 'BUWAN', 'DAGAT', 'DAHON', 'DAKILA', 'DALAW', 'DALOY',
    'DAMIT', 'DANGAL', 'DAPAT', 'DIWA', 'DIWATA', 'DUNONG', 'DUYAN', 'GABAY', 'GALANG', 'GALAW', 'GALING',
    'GAMIT', 'GAMOT', 'GANAP', 'GAYAK', 'GINTO', 'GITNA', 'GUBAT', 'GUHIT', 'GULAY', 'GULONG', 'GUTOM',
    'HABAG', 'HAGDAN', 'HALAGA', 'HALAMAN', 'HANAP', 'HANGAD', 'HANGIN', 'HAPON', 'HAYOP', 'HAYAG', 'HILAGA',
    'HILING', 'HIMIG', 'HINDI', 'HININGA', 'HINOG', 'HIPON', 'HIWAGA', 'HUDYAT', 'HUKOM', 'HULOG', 'HUSTO',
    'HUSAY', 'IBABA', 'IBAYO', 'IBIG', 'ILAW', 'ILOG', 'INGAT', 'INIP', 'IPON', 'ISLA', 'ITAAS', 'ITLOG',
    'IWAN', 'IWAS', 'IYAK', 'KABAYO', 'KAGAT', 'KAHOY', 'KAIBIGAN', 'KAILAN', 'KALABAW', 'KALAYAAN',
    'KALIWA', 'KAMAY', 'KAMPO', 'KANAN', 'KANDILA', 'KAPAG', 'KAPAL', 'KAPIT', 'KAPWA', 'KASAMA', 'KASAYSAYAN',
    'KATAPATAN', 'KAUGALIAN', 'KAWANI', 'KAYAMANAN', 'KILALA', 'KILOS', 'KILAY', 'KULAY', 'KULTURA', 'KUNDIMAN',
    'KUWENTO', 'LABAN', 'LAKAS', 'LALAKI', 'LAMIG', 'LANGIT', 'LANGGAM', 'LARAWAN', 'LARO', 'LIHAM', 'LIGAYA',
    'LINIS', 'LIPUNAN', 'LIWANAG', 'LUGAR', 'LUNGSOD', 'LUPAIN', 'MAAGA', 'MAALAT', 'MAALAM', 'MAAMO',
    'MABABANG', 'MABANGO', 'MABAIT', 'MABINI', 'MABUTI', 'MADALI', 'MADALAS', 'MAGALANG', 'MAGANDA', 'MAGALING',
    'MAHABA', 'MAHAL', 'MAHARLIKA', 'MAHINA', 'MAHUSAY', 'MAINGAT', 'MAINIT', 'MAINAM', 'MAIS', 'MAKATA',
    'MALABO', 'MALAKAS', 'MALAKI', 'MALALIM', 'MALAMAN', 'MALAWAK', 'MALAYA', 'MALAYO', 'MALIGAYA', 'MALINIS',
    'MALINAW', 'MALIIT', 'MALUNGKOT', 'MAMAMAYAN', 'MAPALAD', 'MAPAYAPA', 'MARAMI', 'MARANGAL', 'MARIKIT',
    'MASAGANA', 'MASARAP', 'MASAYANG', 'MASIGLA', 'MASINOP', 'MATABA', 'MATALINO', 'MATATAG', 'MATIPID',
    'MAUNLAD', 'MAUTAK', 'MAYAMAN', 'MAYROON', 'MEDALYA', 'MUNDO', 'MUSIKA', 'NAIS', 'NAMAN', 'NARITO',
    'NAROON', 'NATUTO', 'NAUNA', 'NGITI', 'ORASAN', 'PAALALA', 'PABULA', 'PADALA', 'PAG-ASA', 'PAG-IBIG',
    'PAGBATI', 'PAGLAYA', 'PAGOD', 'PAGSUBOK', 'PAHINA', 'PAHAYAGAN', 'PAHINGA', 'PALASYO', 'PALENGKE',
    'PALIGID', 'PANAHON', 'PANANALIG', 'PANGAKO', 'PANGARAP', 'PANGULO', 'PANITIKAN', 'PANTAY', 'PANYO',
    'PAPEL', 'PASKO', 'PATULOY', 'PAWIS', 'PAYAPA', 'PISTA', 'PISTAHAN', 'PULONG', 'PULUBI', 'PUSONG',
    'REGALO', 'RESPETO', 'RIZAL', 'SAGOT', 'SAGISAG', 'SAKLOLO', 'SAKSI', 'SALAMIN', 'SALAMAT', 'SALAPI',
    'SALITA', 'SAMAHAN', 'SANDALI', 'SANDATA', 'SANGGOL', 'SANGKAP', 'SAPATOS', 'SARIWA', 'SARILI', 'SAYAW',
    'SIGAW', 'SIGLO', 'SILANGAN', 'SIMBAHAN', 'SIMULA', 'SINING', 'SIPAG', 'SUKAT', 'SUKLI', 'SULAT',
    'SULONG', 'SUMIKAP', 'SUMPA', 'SUNDALO', 'SUNOD', 'TADHANA', 'TAGUMPAY', 'TAHANAN', 'TAHIMIK', 'TAON',
    'TALENTO', 'TALAS', 'TALUMPATI', 'TANGHALAN', 'TANGKAD', 'TANGGAP', 'TAO', 'TAPAT', 'TATAK', 'TATAG',
    'TIYAK', 'TIYAGA', 'TRADISYON', 'TUBIG', 'TUGON', 'TUGMA', 'TULA', 'TULONG', 'TUNAY', 'TUNOG', 'UGALI',
    'UNLAD', 'UPUAN', 'WAGAS', 'WATAWAT', 'WASTO', 'WIKANG', 'YAMAN', 'YAPAK'
  ]
};

export const DictionarySearch = {
  findMatches(pattern, language = 'en', maxResults = 30) {
    if (!pattern || pattern.trim() === '') return [];
    const cleaned = pattern.trim().toUpperCase().replace(/_/g, '?');
    const targetLen = cleaned.length;
    const wordList = DictionaryData[language] || DictionaryData['en'];

    const regexPattern = '^' + cleaned.replace(/\?/g, '[A-ZÑ]') + '$';
    const regex = new RegExp(regexPattern, 'i');

    const matches = [];
    for (let i = 0; i < wordList.length; i++) {
      const word = wordList[i].toUpperCase();
      if (word.length === targetLen && regex.test(word)) {
        matches.push(word);
        if (matches.length >= maxResults) break;
      }
    }
    return matches;
  }
};
