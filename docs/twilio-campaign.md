# Twilio A2P 10DLC campaign: Post and Stuff Mail Alerts

Copy each field into Twilio: **Messaging → Regulatory Compliance → A2P 10DLC → Campaigns → Register a campaign**.
Submit only after https://postandstuff.com, /privacy and /sms-terms load publicly (reviewers check them).

Before registering:
1. Buy a new local number (Phone Numbers → Buy a number, area code 510, SMS ticked).
2. Create a new Messaging Service named **Post and Stuff Mail Alerts** (Messaging → Services → Create).
   Add only the new number as its sender. Don't reuse the bounceback-sms service or number.
3. In that service, **Opt-Out Management**: keep default STOP/START/HELP handling and set the
   replies below.
4. Register the campaign on that service, using the existing approved **Post and Stuff** brand.

---

**Use case:** Account Notification

**Campaign description**

> Post and Stuff is a commercial mail receiving agency (CMRA) in Oakland, CA. Many of our mailbox clients are
> referred by partner nonprofits. This campaign sends account notifications to mailbox clients who opted in, telling
> them that new mail has arrived in their mailbox. We send at most one message per day, only on days mail arrives,
> stating only the number of pieces received. Messages never include the sender or the contents of the mail and are
> never marketing or promotional.

**Message samples**

1. `Post and Stuff: you have 2 new pieces of mail. See it at postandstuff.com or stop by the shop. Reply STOP to opt out.`
2. `Post and Stuff: you have 1 new piece of mail. See it at postandstuff.com or stop by the shop. Reply STOP to opt out.`
3. `Post and Stuff: you're signed up for mail alerts. Up to 1 msg/day when mail arrives. Msg & data rates may apply. Reply HELP for help, STOP to cancel.`

**Message contents**

- Embedded links: **Yes** (our own domain, postandstuff.com; no link shorteners)
- Embedded phone numbers: No
- Age-gated content: No
- Direct lending or loan arrangement: No

**How do end-users consent to receive messages? (Message flow / Call to action)**

> Clients sign up online at https://postandstuff.com/signup (usually with their case manager), where text alerts are a
> separate, optional, unchecked checkbox next to the full program terms; the sign-up is signed by typing the client's
> name and is stored with the date and time. Clients can also sign up on paper at our shop, 4051 Foothill Blvd,
> Oakland, CA 94604, where the form has the same optional checkbox, signed and dated. The wording is: "I agree to
> receive mail alert text messages from Post and Stuff at the mobile number I provided. Up to 1 message per day when
> mail arrives. Message and data rates may apply. Reply STOP to cancel, HELP for help. Consent is not required to use
> the mailbox service." Staff turn on alerts in our system only when the box is checked and signed, and the date of
> consent is recorded. The form wording and full program terms are published at https://postandstuff.com/sms-terms,
> and our privacy policy is at https://postandstuff.com/privacy. After sign-up the client receives a confirmation text
> with frequency, rates, HELP and STOP instructions.

**Privacy policy URL:** https://postandstuff.com/privacy
**Terms and conditions URL:** https://postandstuff.com/sms-terms

**Opt-in keywords:** START
**Opt-in message:** `Post and Stuff: you're signed up for mail alerts. Up to 1 msg/day when mail arrives. Msg & data rates may apply. Reply HELP for help, STOP to cancel.`

**Opt-out keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
**Opt-out message:** `Post and Stuff: you're unsubscribed from mail alerts and won't get more texts. Reply START to resubscribe.`

**Help keywords:** HELP, INFO
**Help message:** `Post and Stuff Mail Alerts: call (415) 725-1603 or visit postandstuff.com. Up to 1 msg/day. Msg & data rates may apply. Reply STOP to cancel.`

**Monthly volume:** under 2,000 messages (one per client per mail day).

---

After approval: put the new Messaging Service SID (starts with `MG`) in `TWILIO_MESSAGING_SERVICE_SID`,
then set `SMS_LIVE=true` in the live site's settings. Run `npm run twilio:check` to confirm the campaign shows
`VERIFIED`.

Wording here must match `src/lib/sms-consent.ts` and the /sms-terms page. Change all three together.
