-- Booking and host phone numbers in one form, "+37369123456", like the accounts' numbers.
-- Moldovan numbers typed without the country code ("069123456", "69123456") get +373; numbers
-- with a "+" lose their spaces and dashes. Anything else is left as it was.
UPDATE "Booking" SET "phone" = CASE
    WHEN "phone" ~ '^\s*\+' THEN '+' || regexp_replace("phone", '\D', '', 'g')
    WHEN regexp_replace("phone", '\D', '', 'g') ~ '^0[0-9]{8}$' THEN '+373' || substr(regexp_replace("phone", '\D', '', 'g'), 2)
    WHEN regexp_replace("phone", '\D', '', 'g') ~ '^[0-9]{8}$' THEN '+373' || regexp_replace("phone", '\D', '', 'g')
    ELSE "phone" END;

UPDATE "Host" SET "phone" = CASE
    WHEN "phone" ~ '^\s*\+' THEN '+' || regexp_replace("phone", '\D', '', 'g')
    WHEN regexp_replace("phone", '\D', '', 'g') ~ '^0[0-9]{8}$' THEN '+373' || substr(regexp_replace("phone", '\D', '', 'g'), 2)
    WHEN regexp_replace("phone", '\D', '', 'g') ~ '^[0-9]{8}$' THEN '+373' || regexp_replace("phone", '\D', '', 'g')
    ELSE "phone" END
WHERE "phone" IS NOT NULL;
