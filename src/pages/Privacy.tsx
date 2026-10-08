import { Link } from 'react-router'
import { LegalPage, type LegalSection } from '../components/LegalPage'
import { useI18n, type Lang } from '../i18n/I18nContext'

const CONTENT: Record<Lang, { intro: string; sections: LegalSection[] }> = {
  en: {
    intro: 'We collect only what we need to let you sign in and book a car, and we never sell it. This page explains what that means in practice.',
    sections: [
      {
        title: 'What we collect',
        body: (
          <ul>
            <li><strong>Account details</strong>: your name, email address and password when you sign up.</li>
            <li><strong>Bookings</strong>: the car, dates, delivery address, phone number and note you give us when you book, and Stripe's reference for your payment.</li>
            <li><strong>Contact messages</strong>: your name, email and whatever you write to us.</li>
          </ul>
        ),
      },
      {
        title: 'Where your data is stored',
        body: (
          <>
            <p>Your account is stored in our database, hosted by Supabase in the European Union (Frankfurt). Passwords are never stored as plain text: only a one-way Argon2 hash of your password is kept.</p>
            <p>When you sign in, your browser receives a cookie holding a random session code, which it cannot read from scripts. It keeps you signed in for up to 30 days and stops working as soon as you sign out. The site and its server are hosted by Vercel and Render.</p>
          </>
        ),
      },
      {
        title: 'How we use it',
        body: (
          <ul>
            <li>To sign you in and show your name in the account menu.</li>
            <li>To pre-fill the contact form with your name and email.</li>
            <li>To respond to booking requests and questions.</li>
          </ul>
        ),
      },
      {
        title: 'What we do not do',
        body: <p>We do not sell your personal data, show you third-party advertising, or use tracking cookies. The site does not use analytics.</p>,
      },
      {
        title: 'Third-party content',
        body: (
          <>
            <p>Payments are handled by Stripe. Your card details go directly to Stripe and are never seen or stored by us.</p>
            <p>Car and team photos are loaded from Unsplash, the font from Google Fonts and pick-up maps from OpenStreetMap. When your browser loads them, those services receive standard request information such as your IP address, under their own privacy policies.</p>
            <p>If you choose delivery, the address you type is sent to OpenStreetMap's Nominatim search to find it on the map. If you use "Use my current location", your browser asks for permission first; your position is sent to Nominatim only to check that it is in Moldova and is otherwise used only on this page to calculate the delivery distance.</p>
          </>
        ),
      },
      {
        title: 'Your choices',
        body: (
          <ul>
            <li>Sign out at any time from the account menu.</li>
            <li>Delete everything we store in your browser by clearing site data for this website.</li>
            <li>Ask us what we hold about you or request its deletion by contacting us.</li>
          </ul>
        ),
      },
      {
        title: 'Changes and contact',
        body: <p>If this policy changes, we will update the date at the top of this page. Questions about your privacy? <Link to="/contact">Contact us</Link> or write to hello@rentmotors.com.</p>,
      },
    ],
  },
  ro: {
    intro: 'Colectăm doar ce ne trebuie ca să te poți autentifica și rezerva o mașină și nu vindem niciodată aceste date. Pagina aceasta explică ce înseamnă asta în practică.',
    sections: [
      {
        title: 'Ce colectăm',
        body: (
          <ul>
            <li><strong>Datele contului</strong>: numele, adresa de email și parola, atunci când te înregistrezi.</li>
            <li><strong>Rezervările</strong>: mașina, datele, adresa de livrare, numărul de telefon și mesajul pe care ni le dai la rezervare, plus referința Stripe a plății.</li>
            <li><strong>Mesajele de contact</strong>: numele, emailul și tot ce ne scrii.</li>
          </ul>
        ),
      },
      {
        title: 'Unde sunt stocate datele tale',
        body: (
          <>
            <p>Contul tău este stocat în baza noastră de date, găzduită de Supabase în Uniunea Europeană (Frankfurt). Parolele nu sunt niciodată stocate în clar: păstrăm doar un hash Argon2 unidirecțional al parolei.</p>
            <p>Când te autentifici, browserul primește un cookie cu un cod de sesiune aleatoriu, care nu poate fi citit de scripturi. Te păstrează autentificat timp de până la 30 de zile și nu mai funcționează din momentul în care te deconectezi. Site-ul și serverul sunt găzduite de Vercel și Render.</p>
          </>
        ),
      },
      {
        title: 'Cum le folosim',
        body: (
          <ul>
            <li>Pentru a te autentifica și a-ți afișa numele în meniul contului.</li>
            <li>Pentru a precompleta formularul de contact cu numele și emailul tău.</li>
            <li>Pentru a răspunde la cererile de rezervare și la întrebări.</li>
          </ul>
        ),
      },
      {
        title: 'Ce nu facem',
        body: <p>Nu vindem datele tale personale, nu îți afișăm reclame de la terți și nu folosim cookie-uri de urmărire. Site-ul nu folosește servicii de analiză.</p>,
      },
      {
        title: 'Conținut de la terți',
        body: (
          <>
            <p>Plățile sunt procesate de Stripe. Datele cardului tău ajung direct la Stripe; noi nu le vedem și nu le stocăm.</p>
            <p>Fotografiile mașinilor și ale echipei sunt încărcate de pe Unsplash, fontul de pe Google Fonts, iar hărțile de preluare de pe OpenStreetMap. Când browserul tău le încarcă, aceste servicii primesc informații standard despre cerere, cum ar fi adresa IP, conform propriilor politici de confidențialitate.</p>
            <p>Dacă alegi livrarea, adresa pe care o scrii este trimisă către serviciul de căutare Nominatim al OpenStreetMap pentru a o găsi pe hartă. Dacă folosești „Folosește locația mea curentă”, browserul îți cere mai întâi permisiunea; poziția ta este trimisă către Nominatim doar pentru a verifica dacă se află în Republica Moldova și, în rest, este folosită doar pe această pagină, pentru a calcula distanța de livrare.</p>
          </>
        ),
      },
      {
        title: 'Opțiunile tale',
        body: (
          <ul>
            <li>Te poți deconecta oricând din meniul contului.</li>
            <li>Poți șterge tot ce stocăm în browserul tău ștergând datele site-ului pentru acest website.</li>
            <li>Ne poți întreba ce date deținem despre tine sau poți cere ștergerea lor contactându-ne.</li>
          </ul>
        ),
      },
      {
        title: 'Modificări și contact',
        body: <p>Dacă această politică se schimbă, vom actualiza data din partea de sus a paginii. Ai întrebări despre confidențialitate? <Link to="/contact">Contactează-ne</Link> sau scrie-ne la hello@rentmotors.com.</p>,
      },
    ],
  },
  ru: {
    intro: 'Мы собираем только то, что нужно для входа в аккаунт и бронирования автомобиля, и никогда не продаём эти данные. На этой странице объясняется, что это значит на практике.',
    sections: [
      {
        title: 'Что мы собираем',
        body: (
          <ul>
            <li><strong>Данные аккаунта</strong>: ваше имя, адрес электронной почты и пароль при регистрации.</li>
            <li><strong>Бронирования</strong>: автомобиль, даты, адрес доставки, номер телефона и сообщение, которые вы указываете при бронировании, а также ссылка Stripe на ваш платёж.</li>
            <li><strong>Сообщения</strong>: ваше имя, email и всё, что вы нам пишете.</li>
          </ul>
        ),
      },
      {
        title: 'Где хранятся ваши данные',
        body: (
          <>
            <p>Ваш аккаунт хранится в нашей базе данных, размещённой в Supabase в Европейском союзе (Франкфурт). Пароли никогда не хранятся в открытом виде: сохраняется только односторонний хеш Argon2 вашего пароля.</p>
            <p>При входе браузер получает cookie со случайным кодом сессии, который недоступен скриптам. Он сохраняет вход до 30 дней и перестаёт действовать сразу после выхода из аккаунта. Сайт и сервер размещены в Vercel и Render.</p>
          </>
        ),
      },
      {
        title: 'Как мы их используем',
        body: (
          <ul>
            <li>Чтобы выполнить вход и показать ваше имя в меню аккаунта.</li>
            <li>Чтобы заранее заполнить форму обратной связи вашим именем и email.</li>
            <li>Чтобы отвечать на запросы на бронирование и вопросы.</li>
          </ul>
        ),
      },
      {
        title: 'Чего мы не делаем',
        body: <p>Мы не продаём ваши персональные данные, не показываем стороннюю рекламу и не используем отслеживающие cookie. Сайт не использует аналитику.</p>,
      },
      {
        title: 'Сторонний контент',
        body: (
          <>
            <p>Платежи обрабатывает Stripe. Данные вашей карты передаются напрямую в Stripe; мы их не видим и не храним.</p>
            <p>Фотографии автомобилей и команды загружаются с Unsplash, шрифт — с Google Fonts, а карты мест получения — с OpenStreetMap. Когда ваш браузер их загружает, эти сервисы получают стандартные данные запроса, например ваш IP-адрес, в соответствии со своими политиками конфиденциальности.</p>
            <p>Если вы выбираете доставку, введённый адрес отправляется в поиск Nominatim от OpenStreetMap, чтобы найти его на карте. Если вы нажимаете «Использовать моё местоположение», браузер сначала запрашивает разрешение; ваше местоположение отправляется в Nominatim только для проверки, что оно находится в Молдове, а в остальном используется только на этой странице для расчёта расстояния доставки.</p>
          </>
        ),
      },
      {
        title: 'Ваш выбор',
        body: (
          <ul>
            <li>Выйти из аккаунта можно в любой момент через меню аккаунта.</li>
            <li>Удалить всё, что мы храним в вашем браузере, можно, очистив данные этого сайта.</li>
            <li>Узнать, какие данные о вас у нас есть, или запросить их удаление можно, связавшись с нами.</li>
          </ul>
        ),
      },
      {
        title: 'Изменения и контакты',
        body: <p>Если эта политика изменится, мы обновим дату вверху страницы. Есть вопросы о конфиденциальности? <Link to="/contact">Свяжитесь с нами</Link> или напишите на hello@rentmotors.com.</p>,
      },
    ],
  },
}

export function Privacy() {
  const { lang, t } = useI18n()
  const { intro, sections } = CONTENT[lang]
  return <LegalPage eyebrow={t.legal.eyebrow} title={t.legal.privacy} updated="2026-10-01" intro={intro} sections={sections} />
}
