import { Link } from 'react-router'
import { LegalPage, type LegalSection } from '../components/LegalPage'
import { useI18n, type Lang } from '../i18n/I18nContext'

const CONTENT: Record<Lang, { intro: string; sections: LegalSection[] }> = {
  en: {
    intro: 'The short version: rent responsibly, return the car as you found it, and cancel at least 24 hours ahead for a full refund. The details are below.',
    sections: [
      {
        title: 'About these terms',
        body: <p>These Terms of Service govern your use of the Rent Motors website and any booking you request through it. By creating an account or requesting a booking you agree to these terms. If you do not agree, please do not use the service.</p>,
      },
      {
        title: 'Our role',
        body: <p>Rent Motors is a marketplace. Cars listed on the site belong to independent hosts and rental agencies ("hosts"). We help you find a car and pass your booking request to the host; the rental agreement for each trip is between you and the host.</p>,
      },
      {
        title: 'Who can rent',
        body: (
          <ul>
            <li>You must be at least 21 years old, and at least 25 for cars priced above 9 000 MDL per day.</li>
            <li>You must hold a full driving licence that has been valid for at least 2 years.</li>
            <li>The name on your account, licence and payment card must match.</li>
          </ul>
        ),
      },
      {
        title: 'Bookings and prices',
        body: (
          <>
            <p>Prices are shown per day in Moldovan lei (MDL). The trip total shown on a listing is the daily price multiplied by the number of rental days between your pick-up and return dates.</p>
            <p>The daily price includes basic insurance and roadside assistance. Fuel or charging, tolls, parking, traffic fines and optional extras are not included.</p>
            <p>You pay by card when you book, through our payment provider Stripe. The amount is only held on your card at first, not charged. We charge it when we confirm the booking; if we decline it, or do not confirm it within 7 days, the hold is released and you pay nothing.</p>
            <p>The site currently runs Stripe in test mode: no real money is charged, and only Stripe's test cards work.</p>
          </>
        ),
      },
      {
        title: 'Cancellations',
        body: (
          <ul>
            <li>Before we confirm a booking you can cancel it at any time, and nothing is charged.</li>
            <li>Free cancellation up to 24 hours before the pick-up time (pick-ups start at 10:00, Moldova time).</li>
            <li>Cancellations within 24 hours of pick-up are charged one rental day.</li>
            <li>If you do not show up, the full booking is charged.</li>
            <li>If a host cancels, you receive a full refund and we will help you find a similar car.</li>
          </ul>
        ),
      },
      {
        title: 'Pick-up, use and return',
        body: (
          <>
            <p>Bring your driving licence and the payment card used for the booking. Inspect the car with the host at pick-up and report any existing damage.</p>
            <p>Only drivers named on the booking may drive. The car may not be used for racing, towing, commercial transport or off-road driving, and may not leave the country without the host's written permission.</p>
            <p>Return the car on time, with the same fuel or charge level, and in the same condition. Late returns may be charged per extra hour, up to one rental day.</p>
          </>
        ),
      },
      {
        title: 'Damage and liability',
        body: <p>You are responsible for the car during the rental period. Damage not covered by the included insurance, and any excess stated in the rental agreement, is charged to you. To the extent permitted by law, Rent Motors is not liable for indirect losses arising from a rental.</p>,
      },
      {
        title: 'Your account',
        body: <p>Keep your password private and tell us if you think someone else has used your account. We may suspend accounts that break these terms or that we believe are being used fraudulently.</p>,
      },
      {
        title: 'Changes and contact',
        body: <p>We may update these terms from time to time; the date at the top of this page shows the latest version. Questions? <Link to="/contact">Contact us</Link> or write to hello@rentmotors.com.</p>,
      },
    ],
  },
  ro: {
    intro: 'Pe scurt: închiriază responsabil, returnează mașina așa cum ai primit-o și anulează cu cel puțin 24 de ore înainte pentru o rambursare integrală. Detaliile sunt mai jos.',
    sections: [
      {
        title: 'Despre acești termeni',
        body: <p>Acești Termeni și condiții se aplică utilizării site-ului Rent Motors și oricărei rezervări pe care o soliciți prin intermediul lui. Prin crearea unui cont sau solicitarea unei rezervări, ești de acord cu acești termeni. Dacă nu ești de acord, te rugăm să nu folosești serviciul.</p>,
      },
      {
        title: 'Rolul nostru',
        body: <p>Rent Motors este o platformă de intermediere. Mașinile listate pe site aparțin unor gazde independente și agenții de închiriere („gazde”). Te ajutăm să găsești o mașină și transmitem cererea ta de rezervare gazdei; contractul de închiriere pentru fiecare călătorie se încheie între tine și gazdă.</p>,
      },
      {
        title: 'Cine poate închiria',
        body: (
          <ul>
            <li>Trebuie să ai cel puțin 21 de ani și cel puțin 25 de ani pentru mașinile care costă peste 9 000 MDL pe zi.</li>
            <li>Trebuie să deții un permis de conducere valabil de cel puțin 2 ani.</li>
            <li>Numele din cont, de pe permis și de pe cardul de plată trebuie să coincidă.</li>
          </ul>
        ),
      },
      {
        title: 'Rezervări și prețuri',
        body: (
          <>
            <p>Prețurile sunt afișate pe zi, în lei moldovenești (MDL). Totalul afișat pentru o mașină este prețul pe zi înmulțit cu numărul de zile dintre data preluării și data returnării.</p>
            <p>Prețul pe zi include asigurarea de bază și asistența rutieră. Combustibilul sau încărcarea, taxele de drum, parcarea, amenzile și opțiunile suplimentare nu sunt incluse.</p>
            <p>Plătești cu cardul în momentul rezervării, prin procesatorul nostru de plăți Stripe. La început suma este doar blocată pe card, nu încasată. O încasăm când confirmăm rezervarea; dacă o refuzăm sau nu o confirmăm în 7 zile, blocarea se anulează și nu plătești nimic.</p>
            <p>Momentan site-ul folosește Stripe în modul de test: nu se încasează bani reali și funcționează doar cardurile de test Stripe.</p>
          </>
        ),
      },
      {
        title: 'Anulări',
        body: (
          <ul>
            <li>Până confirmăm rezervarea, o poți anula oricând, fără să plătești nimic.</li>
            <li>Anulare gratuită cu până la 24 de ore înainte de ora preluării (preluările încep de la ora 10:00, ora Moldovei).</li>
            <li>Pentru anulările făcute cu mai puțin de 24 de ore înainte de preluare se percepe o zi de închiriere.</li>
            <li>Dacă nu te prezinți, se percepe întreaga rezervare.</li>
            <li>Dacă gazda anulează, primești banii înapoi integral și te ajutăm să găsești o mașină similară.</li>
          </ul>
        ),
      },
      {
        title: 'Preluarea, folosirea și returnarea',
        body: (
          <>
            <p>Adu permisul de conducere și cardul de plată folosit pentru rezervare. Inspectează mașina împreună cu gazda la preluare și semnalează orice daune existente.</p>
            <p>Pot conduce doar șoferii trecuți în rezervare. Mașina nu poate fi folosită pentru curse, tractare, transport comercial sau off-road și nu poate părăsi țara fără acordul scris al gazdei.</p>
            <p>Returnează mașina la timp, cu același nivel de combustibil sau de încărcare și în aceeași stare. Întârzierile pot fi taxate pe oră, până la valoarea unei zile de închiriere.</p>
          </>
        ),
      },
      {
        title: 'Daune și răspundere',
        body: <p>Ești responsabil(ă) de mașină pe toată durata închirierii. Daunele neacoperite de asigurarea inclusă, precum și franșiza prevăzută în contractul de închiriere, îți sunt facturate. În limitele permise de lege, Rent Motors nu răspunde pentru pierderile indirecte rezultate dintr-o închiriere.</p>,
      },
      {
        title: 'Contul tău',
        body: <p>Păstrează-ți parola secretă și anunță-ne dacă bănuiești că altcineva ți-a folosit contul. Putem suspenda conturile care încalcă acești termeni sau pe care le considerăm folosite în mod fraudulos.</p>,
      },
      {
        title: 'Modificări și contact',
        body: <p>Putem actualiza acești termeni din când în când; data din partea de sus a paginii arată ultima versiune. Ai întrebări? <Link to="/contact">Contactează-ne</Link> sau scrie-ne la hello@rentmotors.com.</p>,
      },
    ],
  },
  ru: {
    intro: 'Коротко: арендуйте ответственно, возвращайте автомобиль в том же состоянии и отменяйте бронирование не позднее чем за 24 часа, чтобы получить полный возврат. Подробности ниже.',
    sections: [
      {
        title: 'Об этих условиях',
        body: <p>Настоящие Условия использования регулируют использование сайта Rent Motors и любых бронирований, которые вы запрашиваете через него. Создавая аккаунт или запрашивая бронирование, вы соглашаетесь с этими условиями. Если вы не согласны, пожалуйста, не пользуйтесь сервисом.</p>,
      },
      {
        title: 'Наша роль',
        body: <p>Rent Motors — это маркетплейс. Автомобили на сайте принадлежат независимым владельцам и прокатным компаниям («владельцы»). Мы помогаем найти автомобиль и передаём ваш запрос на бронирование владельцу; договор аренды на каждую поездку заключается между вами и владельцем.</p>,
      },
      {
        title: 'Кто может арендовать',
        body: (
          <ul>
            <li>Вам должно быть не менее 21 года, а для автомобилей дороже 9 000 MDL в сутки — не менее 25 лет.</li>
            <li>У вас должно быть водительское удостоверение со стажем не менее 2 лет.</li>
            <li>Имя в аккаунте, водительском удостоверении и на платёжной карте должно совпадать.</li>
          </ul>
        ),
      },
      {
        title: 'Бронирование и цены',
        body: (
          <>
            <p>Цены указаны за сутки в молдавских леях (MDL). Итоговая сумма поездки — это суточная цена, умноженная на количество дней между датами получения и возврата.</p>
            <p>Суточная цена включает базовую страховку и помощь на дороге. Топливо или зарядка, платные дороги, парковка, штрафы и дополнительные опции не включены.</p>
            <p>Вы оплачиваете бронирование картой через нашего платёжного провайдера Stripe. Сначала сумма только блокируется на карте, но не списывается. Мы списываем её, когда подтверждаем бронирование; если мы его отклоняем или не подтверждаем в течение 7 дней, блокировка снимается и вы ничего не платите.</p>
            <p>Сейчас сайт использует Stripe в тестовом режиме: реальные деньги не списываются, работают только тестовые карты Stripe.</p>
          </>
        ),
      },
      {
        title: 'Отмена',
        body: (
          <ul>
            <li>До нашего подтверждения бронирование можно отменить в любой момент, ничего не платя.</li>
            <li>Бесплатная отмена не позднее чем за 24 часа до времени получения (получение — с 10:00 по времени Молдовы).</li>
            <li>При отмене менее чем за 24 часа до получения взимается стоимость одних суток аренды.</li>
            <li>Если вы не приедете, взимается полная стоимость бронирования.</li>
            <li>Если отменяет владелец, вы получаете полный возврат, а мы поможем найти похожий автомобиль.</li>
          </ul>
        ),
      },
      {
        title: 'Получение, использование и возврат',
        body: (
          <>
            <p>Возьмите с собой водительское удостоверение и платёжную карту, использованную при бронировании. Осмотрите автомобиль вместе с владельцем при получении и сообщите о любых имеющихся повреждениях.</p>
            <p>Управлять автомобилем могут только водители, указанные в бронировании. Автомобиль нельзя использовать для гонок, буксировки, коммерческих перевозок или езды по бездорожью, а также вывозить за пределы страны без письменного разрешения владельца.</p>
            <p>Верните автомобиль вовремя, с тем же уровнем топлива или заряда и в том же состоянии. За опоздание может взиматься почасовая плата, но не больше стоимости одних суток.</p>
          </>
        ),
      },
      {
        title: 'Повреждения и ответственность',
        body: <p>Вы несёте ответственность за автомобиль в течение всего срока аренды. Повреждения, не покрытые включённой страховкой, а также франшиза, указанная в договоре аренды, оплачиваются вами. В пределах, допустимых законом, Rent Motors не несёт ответственности за косвенные убытки, связанные с арендой.</p>,
      },
      {
        title: 'Ваш аккаунт',
        body: <p>Храните пароль в тайне и сообщите нам, если считаете, что вашим аккаунтом воспользовался кто-то другой. Мы можем заблокировать аккаунты, нарушающие эти условия или используемые, по нашему мнению, в мошеннических целях.</p>,
      },
      {
        title: 'Изменения и контакты',
        body: <p>Мы можем время от времени обновлять эти условия; дата вверху страницы указывает на последнюю версию. Есть вопросы? <Link to="/contact">Свяжитесь с нами</Link> или напишите на hello@rentmotors.com.</p>,
      },
    ],
  },
}

export function Terms() {
  const { lang, t } = useI18n()
  const { intro, sections } = CONTENT[lang]
  return <LegalPage eyebrow={t.legal.eyebrow} title={t.legal.terms} updated="2026-10-01" intro={intro} sections={sections} />
}
