type Kind = 'prompt' | 'duel' | 'vote' | 'rule' | 'hotseat' | 'round';
export type Card = { kind: Kind; en: string; nb: string; endEn?: string; endNb?: string };

export const CARDS: Card[] = [
  {
    kind: 'prompt',
    en: '{p1}, what excuse have you used to leave a date or a party early?',
    nb: '{p1}, hvilken unnskyldning har du brukt for å dra tidlig fra en date eller en fest?',
  },
  {
    kind: 'prompt',
    en: '{p1}, tell us about a plan that went wrong before it even started.',
    nb: '{p1}, fortell om en plan som gikk galt før den begynte.',
  },
  {
    kind: 'prompt',
    en: '{p1}, what did you spend money on because someone online made it look good? Was it worth it?',
    nb: '{p1}, hva brukte du penger på fordi noen på nett fikk det til å se bra ut? Var det verdt det?',
  },
  {
    kind: 'prompt',
    en: '{p1}, what was your first impression of {p2}? What changed it?',
    nb: '{p1}, hva var førsteinntrykket ditt av {p2}? Hva endret det?',
  },
  {
    kind: 'prompt',
    en: '{p1}, what have you pretended to understand for far too long?',
    nb: '{p1}, hva har du latet som du forstår altfor lenge?',
  },
  {
    kind: 'prompt',
    en: '{p1}, name two things you are good at and one you only pretend to be. The group guesses the fake.',
    nb: '{p1}, nevn to ting du er god på og én du bare later som du kan. Gruppa gjetter bløffen.',
  },
  {
    kind: 'prompt',
    en: '{p1}, what is the worst thing you have agreed to just to seem easygoing?',
    nb: '{p1}, hva er det verste du har sagt ja til bare for å virke avslappet?',
  },
  {
    kind: 'prompt',
    en: '{p1}, plan the worst possible night out for {p2}. They have to explain which part they would secretly enjoy.',
    nb: '{p1}, planlegg den verst tenkelige utekvelden for {p2}. De må si hvilken del de egentlig ville likt.',
  },
  {
    kind: 'prompt',
    en: '{p1} and {p2}, each guess one thing the other lies about on a first date. Reveal together.',
    nb: '{p1} og {p2}, gjett én ting den andre lyver om på en første date. Si det samtidig.',
  },
  {
    kind: 'prompt',
    en: '{p1}, what is the pettiest reason you have muted someone? No names needed.',
    nb: '{p1}, hva er den mest smålige grunnen til at du har dempet noen? Du trenger ikke si navn.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: rock, paper, scissors. Best of three.',
    nb: '{p1} mot {p2}: stein, saks, papir. Best av tre.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: take turns inventing terrible first messages on a dating app. Repeat one or take more than five seconds and you lose.',
    nb: '{p1} mot {p2}: finn på elendige førstemeldinger på en datingapp etter tur. Gjentar du eller bruker mer enn fem sekunder, taper du.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: staring contest. First to laugh loses.',
    nb: '{p1} mot {p2}: stirrekonkurranse. Den som ler først, taper.',
  },
  {
    kind: 'duel',
    en: '{p1} and {p2} each hum a song. The one the group guesses fastest wins.',
    nb: '{p1} og {p2} nynner hver sin sang. Den gruppa gjetter raskest, vinner.',
  },
  {
    kind: 'duel',
    en: '{p1} and {p2}: each tell a 20-second story about a disastrous date. The group decides which was worse.',
    nb: '{p1} og {p2}: fortell hver deres 20 sekunders historie om en katastrofedate. Gruppa avgjør hvilken som var verst.',
  },
  {
    kind: 'vote',
    en: 'Who would move cities for someone they have known for two weeks?',
    nb: 'Hvem ville flyttet til en annen by for noen de har kjent i to uker?',
  },
  {
    kind: 'vote',
    en: 'Who would go missing on a night out and turn up with a new friend group?',
    nb: 'Hvem ville forsvunnet på byen og dukket opp med en ny vennegjeng?',
  },
  {
    kind: 'vote',
    en: 'Who could talk their way out of being caught in an obvious lie?',
    nb: 'Hvem kunne snakket seg ut av å bli tatt i en åpenbar løgn?',
  },
  {
    kind: 'vote',
    en: 'Who is most likely to start dancing first tonight?',
    nb: 'Hvem begynner mest sannsynlig å danse først i kveld?',
  },
  {
    kind: 'vote',
    en: 'Who gives great advice and follows absolutely none of it?',
    nb: 'Hvem gir gode råd og følger absolutt ingen av dem selv?',
  },
  {
    kind: 'vote',
    en: 'Who is most likely to befriend a stranger tonight?',
    nb: 'Hvem blir mest sannsynlig venn med en fremmed i kveld?',
  },
  {
    kind: 'vote',
    en: 'Who would deny knowing a song and then know every word?',
    nb: 'Hvem ville nektet for å kjenne en sang og så kunnet hvert ord?',
  },
  {
    kind: 'rule',
    en: '{p1} may only answer questions with a question.',
    nb: '{p1} kan bare svare på spørsmål med et spørsmål.',
    endEn: '{p1} can answer normally again.',
    endNb: '{p1} kan svare som vanlig igjen.',
  },
  {
    kind: 'rule',
    en: 'Nobody may say “yes” or “no”.',
    nb: 'Ingen får si «ja» eller «nei».',
    endEn: 'You can say “yes” and “no” again.',
    endNb: 'Dere kan si «ja» og «nei» igjen.',
  },
  {
    kind: 'rule',
    en: '{p1} must back up every opinion with a completely made-up statistic.',
    nb: '{p1} må støtte hver mening med en helt oppdiktet statistikk.',
    endEn: '{p1} can stop inventing statistics.',
    endNb: '{p1} kan slutte å finne på statistikk.',
  },
  {
    kind: 'rule',
    en: '{p1} and {p2} must politely disagree whenever either gives an opinion.',
    nb: '{p1} og {p2} må være høflig uenige hver gang en av dem sier en mening.',
    endEn: '{p1} and {p2} can agree again.',
    endNb: '{p1} og {p2} kan være enige igjen.',
  },
  {
    kind: 'rule',
    en: '{p1} has to defend every unpopular choice as if it was their idea.',
    nb: '{p1} må forsvare hvert upopulært valg som om det var deres idé.',
    endEn: '{p1} no longer has to defend your bad choices.',
    endNb: '{p1} trenger ikke forsvare de dårlige valgene deres lenger.',
  },
  {
    kind: 'hotseat',
    en: '{p1} is in the hot seat: everyone asks one question, and {p1} must answer honestly.',
    nb: '{p1} sitter i den varme stolen: alle stiller ett spørsmål, og {p1} må svare ærlig.',
  },
  {
    kind: 'hotseat',
    en: '{p1} in the hot seat: the group has one minute to make {p1} laugh.',
    nb: '{p1} i den varme stolen: gruppa har ett minutt på å få {p1} til å le.',
  },
  {
    kind: 'hotseat',
    en: 'Everyone guesses what {p1} would lie about to get out of plans. {p1} admits which excuse they have actually used.',
    nb: 'Alle gjetter hva {p1} ville løyet om for å slippe en plan. {p1} innrømmer hvilken unnskyldning de faktisk har brukt.',
  },
  {
    kind: 'hotseat',
    en: 'The group guesses the worst job for {p1}. {p1} picks one and explains why.',
    nb: 'Gruppa gjetter den verste jobben for {p1}. {p1} velger én og forklarer hvorfor.',
  },
  {
    kind: 'round',
    en: 'Starting with {p1}, name things you should never put in a dating profile. No repeats. More than five seconds and you are out of this round.',
    nb: 'Fra {p1}: nevn ting du aldri bør ha i en datingprofil. Ingen gjentakelser. Bruker du mer enn fem sekunder, er du ute av denne runden.',
  },
  {
    kind: 'round',
    en: 'Round the table, starting with {p1}: name a song with a colour in the title.',
    nb: 'Rundt bordet, {p1} begynner: nevn en sang med en farge i tittelen.',
  },
  {
    kind: 'round',
    en: 'Round the table, starting with {p1}: one word each to build a story. Keep going until someone laughs.',
    nb: 'Rundt bordet, {p1} begynner: ett ord hver til en historie. Fortsett til noen ler.',
  },
  {
    kind: 'round',
    en: 'Round the table, starting with {p1}: name a famous duo. The first to get stuck tells an embarrassing story.',
    nb: 'Rundt bordet, {p1} begynner: nevn en kjent duo. Den første som står fast, forteller en flau historie.',
  },
  {
    kind: 'round',
    en: 'Starting with {p1}, invent excuses for leaving a party. No repeats. More than five seconds and you are out of this round.',
    nb: 'Fra {p1}: finn på unnskyldninger for å dra fra en fest. Ingen gjentakelser. Bruker du mer enn fem sekunder, er du ute av denne runden.',
  },
  {
    kind: 'duel',
    en: "{p1} and {p2}: you both forgot a friend's birthday. Each invent an excuse. The group picks the one they would actually believe.",
    nb: '{p1} og {p2}: dere glemte begge bursdagen til en venn. Finn på hver deres unnskyldning. Gruppa velger den de faktisk ville trodd på.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: say “red lorry, yellow lorry” five times fast. Fewest slips wins.',
    nb: '{p1} mot {p2}: si «Fisker’n Fritz fisket fersk fisk» fem ganger fort. Færrest feil vinner.',
  },
  {
    kind: 'duel',
    en: '{p1} and {p2}: each name something the other would spend a lottery win on. Defend your answer.',
    nb: '{p1} og {p2}: si hva den andre ville brukt en lottogevinst på. Forsvar svaret.',
  },
];
