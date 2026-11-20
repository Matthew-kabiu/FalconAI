// Kiswahili text for the public site (TaskLabs #295).
// FIRST DRAFT: pending the month-3 translation review. Simple, everyday Kiswahili.
import type { siteEn } from './site.en';

export const siteSw: Record<keyof typeof siteEn, string> = {
  // Navigation
  'site.nav.label': 'Menyu kuu',
  'site.nav.home': 'Nyumbani',
  'site.nav.features': 'Huduma',
  'site.nav.cropHealth': 'Afya ya mazao',
  'site.nav.pilot': 'Majaribio',
  'site.nav.openMenu': 'Fungua menyu',
  'site.nav.closeMenu': 'Funga menyu',

  // Shared actions
  'site.cta.signUp': 'Fungua akaunti',
  'site.cta.features': 'Ona inachofanya',
  'site.cta.allFeatures': 'Ona huduma zote',
  'site.cta.cropHealth': 'Jinsi ukaguzi unavyofanya kazi',
  'site.cta.pilot': 'Kuhusu majaribio',
  'site.cta.learnMore': 'Soma zaidi',

  // Release status chips
  'site.status.first': 'Toleo la kwanza',
  'site.status.later': 'Baadaye katika majaribio',

  // Home: hero
  'site.home.hero.eyebrow': 'Majaribio yamepangwa kufanyika 2027',
  'site.home.hero.title': 'Kumbukumbu za shamba lako na ushauri wa mazao, kwenye simu yako.',
  'site.home.hero.body':
    'Panga misimu ya mahindi na maharagwe, fuatilia unachotumia, na upate maoni ya awali ya makini mimea inapoonekana kuwa na ugonjwa.',
  'site.home.hero.photoAlt':
    'Mimea michanga ya maharagwe ikikua kati ya mabua ya mahindi kwenye shamba dogo.',

  // Home: at a glance
  'site.home.facts.label': 'Kwa ufupi',
  'site.home.facts.crops.title': 'Mahindi na maharagwe',
  'site.home.facts.crops.body': 'Mazao mawili ya majaribio',
  'site.home.facts.language.title': 'Kiingereza na Kiswahili',
  'site.home.facts.language.body': 'Badilisha wakati wowote',
  'site.home.facts.phone.title': 'Simu za bei nafuu',
  'site.home.facts.phone.body': 'Inafanya kazi kwenye kivinjari',
  'site.home.facts.privacy.title': 'Kumbukumbu za siri',
  'site.home.facts.privacy.body': 'Ni wewe tu unayeona shamba lako',

  // Home: features
  'site.home.features.kicker': 'Inachofanya',
  'site.home.features.title': 'Mahali pamoja kwa msimu mzima',
  'site.home.features.lead':
    'Kuanzia kipande cha kwanza hadi gharama ya mwisho ya mavuno, kumbukumbu zako zinakaa pamoja.',

  // The four tools (shared by Home and Features)
  'site.tool.farm.title': 'Mashamba na vipande',
  'site.tool.farm.short': 'Andika kila shamba na kipande, pamoja na kaunti na ukubwa wake.',
  'site.tool.farm.body': 'Anza kwa kueleza ardhi yako. Kila kumbukumbu ya baadaye inahusu kipande fulani.',
  'site.tool.farm.point1': 'Ongeza shamba zaidi ya moja',
  'site.tool.farm.point2': 'Kipe kila kipande jina, kaunti na ukubwa',
  'site.tool.farm.point3': 'Tumia ekari au hekta',

  'site.tool.calendar.title': 'Kalenda ya mazao',
  'site.tool.calendar.short': 'Ona kila hatua ya ukuaji na kazi inayofuata.',
  'site.tool.calendar.body': 'Iambie Falcon AI ulichopanda na lini. Inakupangia msimu ulio mbele yako.',
  'site.tool.calendar.point1': 'Mahindi na maharagwe katika majaribio',
  'site.tool.calendar.point2': 'Hatua za ukuaji zinaonyeshwa kwa mpangilio wa muda',
  'site.tool.calendar.point3': 'Kazi inayofuata, kwa mtazamo mmoja',

  'site.tool.costs.title': 'Kazi na gharama',
  'site.tool.costs.short': 'Andika kazi, gharama yake, na uone jumla ya msimu.',
  'site.tool.costs.body': 'Andika kazi unapoifanya, na gharama yake.',
  'site.tool.costs.point1': 'Kupanda, palizi, mbolea, vibarua na zaidi',
  'site.tool.costs.point2': 'Kiasi na gharama kwa KES',
  'site.tool.costs.point3': 'Jumla inayoendelea ya msimu',

  'site.tool.health.title': 'Ukaguzi wa afya ya mazao',
  'site.tool.health.short': 'Piga picha mmea mgonjwa upate maoni ya awali ya makini.',
  'site.tool.health.body':
    'Piga picha mmea mgonjwa wa mahindi au maharagwe upate maoni ya awali na hatua salama za kufuata.',
  'site.tool.health.point1': 'Sababu zinazowezekana, kwa maneno rahisi',
  'site.tool.health.point2': 'Mfumo una uhakika kiasi gani',
  'site.tool.health.point3': 'Ukaguzi wa mtaalamu kwa hali zisizo wazi',

  // Home: steps
  'site.home.steps.title': 'Anza kwa hatua tatu',
  'site.home.steps.lead': 'Kila hatua ni skrini moja fupi.',
  'site.home.steps.farm.title': 'Ongeza shamba lako',
  'site.home.steps.farm.body': 'Lipe shamba lako jina na uweke vipande vyako.',
  'site.home.steps.crop.title': 'Panda zao',
  'site.home.steps.crop.body': 'Chagua mahindi au maharagwe na tarehe uliyopanda.',
  'site.home.steps.records.title': 'Weka kumbukumbu',
  'site.home.steps.records.body': 'Andika kila kazi na gharama yake msimu unapoendelea.',
  'site.home.steps.photoAlt':
    'Mkulima aliyevaa kitambaa cha manjano kichwani analima kwa jembe la mkono kati ya mimea michanga ya maharagwe.',

  // Home: crop health
  'site.home.health.kicker': 'Ukaguzi wa afya ya mazao',
  'site.home.health.title': 'Maoni ya awali ya makini, si utambuzi kamili wa ugonjwa',
  'site.home.health.body':
    'Falcon AI itakuambia tatizo linaloweza kuwepo na ina uhakika kiasi gani. Haibahatishi.',
  'site.home.health.confidence': 'Inaonyesha ina uhakika kiasi gani, kwa maneno na kwa namba.',
  'site.home.health.retake': 'Inaomba picha iliyo wazi zaidi isipoweza kutambua.',
  'site.home.health.expert': 'Inatuma hali zisizo wazi au nzito kwa mtaalamu aliyehitimu.',
  'site.home.health.calloutTitle': 'Haitoi vipimo vya dawa za wadudu, kamwe',
  'site.home.health.calloutBody':
    'Falcon AI haikuambii kamwe utumie kemikali kiasi gani. Fuata lebo ya bidhaa na afisa wa ugani wa eneo lako.',

  // Home: audience
  'site.home.audience.title': 'Imeundwa kwa mashamba madogo na simu za kawaida',
  'site.home.audience.body': 'Imejengwa kulingana na simu na mtandao ulio nao tayari.',
  'site.home.audience.photoAlt':
    'Wanawake wawili wakitabasamu huku wakitunza mahindi machanga na sukuma wiki kwenye shamba la mlimani nchini Kenya.',

  // Closing call to action (every page)
  'site.band.title': 'Anza kumbukumbu za shamba lako leo',
  'site.band.body': 'Fungua akaunti sasa. Kila sehemu ya Falcon AI inafunguliwa inapokuwa tayari.',

  // Features page
  'site.features.hero.title': 'Kila kitu ambacho Falcon AI inafanya',
  'site.features.hero.lead': 'Zana nne zinazofuata zao lako kuanzia kupanda hadi kuvuna.',
  'site.features.built.title': 'Imejengwa kulingana na jinsi unavyolima',
  'site.features.built.phone.title': 'Simu za bei nafuu',
  'site.features.built.phone.body':
    'Inafanya kazi kwenye kivinjari cha simu ya Android ya bei nafuu. Huhitaji duka la programu.',
  'site.features.built.offline.title': 'Mtandao usio imara',
  'site.features.built.offline.body':
    'Tunaijenga ili iendelee kuonyesha taarifa za shamba ulizokwisha kufungua mtandao unapokatika.',
  'site.features.built.language.title': 'Lugha mbili',
  'site.features.built.language.body': 'Kiingereza na Kiswahili kwenye kila skrini.',
  'site.features.built.privacy.title': 'Faragha tangu mwanzo',
  'site.features.built.privacy.body': 'Ni wewe tu unayeweza kuona na kubadilisha kumbukumbu za shamba lako.',

  // Crop health page
  'site.health.hero.title': 'Jinsi ukaguzi wa afya ya mazao unavyofanya kazi',
  'site.health.hero.lead': 'Picha, maoni ya awali ya makini, na mtu wa kuyaunga mkono.',
  'site.health.hero.notice': 'Umepangwa kwa majaribio ya 2027. Bado haujafunguliwa.',
  'site.health.flow.title': 'Kutoka picha hadi hatua inayofuata',
  'site.health.flow.capture.title': 'Piga picha',
  'site.health.flow.capture.body': 'Chagua zao, kisha piga picha jani, shina au mmea mzima.',
  'site.health.flow.check.title': 'Tunakagua picha',
  'site.health.flow.check.body': 'Picha ikiwa na giza au ukungu, utaombwa upige nyingine iliyo wazi zaidi.',
  'site.health.flow.opinion.title': 'Unapata maoni ya awali',
  'site.health.flow.opinion.body':
    'Sababu zinazowezekana, mfumo una uhakika kiasi gani, na hatua salama za kufuata.',
  'site.health.flow.expert.title': 'Mtaalamu hukagua hali zisizo wazi',
  'site.health.flow.expert.body':
    'Hali zenye uhakika mdogo au zilizo nzito hupelekwa kwa mtaalamu wa kilimo aliyehitimu.',
  'site.health.limits.title': 'Mambo ambayo haitafanya kamwe',
  'site.health.limits.lead': 'Mipaka hii ni sehemu ya muundo wenyewe, si maandishi madogo ya chini.',
  'site.health.limits.dose.title': 'Kutoa vipimo vya dawa za wadudu',
  'site.health.limits.dose.body':
    'Haikuambii kamwe utumie kemikali kiasi gani. Fuata lebo ya bidhaa na ushauri wa mtaalamu wa eneo lako.',
  'site.health.limits.replace.title': 'Kuchukua nafasi ya mtaalamu',
  'site.health.limits.replace.body':
    'Inakusaidia kufanya uamuzi. Haichukui nafasi ya mtaalamu wa kilimo wala afisa wa ugani.',
  'site.health.limits.guess.title': 'Kubahatisha',
  'site.health.limits.guess.body':
    'Isipokuwa na uhakika, inasema hivyo na kuomba picha bora zaidi au ukaguzi wa mtu.',
  'site.health.limits.crops.title': 'Kushughulikia kila zao',
  'site.health.limits.crops.body':
    'Majaribio yanahusu matatizo machache yaliyochaguliwa ya mahindi na maharagwe tu.',
  'site.health.consent.title': 'Picha zako zinabaki kuwa zako',
  'site.health.consent.body':
    'Picha inatumika kujibu swali lako. Inatumika kuboresha mfumo ikiwa tu umekubali kwanza.',

  // Pilot page
  'site.pilot.hero.title': 'Majaribio ya 2027',
  'site.pilot.hero.lead':
    'Majaribio ya miezi mitatu pamoja na wakulima, yamepangwa kuanzia Februari hadi Aprili 2027.',
  'site.pilot.hero.photoAlt':
    'Mkulima aliyevaa kofia ya kufumwa ameinama akipalilia kipande cha kijani mlimani huku mwingine akifanya kazi nyuma yake.',
  'site.pilot.hero.notice':
    'Huu ni mpango. Falcon AI bado haijajaribiwa na wakulima wala kukaguliwa na wataalamu wa kilimo.',
  'site.pilot.timeline.title': 'Miezi mitatu, hatua tatu',
  'site.pilot.timeline.feb.month': 'Februari',
  'site.pilot.timeline.feb.title': 'Kusikiliza na kuweka msingi',
  'site.pilot.timeline.feb.body':
    'Kuzungumza na wakulima, kisha kujenga akaunti, mashamba, vipande na kumbukumbu za mazao.',
  'site.pilot.timeline.mar.month': 'Machi',
  'site.pilot.timeline.mar.title': 'Kujenga na kukagua',
  'site.pilot.timeline.mar.body':
    'Kuongeza kalenda ya mazao, kumbukumbu za kazi na ukaguzi wa afya ya mazao.',
  'site.pilot.timeline.apr.month': 'Aprili',
  'site.pilot.timeline.apr.title': 'Majaribio na wakulima',
  'site.pilot.timeline.apr.body':
    'Kualika wakulima 20 hadi 30, kukusanya maoni yao na kulinganisha maoni ya mfumo na ukaguzi wa wataalamu.',
  'site.pilot.measure.title': 'Tutakachoangalia',
  'site.pilot.measure.tasks': 'Je, wakulima wanaweza kumaliza kazi kuu?',
  'site.pilot.measure.clear': 'Je, maelekezo ni rahisi kuelewa?',
  'site.pilot.measure.abstain': 'Mfumo unaomba picha bora zaidi au mtaalamu mara ngapi?',
  'site.pilot.measure.compare': 'Maoni yake yanalinganaje na ukaguzi wa wataalamu?',
  'site.pilot.limits.title': 'Mambo ambayo hatutadai',
  'site.pilot.limits.body':
    'Majaribio yanapima kama Falcon AI ina manufaa. Hayawezi kuonyesha kuwa mavuno au usalama wa chakula umeongezeka. Hilo linahitaji utafiti wa muda mrefu zaidi.',
  'site.pilot.faq.title': 'Maswali ya kawaida',
  'site.pilot.faq.crops.q': 'Inahusu mazao gani?',
  'site.pilot.faq.crops.a':
    'Mahindi na maharagwe katika majaribio. Mazao mengine yanaongezwa tu pale kunapokuwa na data nzuri ya marejeleo na njia ya kukagua matokeo.',
  'site.pilot.faq.internet.q': 'Je, ninahitaji intaneti wakati wote?',
  'site.pilot.faq.internet.a':
    'Unahitaji mtandao ili kuhifadhi na kufungua taarifa mpya. Tunaijenga ili iendelee kuonyesha ulichokwisha kufungua mtandao unapokatika.',
  'site.pilot.faq.language.q': 'Ninaweza kutumia lugha gani?',
  'site.pilot.faq.language.a': 'Kiingereza na Kiswahili. Unaweza kubadilisha wakati wowote.',
  'site.pilot.faq.privacy.q': 'Nani anaweza kuona kumbukumbu zangu?',
  'site.pilot.faq.privacy.a': 'Ni wewe tu. Unaweza kuomba taarifa zako zirekebishwe au zifutwe.',
  'site.pilot.faq.advice.q': 'Je, ushauri wa afya ya mazao ni wa mwisho?',
  'site.pilot.faq.advice.a':
    'Hapana. Ni maoni ya awali ya kukusaidia kuamua. Kwa matatizo makubwa, zungumza na mtaalamu wa kilimo au afisa wa ugani.',

  // "Keep reading" links at the end of each page
  'site.related.title': 'Endelea kusoma',
  'site.related.features': 'Zana nne zinazofuata zao lako.',
  'site.related.cropHealth': 'Jinsi picha inavyokuwa maoni ya awali ya makini.',
  'site.related.pilot': 'Mpango, ratiba na tutakachopima.',

  // Footer
  'site.footer.tagline':
    'Kumbukumbu za shamba, kupanga mazao na mwongozo wa mapema wa afya ya mazao kwa wakulima wadogo nchini Kenya.',
  'site.footer.note':
    'Falcon AI inakusaidia kufanya uamuzi tu. Haichukui nafasi ya mtaalamu wa kilimo wala afisa wa ugani.',
  'site.footer.product': 'Bidhaa',
  'site.footer.project': 'Mradi',
  'site.footer.account': 'Akaunti',
  'site.footer.howItWorks': 'Jinsi inavyofanya kazi',
  'site.footer.status': 'Hali ya huduma',
  'site.footer.photos': 'Vyanzo vya picha',
  'site.footer.photosSource': 'Picha kutoka Wikimedia Commons, zimepunguzwa ukubwa.',
  'site.footer.by': 'na',
};
