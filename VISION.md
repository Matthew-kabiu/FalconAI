# Vision: Falcon AI

> Farm records, crop planning and early crop-health guidance for small-scale farmers in Kenya, on any phone browser.

## What it delivers

Falcon AI is a mobile-friendly web app that farmers can install on their phone. It helps a small-scale farmer register their farm and plots, record what they plant and when, follow a simple crop calendar, log activities, inputs and costs, and keep a history of each season. A farmer can photograph a sick leaf or plant and get an AI-assisted first opinion: likely causes, how sure the system is, and safe next steps. Unclear or serious cases are sent to a qualified agricultural professional rather than guessed at.

It is a farm-management platform in which disease assessment is one tool among several. It is not just a crop-disease detector.

## Who it's for

- **Primary:** small-scale farmers growing staple food crops in Kenya, using low-cost smartphones with patchy connectivity and varied digital confidence, in English or Kiswahili.
- **Secondary:** farmer groups, cooperatives and community agricultural networks.
- **Reviewers:** agricultural extension officers and agronomists, who check AI assessments during the pilot.

It is not for large commercial farms, agronomists who need a professional diagnostic tool, or livestock keepers (phase 1).

## Why it exists

Many small-scale farmers cannot reach affordable, timely agricultural advice when a problem appears. They decide what and when to plant, how to respond to symptoms, and how to spend on seed, fertiliser and labour, often from memory or informal advice. Late or wrong decisions cost crops, money and inputs. Without simple records, farmers cannot compare seasons or understand their production costs. Falcon AI brings records, planning and early crop-health awareness into one tool built for the phones and connections farmers actually have.

## Why now

The Mekatilili Micro-Grant (up to KES 100,000) funds a three-month prototype and community pilot. The application closes on 22 November 2026, awards are announced in February 2027, and the build and pilot run February to April 2027. Missing the window means no funded pilot and no field evidence for the next stage.

## Success criteria

- [ ] A farmer can register, sign in, and create a farm with at least one plot, using a low-cost Android phone browser.
- [ ] A farmer can start a crop cycle on a plot for any crop in Falcon AI's catalogue (or one they name), with a planting date, and sees a crop calendar of upcoming growth stages and activities wherever that crop's calendar comes from a published reference.
- [ ] A farmer can log farm activities, inputs, quantities and costs against a crop cycle, and see the season's history.
- [ ] The farmer dashboard shows registered plots, active crops, upcoming activities and recent crop-health assessments.
- [ ] A farmer can upload a photo of a maize or bean plant and receives a preliminary assessment with likely causes, a confidence level and safe next steps; when confidence is too low or the image is poor, the system asks for a better photo or refers the case for human review instead of guessing.
- [ ] Every assessment can be reviewed by a qualified agricultural professional, and the pilot report compares a sample of AI assessments with expert-reviewed outcomes.
- [ ] Every farmer-facing screen is available in English and Kiswahili.
- [ ] The app can be installed on a phone and still shows previously loaded farm information when the connection drops.
- [ ] Between 20 and 30 farmers are invited to the pilot, and the number who actually take part is recorded.
- [ ] A farmer can only ever see and change their own farm records.

## What can't change

- **Backend:** Rust (Axum, SeaORM, PostgreSQL), following the Rust backend build template. Domain rules live in a `falcon-core` crate with no web-server or database code, so they can later be compiled into Android and iOS apps; `falcon-api` is the only server.
- **Web app:** Vite + React, installable as a Progressive Web App (a website that can be installed and used like a phone app), following the Vite build template and the frontend UI/motion tooling standard. It talks to the backend only through the versioned `/api/v1` REST API, the same API future mobile apps will use.
- **Crops (Matt, 2026-11-19):** farm records work for many crops, not just two: a catalogue starting with the proposal's list (maize, sorghum, millet, rice, beans, green grams, cowpeas, pigeon peas, cassava, Irish potatoes, sweet potatoes, bananas) plus any crop a farmer names. A crop calendar is shown only where its timings come from a published Kenyan reference, marked for agricultural review. Crop-health assessment stays maize and beans for the pilot. Disease coverage is switched on for a crop and condition only when there is suitable reference data and a credible validation process.
- **Safety:** decision support only. Never a substitute for an agronomist or extension officer; never prescribes pesticide dosage or encourages unsafe chemical use.
- **Privacy:** compliant with Kenya's Data Protection Act. Collect only what the service needs; get informed consent before any photo is used to improve the model; give farmers a way to ask for correction or deletion.
- **Budget and time:** KES 100,000 and three months (February to April 2027). No founder salaries in the budget.

## What it won't do

- No animal or livestock health features in phase 1.
- No validated disease-diagnosis claims for crops beyond maize and beans, and no claim that yields or food security improved; the pilot measures usefulness, not impact.
- No automatic pesticide or chemical prescriptions or dosages.
- No training a disease model from scratch before existing licensed models and datasets have been evaluated.
- No native Android or iOS app during the grant period; the PWA comes first.
- No market prices, advanced farm analytics or broad third-party integrations during the pilot.
