/* Breakaway — static game data */
(function (G) {
  'use strict';

  // ---------------------------------------------------------------- nations
  // weight = share of draws (tuned to look semi-realistic, not to be exact)
  const NATIONS = [
    { c: 'CA', n: 'Canada', w: 420 }, { c: 'US', n: 'United States', w: 290 }, { c: 'SE', n: 'Sweden', w: 80 },
    { c: 'RU', n: 'Russia', w: 50 }, { c: 'FI', n: 'Finland', w: 50 }, { c: 'CZ', n: 'Czechia', w: 40 },
    { c: 'CH', n: 'Switzerland', w: 18 }, { c: 'SK', n: 'Slovakia', w: 15 }, { c: 'DE', n: 'Germany', w: 12 },
    { c: 'DK', n: 'Denmark', w: 8 }, { c: 'LV', n: 'Latvia', w: 5 }, { c: 'AT', n: 'Austria', w: 4 },
    { c: 'NO', n: 'Norway', w: 3 }, { c: 'SI', n: 'Slovenia', w: 2 }, { c: 'FR', n: 'France', w: 2 },
    { c: 'BY', n: 'Belarus', w: 2 }, { c: 'UA', n: 'Ukraine', w: 2 }, { c: 'KZ', n: 'Kazakhstan', w: 2 },
    { c: 'LT', n: 'Lithuania', w: 1 }, { c: 'PL', n: 'Poland', w: 1 }, { c: 'IT', n: 'Italy', w: 1 },
    { c: 'JP', n: 'Japan', w: 1 }, { c: 'AU', n: 'Australia', w: 1 }, { c: 'GB', n: 'United Kingdom', w: 1 },
    { c: 'NL', n: 'Netherlands', w: 1 }, { c: 'KR', n: 'South Korea', w: 1 }, { c: 'HR', n: 'Croatia', w: 1 },
    { c: 'EE', n: 'Estonia', w: 1 }, { c: 'HU', n: 'Hungary', w: 1 }, { c: 'RO', n: 'Romania', w: 1 },
    { c: 'RS', n: 'Serbia', w: 1 }, { c: 'IS', n: 'Iceland', w: 1 }, { c: 'ES', n: 'Spain', w: 1 },
    { c: 'BE', n: 'Belgium', w: 1 }, { c: 'IE', n: 'Ireland', w: 1 }, { c: 'CN', n: 'China', w: 1 },
    { c: 'NZ', n: 'New Zealand', w: 1 }, { c: 'BR', n: 'Brazil', w: 1 }, { c: 'MX', n: 'Mexico', w: 1 },
    { c: 'ZA', n: 'South Africa', w: 1 }, { c: 'IL', n: 'Israel', w: 1 }
  ];

  // Name pools: common, believable names for each country (no famous NHL surnames)
  const NAMES = {
    CA: {
      f: ['Connor', 'Tyler', 'Brayden', 'Dylan', 'Nathan', 'Logan', 'Cole', 'Riley', 'Brett', 'Carter', 'Hayden', 'Keegan', 'Owen', 'Jordan', 'Mathieu',
        'Jacob', 'Evan', 'Nolan', 'Ethan', 'Luke', 'Gabriel', 'Samuel', 'Alexis', 'Tristan', 'Liam', 'Noah', 'Wyatt', 'Jake', 'Kyle', 'Brandon', 'Justin', 'Mitchell'],
      l: ['Thibault', 'MacLeod', 'Fournier', 'Cardinal', 'Beaupre', 'Hollis', 'Rousseau', 'Driscoll', 'Quigley', 'Tremblay', 'Oakes', 'Pelletier', 'Grant', 'Gagnon',
        'Lavoie', 'Morrison', 'Fraser', 'Gauthier', 'Campbell', 'Desjardins', 'Lindsay', 'Paquette', 'Whitfield', 'MacKinnon', 'Bergeron', 'Ouellette', 'Arsenault',
        'Thompson', 'Mercer', 'Lafleur', 'Boudreau', 'McAllister', 'Chisholm', 'Dumont', 'Gillis', 'Robertson', 'Cormier', 'Leblanc', 'Henderson', 'Doucet']
    },
    US: {
      f: ['Jack', 'Brock', 'Zach', 'Trevor', 'Austin', 'Colton', 'Garrett', 'Weston', 'Blake', 'Quinn', 'Tanner', 'Beau', 'Chase', 'Ryder', 'Mason', 'Hunter',
        'Cody', 'Brady', 'Kyle', 'Sean', 'Drew', 'Matt', 'Grady', 'Jesse', 'Tucker', 'Cade', 'Reid', 'Shane', 'Caleb', 'Bryce', 'Nate', 'Tommy'],
      l: ['Weaver', 'Caldwell', 'Morrow', 'Shelby', 'Hutchins', 'Brandt', 'Vance', 'Hollister', 'Donnelly', 'Pike', 'Granger', 'Cobb', 'Sullivan', 'Fitzgerald',
        'Mahoney', 'Hartley', 'Carlson', 'Prescott', 'Whitman', 'Delaney', 'McCabe', 'Brennan', 'Keller', 'Dunn', 'Hayes', 'Bennett', 'Walsh', 'Gallagher',
        'Peterson', 'Callahan', 'Russell', 'Harmon', 'Bishop', 'Douglas', 'Foster', 'Rowe', 'Sawyer', 'Mitchell', 'Coleman', 'Barrett']
    },
    SE: {
      f: ['Elias', 'Viktor', 'Rasmus', 'Oskar', 'Hampus', 'Filip', 'Gustav', 'Albin', 'Lucas', 'Melker', 'Isak', 'Axel', 'Linus', 'Jesper', 'Anton', 'Emil', 'Olle', 'Ludvig', 'Johan', 'Erik'],
      l: ['Lindqvist', 'Sallstrom', 'Bergkvist', 'Nyholm', 'Ekstrom', 'Soderberg', 'Wallin', 'Ahlgren', 'Holmberg', 'Sundqvist', 'Lundin', 'Engstrom', 'Nordin',
        'Bjorklund', 'Hedlund', 'Akesson', 'Lindgren', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Svensson', 'Strand', 'Wikstrom', 'Hagberg']
    },
    RU: {
      f: ['Nikita', 'Artemi', 'Vadim', 'Kirill', 'Yegor', 'Maxim', 'Ilya', 'Danil', 'Timur', 'Roman', 'Pavel', 'Dmitri', 'Arseni', 'Semyon', 'Fyodor', 'Sergei', 'Alexei', 'Mikhail'],
      l: ['Vasilenko', 'Zhuravlev', 'Antipov', 'Shestakov', 'Ryabov', 'Kuzmin', 'Baranov', 'Lebedev', 'Morozov', 'Sokolov', 'Belov', 'Kozlov', 'Volkov',
        'Smirnov', 'Fedorov', 'Petrov', 'Popov', 'Orlov', 'Zaitsev', 'Novikov', 'Pavlov', 'Frolov', 'Gusev', 'Titov']
    },
    FI: {
      f: ['Eetu', 'Joonas', 'Aleksi', 'Miro', 'Kaapo', 'Niilo', 'Rasmus', 'Topi', 'Veeti', 'Arttu', 'Juho', 'Lauri', 'Ville', 'Otto', 'Sami', 'Teemu', 'Antti', 'Jesse'],
      l: ['Huhtala', 'Lehtinen', 'Koskela', 'Nieminen', 'Mustonen', 'Salminen', 'Hakkarainen', 'Heikkinen', 'Korpela', 'Peltonen', 'Saarinen', 'Makinen',
        'Hamalainen', 'Laaksonen', 'Lindholm', 'Kettunen', 'Rautiainen', 'Turunen', 'Hiltunen', 'Vaananen', 'Ojala', 'Lahtinen']
    },
    CZ: {
      f: ['Lukas', 'Ondrej', 'Matej', 'Tomas', 'Jakub', 'Dominik', 'Vojtech', 'Radek', 'Filip', 'Pavel', 'Adam', 'Jiri', 'Michal', 'Petr', 'Vaclav'],
      l: ['Horak', 'Dvorak', 'Novotny', 'Prochazka', 'Benes', 'Kratochvil', 'Sykora', 'Vesely', 'Cerny', 'Kolar', 'Pospisil', 'Svoboda', 'Kucera', 'Nemec',
        'Pokorny', 'Ruzicka', 'Fiser', 'Holub', 'Blaha', 'Zeman']
    },
    SK: {
      f: ['Juraj', 'Martin', 'Samuel', 'Marek', 'Tobias', 'Simon', 'Adam', 'Patrik', 'Michal', 'Lukas', 'Tomas', 'Peter'],
      l: ['Hudak', 'Kovacik', 'Bardos', 'Zilka', 'Strnad', 'Gernat', 'Horvath', 'Varga', 'Balaz', 'Molnar', 'Kollar', 'Benko', 'Simko', 'Lukac', 'Polak']
    },
    CH: {
      f: ['Nino', 'Timo', 'Sven', 'Loic', 'Janis', 'Reto', 'Noah', 'Gaetan', 'Luca', 'Yannick', 'Fabian', 'Damien', 'Marco', 'Joel'],
      l: ['Baumgartner', 'Hofer', 'Brunner', 'Marti', 'Suter', 'Meier', 'Keller', 'Gerber', 'Steiner', 'Frei', 'Moser', 'Wyss', 'Favre', 'Rochat', 'Gisler', 'Imhof']
    },
    DE: {
      f: ['Leon', 'Moritz', 'Tim', 'Lukas', 'Jonas', 'Felix', 'Nico', 'Maximilian', 'Paul', 'Jan', 'Tobias', 'Dominik', 'Kai', 'Marcel'],
      l: ['Hartmann', 'Wagner', 'Reichel', 'Becker', 'Schulz', 'Hoffmann', 'Krause', 'Bauer', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Kruger', 'Lehmann', 'Vogel']
    },
    DK: {
      f: ['Mads', 'Nikolaj', 'Frederik', 'Oliver', 'Jonas', 'Mikkel', 'Rasmus', 'Kasper', 'Magnus', 'Emil'],
      l: ['Jensen', 'Lauridsen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Rasmussen', 'Madsen', 'Kjaer', 'Holm', 'Bech']
    },
    LV: {
      f: ['Rudolfs', 'Teodors', 'Elvis', 'Kaspars', 'Martins', 'Janis', 'Roberts', 'Ralfs', 'Edgars', 'Toms', 'Arturs'],
      l: ['Ozolins', 'Kalnins', 'Berzins', 'Liepins', 'Krumins', 'Zarins', 'Balodis', 'Vitols', 'Eglitis', 'Abolins', 'Sprogis', 'Jansons']
    },
    AT: {
      f: ['Marco', 'Thomas', 'Benjamin', 'Lukas', 'Florian', 'Manuel', 'Stefan', 'David', 'Raphael', 'Fabio'],
      l: ['Gruber', 'Huber', 'Bauer', 'Wagner', 'Pichler', 'Steiner', 'Moser', 'Mayer', 'Hofer', 'Leitner', 'Berger', 'Fuchs', 'Eder', 'Schwarz']
    },
    NO: {
      f: ['Mats', 'Andreas', 'Jonas', 'Ole', 'Sondre', 'Henrik', 'Markus', 'Tobias', 'Eirik', 'Sander'],
      l: ['Olsen', 'Haugen', 'Bakke', 'Johansen', 'Larsen', 'Berg', 'Hagen', 'Dahl', 'Lie', 'Moen', 'Solberg', 'Strand', 'Aas']
    },
    SI: { f: ['Anze', 'Jan', 'Rok', 'Ziga', 'Luka', 'Matic', 'Nejc', 'Blaz'], l: ['Novak', 'Horvat', 'Kranjc', 'Zupan', 'Potocnik', 'Kovacic', 'Mlakar', 'Vidmar', 'Golob', 'Kos'] },
    FR: {
      f: ['Pierre', 'Antoine', 'Hugo', 'Louis', 'Yohann', 'Thomas', 'Maxime', 'Julien', 'Nicolas', 'Florian', 'Kevin'],
      l: ['Roussel', 'Texier', 'Thinel', 'Martin', 'Bernard', 'Dubois', 'Moreau', 'Lefebvre', 'Girard', 'Lambert', 'Fontaine', 'Chevalier', 'Mercier', 'Garnier']
    },
    BY: { f: ['Mikhail', 'Andrei', 'Yegor', 'Artyom', 'Dmitri', 'Pavel', 'Vladislav', 'Ilya'], l: ['Ivanov', 'Kovalev', 'Novik', 'Lisovski', 'Bondar', 'Savchenko', 'Krivko', 'Zhuk', 'Pashkevich', 'Malashenko'] },
    UA: { f: ['Oleksandr', 'Andriy', 'Bohdan', 'Taras', 'Dmytro', 'Mykola', 'Yaroslav', 'Ivan'], l: ['Shevchenko', 'Bondarenko', 'Kovalenko', 'Tkachenko', 'Kravchenko', 'Melnyk', 'Boyko', 'Oliynyk', 'Lysenko', 'Marchenko'] },
    KZ: { f: ['Talgat', 'Damir', 'Yerlan', 'Nikita', 'Arman', 'Daniyar', 'Ruslan', 'Alikhan'], l: ['Akhmetov', 'Rymbek', 'Nurlanov', 'Seitkali', 'Zhakupov', 'Abenov', 'Kaliyev', 'Tulegenov', 'Bekov', 'Omarov'] },
    LT: { f: ['Lukas', 'Mantas', 'Tomas', 'Darius', 'Paulius', 'Jonas'], l: ['Kazlauskas', 'Petrauskas', 'Jankauskas', 'Stankevicius', 'Vasiliauskas', 'Zukauskas', 'Butkus', 'Paulauskas'] },
    PL: { f: ['Krystian', 'Pawel', 'Kamil', 'Marcin', 'Bartosz', 'Mateusz', 'Jakub', 'Piotr'], l: ['Kowalski', 'Nowak', 'Wisniewski', 'Wojcik', 'Kaminski', 'Lewandowski', 'Zielinski', 'Mazur', 'Krawczyk', 'Dabrowski'] },
    IT: { f: ['Marco', 'Luca', 'Matteo', 'Davide', 'Alessandro', 'Simone', 'Andrea', 'Federico'], l: ['Ricci', 'Fontana', 'Colombo', 'Rossi', 'Bianchi', 'Romano', 'Gallo', 'Conti', 'Marino', 'Greco'] },
    JP: { f: ['Kenta', 'Haruto', 'Daichi', 'Yuto', 'Ren', 'Sota', 'Takumi', 'Riku'], l: ['Hirano', 'Takagi', 'Nakajima', 'Sato', 'Suzuki', 'Tanaka', 'Watanabe', 'Ito', 'Kobayashi', 'Yamada'] },
    AU: { f: ['Lachlan', 'Jack', 'Mitchell', 'Brodie', 'Callum', 'Riley', 'Jayden', 'Hamish'], l: ['Smith', 'Jones', 'Wilson', 'Taylor', 'Kelly', 'Murray', 'Ryan', 'Harrison', 'Walker', 'Clarke'] },
    GB: { f: ['Liam', 'Ben', 'Callum', 'Robert', 'Oliver', 'Harry', 'James', 'Jamie', 'Lewis', 'Ross'], l: ['Davies', 'Farmer', 'Dowd', 'Evans', 'Hughes', 'Wright', 'Turner', 'Phillips', 'Shaw', 'Fletcher', 'Ward', 'Baker'] },
    NL: { f: ['Daan', 'Sem', 'Lars', 'Thijs', 'Bram', 'Ruben', 'Jesse', 'Stijn'], l: ['de Jong', 'Jansen', 'de Vries', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Mulder', 'Bos', 'Vos'] },
    KR: { f: ['Min-jun', 'Ji-ho', 'Seo-jun', 'Hyun-woo', 'Dong-hyun', 'Sung-min'], l: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon'] },
    HR: { f: ['Luka', 'Ivan', 'Marko', 'Josip', 'Ante', 'Matej'], l: ['Horvat', 'Kovacevic', 'Babic', 'Maric', 'Juric', 'Novak', 'Knezevic', 'Vukovic'] },
    EE: { f: ['Rasmus', 'Markus', 'Robin', 'Martin', 'Karl', 'Sander'], l: ['Tamm', 'Saar', 'Sepp', 'Magi', 'Kask', 'Kukk', 'Rebane', 'Ilves'] },
    HU: { f: ['Bence', 'Mate', 'Levente', 'Daniel', 'Adam', 'Balazs'], l: ['Nagy', 'Kovacs', 'Toth', 'Szabo', 'Horvath', 'Varga', 'Kiss', 'Molnar'] },
    RO: { f: ['Andrei', 'Mihai', 'Alexandru', 'Stefan', 'Vlad', 'Cristian'], l: ['Popescu', 'Ionescu', 'Popa', 'Dumitru', 'Stan', 'Stoica', 'Gheorghe', 'Matei'] },
    RS: { f: ['Nikola', 'Stefan', 'Lazar', 'Milos', 'Marko', 'Luka'], l: ['Jovanovic', 'Petrovic', 'Nikolic', 'Markovic', 'Djordjevic', 'Stojanovic', 'Ilic', 'Pavlovic'] },
    IS: { f: ['Gunnar', 'Einar', 'Bjarki', 'Arnar', 'Sindri', 'Kristjan'], l: ['Jonsson', 'Sigurdsson', 'Gudmundsson', 'Magnusson', 'Olafsson', 'Einarsson', 'Kristjansson', 'Stefansson'] },
    ES: { f: ['Pablo', 'Alejandro', 'Javier', 'Daniel', 'Sergio', 'Adrian'], l: ['Garcia', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Perez', 'Gomez', 'Ruiz'] },
    BE: { f: ['Arthur', 'Louis', 'Jules', 'Wout', 'Lucas', 'Thibaut'], l: ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Dubois'] },
    IE: { f: ['Sean', 'Conor', 'Cian', 'Darragh', 'Patrick', 'Eoin'], l: ['Murphy', 'Kelly', 'Byrne', 'Ryan', 'Walsh', 'Doyle', 'McCarthy', 'Gallagher'] },
    CN: { f: ['Wei', 'Hao', 'Jun', 'Lei', 'Yang', 'Tao'], l: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang'] },
    NZ: { f: ['Liam', 'Jack', 'Oliver', 'Hamish', 'Nikau', 'Ethan'], l: ['Smith', 'Wilson', 'Thompson', 'Walker', 'Anderson', 'Mitchell', 'Ngata', 'Parata'] },
    BR: { f: ['Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Thiago', 'Bruno'], l: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida'] },
    MX: { f: ['Diego', 'Santiago', 'Mateo', 'Emiliano', 'Rodrigo', 'Andres'], l: ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Ramirez', 'Flores', 'Torres'] },
    ZA: { f: ['Ruan', 'Pieter', 'Liam', 'Johan', 'Ethan', 'Sipho'], l: ['van der Merwe', 'Botha', 'Nel', 'du Plessis', 'Pretorius', 'Smit', 'Naidoo', 'Dlamini'] },
    IL: { f: ['Noam', 'Itai', 'Yonatan', 'Omer', 'Eitan', 'Ariel'], l: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Friedman', 'Katz', 'Shapiro'] },
    _: {
      f: ['Alex', 'Daniel', 'Erik', 'Adrian', 'Sebastian', 'Martin', 'Thomas', 'David'],
      l: ['Larsen', 'Novak', 'Jansen', 'Mertens', 'Horvat', 'Falk', 'Borg', 'Nagy']
    }
  };

  // lower-division cities follow the player's favourite country when there is a list for it
  const CITY_BY_NAT = {
    CA: ['Kelowna', 'Brandon', 'Moncton', 'Thunder Bay', 'Saskatoon', 'Red Deer', 'Nanaimo', 'Sudbury', 'Kamloops', 'Rimouski', 'Prince Albert', 'Medicine Hat', 'Sarnia', 'Halifax', 'Lethbridge', 'Kingston'],
    US: ['Duluth', 'Spokane', 'Fargo', 'Bangor', 'Toledo', 'Wichita', 'Boise', 'Albany', 'Peoria', 'Tulsa', 'Erie', 'Muskegon', 'Sioux Falls', 'Green Bay', 'Lincoln', 'Madison'],
    SE: ['Malmo', 'Lulea', 'Frolunda', 'Skelleftea', 'Leksand', 'Linkoping', 'Vaxjo', 'Orebro', 'Timra', 'Brynas', 'Modo', 'Mora', 'Rogle', 'Karlskrona', 'Djurgarden', 'Farjestad'],
    FI: ['Lahti', 'Tampere', 'Turku', 'Oulu', 'Kuopio', 'Pori', 'Rauma', 'Jyvaskyla', 'Hameenlinna', 'Lappeenranta', 'Mikkeli', 'Joensuu', 'Vaasa', 'Seinajoki', 'Espoo', 'Kouvola'],
    RU: ['Kazan', 'Omsk', 'Ufa', 'Yaroslavl', 'Chelyabinsk', 'Magnitogorsk', 'Novosibirsk', 'Sochi', 'Khabarovsk', 'Nizhny', 'Cherepovets', 'Tolyatti', 'Podolsk', 'Kursk', 'Perm', 'Tver'],
    CZ: ['Zlin', 'Brno', 'Pilsen', 'Liberec', 'Pardubice', 'Kladno', 'Olomouc', 'Trinec', 'Vitkovice', 'Karlovy Vary', 'Litvinov', 'Jihlava', 'Hradec', 'Mlada', 'Budejovice', 'Kometa'],
    CH: ['Davos', 'Lugano', 'Bern', 'Zug', 'Fribourg', 'Geneva', 'Biel', 'Langnau', 'Ambri', 'Lausanne', 'Rapperswil', 'Kloten', 'Olten', 'Visp', 'Ajoie', 'Chur'],
    SK: ['Kosice', 'Nitra', 'Zvolen', 'Trencin', 'Poprad', 'Banska', 'Michalovce', 'Liptov', 'Zilina', 'Presov', 'Detva', 'Martin', 'Spisska', 'Ruzinov', 'Topolcany', 'Skalica'],
    DE: ['Mannheim', 'Cologne', 'Munich', 'Berlin', 'Ingolstadt', 'Krefeld', 'Augsburg', 'Iserlohn', 'Wolfsburg', 'Nuremberg', 'Straubing', 'Schwenningen', 'Bremerhaven', 'Dusseldorf', 'Kassel', 'Frankfurt'],
    DK: ['Odense', 'Aalborg', 'Herning', 'Esbjerg', 'Rodovre', 'Frederikshavn', 'Herlev', 'Rungsted', 'Sonderjylland', 'Aarhus', 'Gentofte', 'Hvidovre', 'Vojens', 'Silkeborg', 'Horsens', 'Vejle'],
    LV: ['Riga', 'Liepaja', 'Daugavpils', 'Jelgava', 'Ogre', 'Valmiera', 'Ventspils', 'Kurbads', 'Zemgale', 'Mogo', 'Prizma', 'Tukums', 'Sigulda', 'Cesis', 'Jurmala', 'Rezekne'],
    AT: ['Graz', 'Vienna', 'Salzburg', 'Klagenfurt', 'Villach', 'Linz', 'Innsbruck', 'Dornbirn', 'Feldkirch', 'Bregenz', 'Kitzbuhel', 'Zell', 'Steyr', 'Wels', 'Lustenau', 'Kapfenberg'],
    NO: ['Oslo', 'Stavanger', 'Lillehammer', 'Storhamar', 'Frisk', 'Sparta', 'Valerenga', 'Lorenskog', 'Narvik', 'Stjernen', 'Manglerud', 'Comet', 'Gruener', 'Tromso', 'Bergen', 'Trondheim'],
    FR: ['Grenoble', 'Rouen', 'Angers', 'Gap', 'Briancon', 'Chamonix', 'Amiens', 'Bordeaux', 'Cergy', 'Mulhouse', 'Nice', 'Anglet', 'Strasbourg', 'Dijon', 'Lyon', 'Epinal'],
    IT: ['Bolzano', 'Asiago', 'Val Pusteria', 'Merano', 'Renon', 'Fassa', 'Gardena', 'Cortina', 'Milano', 'Torino', 'Varese', 'Feltre', 'Pinerolo', 'Como', 'Alleghe', 'Vipiteno'],
    PL: ['Krakow', 'Katowice', 'Tychy', 'Sanok', 'Bytom', 'Torun', 'Gdansk', 'Jastrzebie', 'Oswiecim', 'Opole', 'Podhale', 'Unia', 'Zaglebie', 'Polonia', 'Lodz', 'Poznan'],
    JP: ['Sapporo', 'Tomakomai', 'Kushiro', 'Nikko', 'Hachinohe', 'Yokohama', 'Tokyo', 'Obihiro', 'Nagano', 'Sendai', 'Aomori', 'Osaka', 'Kobe', 'Nagoya', 'Fukuoka', 'Hiroshima'],
    GB: ['Belfast', 'Sheffield', 'Nottingham', 'Cardiff', 'Glasgow', 'Dundee', 'Fife', 'Guildford', 'Coventry', 'Manchester', 'Hull', 'Swindon', 'Basingstoke', 'Peterborough', 'Telford', 'Leeds'],
    UA: ['Kyiv', 'Kharkiv', 'Kremenchuk', 'Druzhkivka', 'Odesa', 'Lviv', 'Dnipro', 'Bila Tserkva', 'Sumy', 'Kherson', 'Zaporizhzhia', 'Poltava', 'Vinnytsia', 'Chernihiv', 'Rivne', 'Lutsk']
  };
  const CITIES = ['Kelowna', 'Brandon', 'Moncton', 'Thunder Bay', 'Saskatoon', 'Red Deer', 'Nanaimo', 'Sudbury',
    'Duluth', 'Spokane', 'Fargo', 'Bangor', 'Toledo', 'Wichita', 'Boise', 'Albany', 'Peoria', 'Tulsa',
    'Lahti', 'Malmo', 'Zlin', 'Davos', 'Graz', 'Odense'];
  const MASCOTS = ['Wolves', 'Ironmen', 'Otters', 'Thunder', 'Kings', 'Ravens', 'Bisons', 'Rockets', 'Mariners',
    'Pilots', 'Bruins', 'Cyclones', 'Steelheads', 'Foxes', 'Comets', 'Hawks', 'Knights', 'Lumberjacks',
    'Sabres', 'Grizzlies', 'Mustangs', 'Pioneers', 'Blizzard', 'Titans'];

  // ---------------------------------------------------------------- rarity
  // shards to promote climb steeply; goalies pay 1.5x (only two of them to build)
  const RARITY = [
    { k: 'common', n: 'Common', cap: 30, color: '#8b93a1', shards: 0 },
    { k: 'uncommon', n: 'Uncommon', cap: 45, color: '#3fa65c', shards: 60 },
    { k: 'rare', n: 'Rare', cap: 60, color: '#3b7dd8', shards: 200 },
    { k: 'epic', n: 'Epic', cap: 78, color: '#8a4fd1', shards: 500 },
    { k: 'legendary', n: 'Legendary', cap: 99, color: '#e07a1f', shards: 420 }
  ];
  const RIDX = {}; RARITY.forEach((r, i) => { RIDX[r.k] = i; });
  const GOLD = '#d4a620';
  const GOALIE_SHARD_MULT = 1.5;
  // the highest rarity a player can be promoted to, by division
  // highest rarity reachable by promotion. Legendary is never a promotion: draft, sign or win one.
  const PROMO_CAP = { 8: 2, 7: 2, 6: 3, 5: 3, 4: 3, 3: 3, 2: 3, 1: 3 };

  // ---------------------------------------------------------------- attrs
  const SKATER_ATTRS = ['skating', 'shooting', 'passing', 'hands', 'iq', 'grit', 'defense'];
  const GOALIE_ATTRS = ['gloveHigh', 'gloveLow', 'blockerHigh', 'blockerLow', 'fiveHole', 'quickness', 'positioning', 'rebound', 'iq', 'puckhandling'];
  const ATTR_LABEL = {
    skating: 'Skating', shooting: 'Shooting', passing: 'Passing', hands: 'Hands', iq: 'IQ', grit: 'Grit', defense: 'Defense',
    gloveHigh: 'High glove', gloveLow: 'Low glove', blockerHigh: 'High blocker', blockerLow: 'Low blocker',
    fiveHole: 'Five-hole', quickness: 'Quickness', positioning: 'Positioning', rebound: 'Rebound control', puckhandling: 'Puck handling'
  };

  // position-weighted overall
  const OVR_W = {
    C: { shooting: 0.20, passing: 0.24, hands: 0.20, skating: 0.14, iq: 0.18, grit: 0.02, defense: 0.02 },
    LW: { shooting: 0.26, passing: 0.16, hands: 0.22, skating: 0.18, iq: 0.10, grit: 0.05, defense: 0.03 },
    RW: { shooting: 0.26, passing: 0.16, hands: 0.22, skating: 0.18, iq: 0.10, grit: 0.05, defense: 0.03 },
    D: { defense: 0.34, skating: 0.22, iq: 0.18, grit: 0.12, passing: 0.10, hands: 0.02, shooting: 0.02 },
    G: { gloveHigh: 0.13, gloveLow: 0.11, blockerHigh: 0.11, blockerLow: 0.10, fiveHole: 0.11, quickness: 0.13, positioning: 0.12, rebound: 0.08, iq: 0.07, puckhandling: 0.04 }
  };

  // ---------------------------------------------------------------- player types
  // str: attributes that reach the full rarity cap; weak: capped lower. Legendary keeps the shape (strengths 99).
  // goal/ast/pim/hits/blk scale how the sim hands out those stats.
  const TYPES = {
    sniper: { n: 'Sniper', ab: 'SNP', g: 'F', str: ['shooting', 'hands'], weak: ['defense', 'grit'], goal: 1.4, ast: 0.85, pim: 0.5, hits: 0.6, blk: 0.6, d: 'Lives to shoot. Scores the most, defends the least.' },
    playmaker: { n: 'Playmaker', ab: 'PLY', g: 'F', str: ['passing', 'iq', 'hands'], weak: ['grit', 'defense'], goal: 0.8, ast: 1.45, pim: 0.5, hits: 0.6, blk: 0.7, d: 'Sets up linemates. Piles up assists.' },
    power: { n: 'Power Forward', ab: 'PWF', g: 'F', str: ['shooting', 'grit'], weak: ['hands', 'passing'], goal: 1.15, ast: 0.9, pim: 1.4, hits: 1.7, blk: 0.8, d: 'Goals and hits in one body. Takes penalties.' },
    twoway: { n: 'Two-Way Forward', ab: 'TWF', g: 'F', str: ['defense', 'iq', 'passing'], weak: ['shooting', 'hands', 'grit'], goal: 0.85, ast: 1.0, pim: 0.6, hits: 1.0, blk: 1.4, d: 'Plays both ends. Best plus-minus, high defense cap.' },
    enforcer: { n: 'Enforcer', ab: 'ENF', g: 'F', str: ['grit', 'defense'], weak: ['hands', 'passing', 'shooting'], goal: 0.55, ast: 0.6, pim: 3.2, hits: 2.8, blk: 1.1, d: 'Protects teammates. Hits, fights and penalty minutes.' },
    ofd: { n: 'Offensive Defenseman', ab: 'OFD', g: 'D', str: ['passing', 'shooting', 'skating'], weak: ['defense', 'grit'], goal: 1.7, ast: 1.45, pim: 0.7, hits: 0.7, blk: 0.8, d: 'Joins the rush. Points from the blue line.' },
    dfd: { n: 'Defensive Defenseman', ab: 'DFD', g: 'D', str: ['defense', 'grit'], weak: ['shooting', 'hands'], goal: 0.5, ast: 0.7, pim: 1.3, hits: 1.5, blk: 1.6, d: 'Shuts the door. Blocks shots, clears the crease.' },
    twd: { n: 'Two-Way Defenseman', ab: 'TWD', g: 'D', str: ['defense', 'passing'], weak: [], goal: 1.0, ast: 1.05, pim: 0.9, hits: 1.0, blk: 1.1, d: 'Balanced at both ends.' },
    goalie: { n: 'Goaltender', ab: 'G', g: 'G', str: [], weak: [], goal: 0, ast: 0.05, pim: 0.1, hits: 0, blk: 0, d: 'Ten separate skills. Hard to max out; a great one carries a team.' }
  };
  const TYPE_ODDS = { F: [['sniper', 22], ['playmaker', 22], ['power', 20], ['twoway', 22], ['enforcer', 14]], D: [['ofd', 33], ['dfd', 33], ['twd', 34]] };

  // ---------------------------------------------------------------- gear
  const GEAR_SLOTS = {
    skater: [
      { k: 'stick', n: 'Stick', p: 'shooting', s: 'passing' },
      { k: 'skates', n: 'Skates', p: 'skating', s: 'defense' },
      { k: 'gloves', n: 'Gloves', p: 'hands', s: 'grit' },
      { k: 'helmet', n: 'Helmet', p: 'iq', s: 'defense' }
    ],
    goalie: [
      { k: 'stick', n: 'Stick', p: 'puckhandling', s: 'rebound' },
      { k: 'pads', n: 'Pads', p: 'fiveHole', s: 'positioning' },
      { k: 'glove', n: 'Glove', p: 'gloveHigh', s: 'gloveLow' },
      { k: 'blocker', n: 'Blocker', p: 'blockerHigh', s: 'blockerLow' }
    ]
  };
  // a full Legendary set adds roughly +8 to +10 Overall to a maxed player
  const GEAR_BANDS = {
    common: { p: [1, 2], s: [0, 0] },
    uncommon: { p: [2, 4], s: [0, 1] },
    rare: { p: [4, 6], s: [1, 2] },
    epic: { p: [6, 9], s: [2, 4] },
    legendary: { p: [9, 13], s: [4, 6] }
  };

  // ---------------------------------------------------------------- x-factors (no slot below rare; a second at legendary)
  const XFACTORS = [
    { k: 'workhorse', n: 'Workhorse', r: 'uncommon', pos: 'skater', d: 'Ignores the third-period fatigue penalty.' },
    { k: 'heavyshot', n: 'Heavy Shot', r: 'rare', pos: 'skater', d: 'Gets about 8% more of his line’s goals.' },
    { k: 'shutdown', n: 'Shutdown', r: 'rare', pos: 'skater', d: 'The opposing offense plays 3% weaker.' },
    { k: 'playmaker', n: 'Quarterback', r: 'epic', pos: 'skater', d: 'Takes the primary assist on goals he is on the ice for; his line’s offense +3%.' },
    { k: 'gloveflash', n: 'Glove Flash', r: 'epic', pos: 'goalie', d: 'Save percentage +.006.' },
    { k: 'franchise', n: 'Franchise', r: 'legendary', pos: 'skater', d: 'His line gets first-line ice time, wherever it sits.' },
    { k: 'generational', n: 'Generational', r: 'legendary', pos: 'skater', d: 'Takes an even bigger share of the scoring the more he outclasses the opposition.' }
  ];

  // ---------------------------------------------------------------- boosts
  const BOOSTS = [
    { k: 'sticks', n: 'Hot Sticks', d: '+6 Shooting for every skater', attr: 'shooting', amt: 6, mins: 5, cost: 900 },
    { k: 'lock', n: 'Lockdown', d: '+6 Defense for every skater', attr: 'defense', amt: 6, mins: 5, cost: 900 },
    { k: 'legs', n: 'Fresh Legs', d: '+6 Skating for every skater', attr: 'skating', amt: 6, mins: 5, cost: 700 },
    { k: 'wall', n: 'Brick Wall', d: '+6 to every goalie skill', goalie: true, amt: 6, mins: 5, cost: 1100 },
    { k: 'rush', n: 'Puck Rush', d: 'Double click and passive income', income: 2, mins: 3, cost: 600 }
  ];

  // ---------------------------------------------------------------- divisions
  const DIVISIONS = [
    { d: 8, n: 'Rec League', lo: 5, hi: 14, payout: 1.0, games: 20, series: 3 },
    { d: 7, n: 'Juniors', lo: 11, hi: 21, payout: 1.4, games: 26, series: 3 },
    { d: 6, n: 'Semi-Pro', lo: 22, hi: 34, payout: 1.9, games: 32, series: 5 },
    { d: 5, n: 'Minor League', lo: 42, hi: 52, payout: 2.5, games: 40, series: 5 },
    { d: 4, n: 'Pro', lo: 52, hi: 62, payout: 3.2, games: 48, series: 5 },
    { d: 3, n: 'Continental', lo: 62, hi: 72, payout: 4, games: 56, series: 7 },
    { d: 2, n: 'International', lo: 72, hi: 82, payout: 5, games: 68, series: 7 },
    { d: 1, n: 'Elite', lo: 82, hi: 94, payout: 6.2, games: 84, series: 7 }
  ];

  const CRESTS = ['shield', 'circle', 'diamond', 'star', 'wing', 'anchor', 'bolt', 'leaf', 'bear', 'wolf', 'hawk', 'flame'];
  const PATTERNS = ['plain', 'yoke', 'double', 'shoulder', 'barber', 'sash'];

  // ---------------------------------------------------------------- achievements (claimed by hand on the Trophies tab)
  // theme: the gear slot and shard pool an achievement pays out in, so the reward matches the feat
  const ACHIEVEMENTS = [
    { k: 'wins', n: 'Franchise wins', tiers: [10, 50, 100, 500, 1000], theme: { slot: 'skates', pool: 'F' } },
    { k: 'streak', n: 'Win streak', tiers: [3, 5, 8, 12, 16], theme: { slot: 'helmet', pool: 'D' } },
    { k: 'hattricks', n: 'Hat tricks', tiers: [1, 5, 10, 25, 50, 100], theme: { slot: 'stick', pool: 'F' } },
    { k: 'pgoals', n: 'Career goals, one player', tiers: [10, 50, 100, 250, 500, 1000], theme: { slot: 'stick', pool: 'F' } },
    { k: 'ppoints', n: 'Career points, one player', tiers: [25, 100, 250, 500, 1000, 2000], theme: { slot: 'gloves', pool: 'F' } },
    { k: 'shutouts', n: 'Shutouts, one goalie', tiers: [1, 5, 10, 25, 50, 100], theme: { kind: 'goalie', slot: 'pads', pool: 'G' } },
    { k: 'fifty', n: '50-goal seasons', tiers: [1, 3, 10, 25], theme: { slot: 'stick', pool: 'F' } },
    { k: 'hundred', n: '100-point seasons', tiers: [1, 3, 10, 25], theme: { slot: 'gloves', pool: 'F' } },
    { k: 'cups', n: 'Championships', tiers: [1, 3, 5, 10, 25], theme: { slot: 'helmet', pool: 'D' } },
    { k: 'awards', n: 'Season awards won', tiers: [1, 5, 15, 40, 100], theme: { slot: 'gloves', pool: 'D' } },
    { k: 'gold', n: 'Hall of Famers made', tiers: [1, 3, 5, 10], theme: { slot: 'skates', pool: 'F' } },
    { k: 'seasons', n: 'Seasons played', tiers: [1, 5, 10, 25, 50, 100], theme: { slot: 'skates', pool: 'D' } },
    { k: 'combo', n: 'Tap combo', tiers: [100, 250, 500, 1000], theme: { slot: 'gloves', pool: 'F' } }
  ];

  // ---------------------------------------------------------------- trophies
  // winning an award adds a permanent stat bonus to that player (stacks up to 5 times per award)
  const TROPHY_BONUS = {
    points: { hands: 2, passing: 1 }, goals: { shooting: 3 }, assists: { passing: 3 },
    gwins: { quickness: 2 }, mvp: { iq: 3 }, def: { defense: 3 }, goalie: { gloveHigh: 2, blockerHigh: 2 },
    twoway: { defense: 2, iq: 1 }, pomvp: { grit: 2, iq: 1 }
  };

  // ---------------------------------------------------------------- tuning
  // club facilities: long-term puck sinks. Max level rises as you climb divisions.
  const FACILITIES = [
    { k: 'train', n: 'Training Center', ic: 'dumbbell', per: 3, d: 'Player upgrades cost {v}% less' },
    { k: 'arena', n: 'Arena', ic: 'season', per: 6, d: 'Tap and passive income +{v}%' },
    { k: 'scout', n: 'Scouting Dept', ic: 'token', per: 1, d: 'Drafted and free-agent players rate +{v}' },
    { k: 'equip', n: 'Equipment Room', ic: 'gear', per: 5, d: '{v}% of gear drops come one rarity higher' }
  ];
  const TUNING = {
    gameIntervalSec: 30, playoffGameSec: 36,
    comboDecayMs: 1200, comboMaxHits: 200, comboMaxMult: 5,
    starExp: 1.6, mismatchExp: 0.45, mismatchLo: 0.75, mismatchHi: 1.8, gammaShape: 6,
    offlineCapBase: 10, offlineCapMax: 40,
    costBase: 40, costGrowth: 1.075, costMult: 1,
    clickPerOvr: 0.25,      // pucks per tap = (1 + team ovr * this) * payout
    passivePerOvr: 0.35     // pucks per second = team ovr * this * payout
  };

  G.DATA = {
    NATIONS, NAMES, CITY_BY_NAT, CITIES, MASCOTS, RARITY, RIDX, GOLD, FACILITIES, GOALIE_SHARD_MULT, PROMO_CAP,
    SKATER_ATTRS, GOALIE_ATTRS, ATTR_LABEL, OVR_W, TYPES, TYPE_ODDS,
    GEAR_SLOTS, GEAR_BANDS, XFACTORS, BOOSTS, DIVISIONS, CRESTS, PATTERNS,
    ACHIEVEMENTS, TROPHY_BONUS, TUNING
  };
})(window.BK = window.BK || {});
