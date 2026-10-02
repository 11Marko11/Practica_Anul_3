// Sample reviews shown for every car, in the language each renter wrote in.
// Reviews posted on the site are added on top of these (see lib/useReviews.ts).
export type Review = {
  id: string
  name: string
  email?: string // set for reviews posted on this site, so their author can delete them
  rating: number // 1–5
  date: string // 'YYYY-MM-DD'
  text: string
}

export const SAMPLE_REVIEWS: Record<string, Review[]> = {
  'porsche-911-carrera-4s': [
    { id: 's1', name: 'Andrei C.', rating: 5, date: '2026-09-14', text: 'Mașina a fost impecabilă, curată și cu plinul făcut. Am mers până la Orheiul Vechi și înapoi, o plăcere pe fiecare curbă. Gazda a fost foarte punctuală.' },
    { id: 's2', name: 'Дмитрий С.', rating: 5, date: '2026-08-30', text: 'Брал на выходные. Машина в идеальном состоянии, полный привод очень уверенно держит дорогу даже в дождь. Обязательно возьму ещё.' },
    { id: 's3', name: 'Laura M.', rating: 4, date: '2026-07-19', text: 'Fantastic car and a smooth handover. The only downside is the small back seats, but that is expected in a 911.' },
  ],
  'ferrari-roma-spider': [
    { id: 's1', name: 'Natalia R.', rating: 5, date: '2026-09-02', text: 'Am închiriat-o pentru nunta noastră și a fost vedeta zilei. Plafonul se pliază foarte repede, iar sunetul V8-ului e superb.' },
    { id: 's2', name: 'Victor B.', rating: 5, date: '2026-08-11', text: 'Drum până la Cricova cu plafonul coborât, nimic de comentat. Mașina arată și se conduce exact cum te aștepți de la un Ferrari.' },
  ],
  'bmw-m4-competition': [
    { id: 's1', name: 'Mihai G.', rating: 5, date: '2026-09-20', text: 'Motor excelent și un șasiu foarte bine echilibrat. Preluarea în Bălți a durat cinci minute. Recomand!' },
    { id: 's2', name: 'Сергей В.', rating: 4, date: '2026-08-05', text: 'Очень быстрая и при этом удобная на каждый день. Подвеска жёсткая на наших дорогах, но к этому быстро привыкаешь.' },
    { id: 's3', name: 'Ion M.', rating: 5, date: '2026-06-28', text: 'Scaunele din carbon arată spectaculos și țin foarte bine. Am returnat-o cu greu.' },
  ],
  'tesla-model-s-plaid': [
    { id: 's1', name: 'Olga T.', rating: 5, date: '2026-09-25', text: 'Ускорение просто невероятное, дети были в восторге. Запаса хода хватило на поездку в Бельцы и обратно без подзарядки.' },
    { id: 's2', name: 'Alexandru N.', rating: 4, date: '2026-08-18', text: 'Foarte confortabilă și silențioasă. Autopilotul ajută mult pe traseu. Mi-ar fi plăcut un cablu de încărcare mai lung.' },
  ],
  'mercedes-amg-gt-63-s': [
    { id: 's1', name: 'Cristina D.', rating: 5, date: '2026-09-09', text: 'Luxoasă, spațioasă și incredibil de rapidă. Scaunele cu masaj au făcut drumul lung foarte ușor.' },
    { id: 's2', name: 'James O.', rating: 5, date: '2026-07-22', text: 'Took it for a business trip and it was perfect: comfortable for four adults, yet a real performance car when the road opens up.' },
  ],
  'lamborghini-huracan-evo': [
    { id: 's1', name: 'Victor B.', rating: 5, date: '2026-09-27', text: 'Un vis devenit realitate. Toată lumea se uita după noi pe Ștefan cel Mare. Gazda ne-a explicat tot ce trebuie înainte de plecare.' },
    { id: 's2', name: 'Артём К.', rating: 5, date: '2026-08-14', text: 'Звук V10 — это что-то невероятное. Машину выдали чистой, всё объяснили. Дорого, но эмоции того стоят.' },
    { id: 's3', name: 'Elena P.', rating: 4, date: '2026-07-03', text: 'Experiență de neuitat. Atenție la denivelări și la intrările în parcări, mașina e foarte joasă.' },
  ],
  'audi-rs-e-tron-gt': [
    { id: 's1', name: 'Ana L.', rating: 5, date: '2026-09-11', text: 'Cea mai frumoasă mașină electrică pe care am condus-o. Liniștită, rapidă și cu un interior foarte bine finisat.' },
    { id: 's2', name: 'Дмитрий С.', rating: 4, date: '2026-08-01', text: 'Отличный автомобиль для дальних поездок. Быстрая зарядка действительно быстрая, но зарядных станций в регионах пока мало.' },
  ],
  'ford-mustang-gt500': [
    { id: 's1', name: 'Serghei V.', rating: 5, date: '2026-09-16', text: 'Pur și simplu brutal. Sunetul V8-ului se aude de la un kilometru. Preluarea în Cahul a decurs fără probleme.' },
    { id: 's2', name: 'Mihai G.', rating: 4, date: '2026-08-23', text: 'Foarte multă putere, trebuie condus cu respect pe ploaie. Consumul e pe măsură, dar asta e parte din farmec.' },
  ],
  'bmw-ix-m60': [
    { id: 's1', name: 'Natalia R.', rating: 5, date: '2026-09-05', text: 'Ideală pentru familie: portbagaj imens, multe locuri și foarte confortabilă. Copiii au adorat plafonul panoramic.' },
    { id: 's2', name: 'Ольга Т.', rating: 5, date: '2026-07-30', text: 'Ездили всей семьёй в Сороки. Очень тихая и мягкая машина, места хватает всем. Владелец очень приятный.' },
  ],
  'porsche-taycan-turbo-s': [
    { id: 's1', name: 'Andrei C.', rating: 5, date: '2026-09-21', text: 'Se conduce ca un adevărat Porsche, chiar dacă e electric. Launch control-ul e o experiență în sine.' },
    { id: 's2', name: 'Laura M.', rating: 5, date: '2026-08-09', text: 'Incredibly quick and still comfortable on longer drives. The host had it fully charged and spotless.' },
    { id: 's3', name: 'Ion M.', rating: 4, date: '2026-07-12', text: 'Mașină superbă. Portbagajul din spate e puțin mic pentru două valize mari.' },
  ],
  'mercedes-eqs-580': [
    { id: 's1', name: 'Cristina D.', rating: 5, date: '2026-09-18', text: 'Hyperscreen-ul e impresionant, iar liniștea din habitaclu e incredibilă. Am mers de la Ungheni la Chișinău și înapoi fără nicio grijă.' },
    { id: 's2', name: 'Сергей В.', rating: 4, date: '2026-08-27', text: 'Очень комфортный автомобиль, настоящий S-класс. Немного непривычно управлять всем через экраны.' },
  ],
  'ferrari-sf90-stradale': [
    { id: 's1', name: 'Alexandru N.', rating: 5, date: '2026-09-29', text: 'Cea mai rapidă mașină pe care am condus-o vreodată. Modul electric e surprinzător de util prin oraș. Merită fiecare leu.' },
    { id: 's2', name: 'Артём К.', rating: 5, date: '2026-08-20', text: 'Абсолютный восторг. Владелец подробно всё показал, машина в идеальном состоянии. Лучший подарок себе на день рождения.' },
  ],
}
