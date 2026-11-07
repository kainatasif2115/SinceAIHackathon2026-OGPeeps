# How to retest the five journeys

Manual check of the five sample journeys in the chat. Do this in the running demo, not by typing the story into the homepage box. Picking the example attaches the case, including the link verdict, the phone record, and the eSIM event. Typing the same words yourself uses a generic customer, and the hidden facts are missing.

Checked on 7 Nov 2026. All five passed after the risk-badge fixes in `backend/assistant/checker.py`, and passed again in the evening on the final code and the new ElevenLabs agent (see the table at the end).

## Before you start

1. `make backend` and `make frontend`. Sign in and open `/dashboard`: a **private** account for cases 2–4, a **business** account for cases 1 and 5. The homepage only shows three English examples, so these Finnish cases are picked from the signed-in home.
2. The header must say the service is connected. If a send comes back in about a second with **Turn 0 of 6** and the sentence "I am connecting you now to a person in our customer service", the model never ran. `ELEVENLABS_AGENT_ID` is empty. Run `make agent`, restart the backend, and send again.
3. Between cases, click **New chat** in the sidebar. Audience comes from the account (business or private), and language locks once a chat has started.
4. Click **EN** (top right of the home) after the example fills the box, then send. The buttons and the answer card come back in English. Leave the Finnish text in the box as it is.
5. If a permission card appears, click **Allow**. **Not now** hides the account and device facts the answer depends on.
6. An old card does not update after a code change. Start over and send the example again.

A real answer takes a few seconds and moves the counter off **Turn 0 of 6**.

## Every case

1. Sign in with the account type named below: **Consumer** is a private account, **Small business** a business account.
2. On the home, click **FI** (top right). The example chips under the message box switch to Finnish, one per situation.
3. Click the chip whose message starts with the words below (hover it to see the full message). The line **Example:** appears and the box fills. Do not rewrite it.
4. Click **EN**, then send.
5. Answer any question with the English line for that case, and **Allow** any permission card. Stop when the answer card appears.

## 1. Suspicious message — `DSA-D-0056`

Audience: **Small business**. Row starts with **Mitä tälle kannattaa tehdä?**

A text from "Lumipankki" says the account is locked and includes a login link, in the same thread as real bank messages. The customer has not opened it and has not typed anything.

If it asks what you received, send:

```
I got a text from Lumipankki, in the same thread as the bank's real messages. It says unusual activity was found, my online bank is closed, and I must confirm my identity today at https://lumipankki-tunnistus.invalid/login. I have not opened the link and I have not typed anything.
```

**Pass:** **High** risk, **Today**. Do not open the link. A text in the bank's own thread can still be fake. Check the account in the bank's own app, or call the number on the card. No pink **Talk to a person** box.

## 2. Clicked link — `DSA-D-0105`

Audience: **Consumer**. Row starts with **Hei, mietityttää yksi juttu. Asensin ääniviestisovelluksen**.

They installed a voice-message app from a text link, gave it permissions, and the phone is acting strangely.

Click **Allow** if it asks to look at the phone. If it asks what you did, send:

```
Yes, the app is on the phone. I gave it accessibility permission when it asked. The screen flickers and the battery dies fast. After installing it I opened the mobile bank and checked the balance.
```

**Pass:** **Critical** risk, **Right now**. Flight mode now. Do not use that phone for banking. Hand off to a security specialist (pink box).

The badge is forced to **Critical** when the first message says an app was installed from a link. A later reply that mentions the link does not do that. The phone record in a generic chat only has store apps, which is why the example has to be picked.

## 3. Suspicious call — `DSA-D-0160`

Audience: **Consumer**. Row starts with **Soittaja sanoi olevansa teidän asiakaspalvelusta**.

A caller claiming to be operator support wanted a text code for a SIM upgrade. In this branch the customer read the code out. The phone still has signal.

Click **Allow** if it asks to check the subscription. If it asks whether you read the code out, send:

```
I read the code out to him before I got suspicious. It was about fifteen minutes ago. The phone still works normally.
```

**Pass:** **Critical** risk, **Right now**. Stop the eSIM transfer and lock the number with operator customer service, then call the bank. Pink box, and the person is operator customer service. It must not say to wait.

## 4. Breach notice — `DSA-D-0337`

Audience: **Consumer**. Row starts with **Ei kenttää puhelimessa ja tuli viesti eSIM-aktivoinnista**.

The phone has no signal, and a text says an eSIM was activated on a new device. The customer did not order it.

Click **Allow** if it asks to check the subscription. If it asks whether you ordered the eSIM, send:

```
I did not order an eSIM and I did not change phones. There is no signal at all. This was about half an hour ago. Yesterday someone called from "customer service" and asked for my personal details.
```

**Pass:** **Critical** risk, **Right now**. Stop the new eSIM and lock the number with operator customer service, then call the bank. Pink box. It must not say to wait for the signal to come back.

## 5. Small-business incident — `DSA-D-0018`

Audience: **Small business**. Row starts with **Kysyn yrityksemme puolesta. Toimittaja pyytää maksamaan**.

A supplier email from a familiar address says to pay an invoice to a new bank account. The invoice has not been paid.

If it asks, send:

```
The invoice has not been paid yet. It is due on Friday. I and the accountant both have to approve payments.
```

**Pass:** **High** risk, **Today**. Do not pay the new account. Call the supplier on a number already on the contract or an old invoice, not a number in the email. A familiar address is not proof. No pink box.

The badge is forced to **High** when the first message is an unpaid request to pay a new supplier account. A change the customer already confirmed by phone is a different example and should stay lower.

## What we saw on 7 Nov

| Journey | Case | Afternoon | Evening, final code and new agent |
|---|---|---|---|
| Suspicious message | DSA-D-0056 | Pass. High, do not open the link, no handoff. | Pass. Asked whether the link was opened, then High, today: a familiar thread proves nothing, check in the bank's own app. No handoff. |
| Clicked link | DSA-D-0105 | Pass after the badge fix. Critical, flight mode, security specialist. | Pass. Asked to check installed apps (allowed), then Critical, right now: flight mode, no banking on that phone, security specialist. |
| Suspicious call | DSA-D-0160 | Pass. Critical, stop the eSIM transfer, then the bank. | Pass. Asked whether the code was read out, then to check SIM events (allowed); Critical, right now: stop the eSIM, lock the number, then the bank. |
| Breach notice | DSA-D-0337 | Pass. Critical, lock the number, do not wait for signal. | Pass. Asked whether the eSIM was the customer's own, then to check the subscription; Critical, right now: operator agent locks the number, then the bank. The headline says "Talk to a person now" rather than "Contact operator customer service". |
| Small-business incident | DSA-D-0018 | Pass after the badge fix. High, do not pay, no handoff. | Pass. Asked whether the money was sent, then High, today: do not pay, call the supplier on a known number, keep two-person approval. No handoff. |

Every evening run was a real conversation: each asked at least one deciding question, and three also asked permission to check account data.
