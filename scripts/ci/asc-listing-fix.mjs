#!/usr/bin/env node
// Metadata fix for the App Store rejection (Guidelines 3.1.2 + 2.3.2):
//   - append a clearly-labelled SUBSCRIPTION block to the en-US description
//     (2.3.2 — paid content identified as requiring purchase), and
//   - include functional Terms of Use (EULA) + Privacy Policy links in the
//     description (3.1.2 — required subscription metadata links).
//
// Idempotent: keys off a marker line, so re-running never double-appends and
// never clobbers the existing marketing copy — it only adds the block once.
// Read-only unless APPLY=1.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   APPLY ("1" to PATCH; otherwise dry-run prints the diff).

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.0';
const APPLY = process.env.APPLY === '1';

const PRIVACY_URL = 'https://chess-academy-pro.vercel.app/privacy';
// Apple's standard EULA (used when no custom EULA is supplied in ASC).
const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const MARKER = '— SUBSCRIPTION —';

// 🚨 THE PRICE IS NOT WRITTEN HERE. It was, and that is how the live App Store
// product page came to state "$7.99/month or $79.99/year" for ten days after
// Apple started charging $3.99/$34.99 — a price misstatement on the public
// listing, quoting visitors DOUBLE the real cost before they ever installed.
//
// The tiers moved on 2026-08-24. Three separate places described that price:
// src/data/pricing.ts (the in-app Terms + Support pages), this script (the
// store description), and docs/store-listing-copy.md. One was changed. This
// reads src/data/pricing.ts so there is exactly one number to change, and the
// ASC price script gates THAT constant against what Apple actually charges.
function livePrices() {
  const src = readFileSync(new URL('../../src/data/pricing.ts', import.meta.url), 'utf8');
  const grab = (name) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*'(\\$\\d+\\.\\d{2})'`));
    if (!m) throw new Error(`could not parse ${name} from src/data/pricing.ts`);
    return m[1];
  };
  const trial = readFileSync(new URL('../../src/data/pricing.ts', import.meta.url), 'utf8')
    .match(/export const TRIAL_DAYS\s*=\s*(\d+)/);
  if (!trial) throw new Error('could not parse TRIAL_DAYS from src/data/pricing.ts');
  return { monthly: grab('PRICE_MONTHLY'), yearly: grab('PRICE_YEARLY'), trialDays: Number(trial[1]) };
}

const PRICES = livePrices();

const buildBlock = ({ monthly, yearly, trialDays }) => [
  '',
  '',
  MARKER,
  'Chess Academy Pro requires an auto-renewing Pro subscription to unlock its',
  'features — the AI coach, guided opening masterclasses, tactics training, full',
  `Stockfish game analysis, and the weaknesses trainer. Start with a ${trialDays}-day free`,
  `trial, then ${monthly}/month or ${yearly}/year.`,
  '',
  'Payment is charged to your Apple ID at confirmation of purchase. Your',
  'subscription automatically renews unless canceled at least 24 hours before the',
  'end of the current period; manage or cancel anytime in your App Store account',
  'settings. Any unused portion of a free trial is forfeited when you purchase a',
  'subscription.',
  '',
  `Privacy Policy: ${PRIVACY_URL}`,
  `Terms of Use (EULA): ${EULA_URL}`,
].join('\n');

const BLOCK = buildBlock(PRICES);

// Spelling corrections applied to the MARKETING copy above the block. Strictly
// spelling — the wording is David's, and a script does not rewrite his pitch.
// "anylizes" has been the first word of the first line of the public product
// page, on an app whose entire promise is that it analyses your games.
const SPELLING = [[/\banylizes\b/g, 'analyzes']];

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function loadKey() { let p = req('ASC_KEY_P8'); if (!p.includes('BEGIN')) p = Buffer.from(p, 'base64').toString('utf8'); return createPrivateKey({ key: p, format: 'pem' }); }
const PK = loadKey();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' }))}`;
  return `${si}.${b64url(cryptoSign('sha256', Buffer.from(si), { key: PK, dsaEncoding: 'ieee-p1363' }))}`;
}
async function api(method, path, body, { soft = false } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) { if (soft) return { __error: res.status, __body: t }; throw new Error(`${method} ${path} → ${res.status}\n${t}`); }
  return t ? JSON.parse(t) : {};
}

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);
  // 🚨 REPORT-ONLY WORK GOES FIRST, ABOVE ANYTHING THAT CAN THROW. This block
  // originally sat after the app-version lookup, so its first real run — against
  // APP_VERSION=4.0.1, before that version existed in ASC — died on "No iOS
  // version 4.0.1" and took the IAP report down with it. The subscriptions have
  // nothing to do with the app version; there was no reason for one to gate the
  // other, and a diagnostic that only works when everything else already works
  // is not much of a diagnostic.
  //
  // IN-APP PURCHASE DISPLAY NAMES — Apple INDEXES these for search, and almost
  // nobody sets them deliberately, so a subscription called "Monthly" is free
  // indexed text thrown away. Read-only here: report what is live so the waste
  // is visible, the same way the empty subtitle only became fixable once this
  // script started printing it.
  const groups = await api('GET', `/v1/apps/${app.id}/subscriptionGroups?limit=20`, null, { soft: true });
  if (!groups.__error) {
    for (const g of groups.data || []) {
      const subs = await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=20&fields[subscriptions]=productId,name`, null, { soft: true });
      if (subs.__error) continue;
      for (const sub of subs.data || []) {
        const locs = await api('GET', `/v1/subscriptions/${sub.id}/subscriptionLocalizations?limit=20`, null, { soft: true });
        const en = locs.__error ? null : (locs.data || []).find((l) => l.attributes?.locale === 'en-US');
        console.log(`IAP ${sub.attributes?.productId}: displayName="${en?.attributes?.name ?? '(none)'}" (${(en?.attributes?.name ?? '').length} chars)`);
      }
    }
  }

  const versions = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
  const version = versions.find((v) => v.attributes?.versionString === VERSION);
  if (!version) throw new Error(`No iOS version ${VERSION}`);
  console.log(`app=${app.id} version=${VERSION} state=${version.attributes?.appStoreState}`);

  const locs = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data;
  const enUS = locs.find((l) => l.attributes?.locale === 'en-US') || locs[0];
  if (!enUS) throw new Error('no version localization');

  // KEYWORDS — the 100-char App Store search field that drives discoverability
  // (ranking on "chess openings", "chess coach", etc.). "chess"/"academy"/"pro"
  // are already indexed from the app NAME, so we spend the 100 chars on the
  // complementary terms Apple combines with the name. Set via the KEYWORDS env;
  // PATCH only when APPLY=1. `soft` so a review-locked field never crashes the run.
  // SUBTITLE — 30 chars, indexed for search exactly like the keyword field, and
  // the second-heaviest ranking input after the app NAME.
  //
  // 🚨 IT LIVES ON `appInfoLocalizations`, NOT `appStoreVersionLocalizations`.
  // The first APPLY run patched the version localization and Apple rejected it
  // 409 ENTITY_ERROR.ATTRIBUTE.UNKNOWN: "'subtitle' is not an attribute on the
  // resource 'appStoreVersionLocalizations'". Subtitle and app NAME hang off the
  // APP INFO (they describe the app, not a specific version), while description
  // / keywords / What's New hang off the VERSION. Two different resources, and
  // the dry run could not catch the difference because it only ever READ.
  const SUBTITLE = process.env.SUBTITLE || '';
  const appInfos = await api('GET', `/v1/apps/${app.id}/appInfos?limit=10`, null, { soft: true });
  // Patch the EDITABLE app info — the READY_FOR_SALE one is frozen, exactly like
  // the live version's metadata.
  const editableInfo = appInfos.__error
    ? null
    : (appInfos.data || []).find((i) => i.attributes?.appStoreState !== 'READY_FOR_SALE')
      ?? (appInfos.data || [])[0];
  if (editableInfo) {
    const infoLocs = await api('GET', `/v1/appInfos/${editableInfo.id}/appInfoLocalizations?limit=50`, null, { soft: true });
    const enInfo = infoLocs.__error ? null : (infoLocs.data || []).find((l) => l.attributes?.locale === 'en-US');
    if (enInfo) {
      const cur = enInfo.attributes?.subtitle || '';
      console.log(`\nsubtitle now:  "${cur || '(empty)'}" (${cur.length}/30 chars)`);
      if (SUBTITLE) {
        console.log(`subtitle next: "${SUBTITLE}" (${SUBTITLE.length}/30 chars)`);
        if (SUBTITLE.length > 30) console.log('⚠️  subtitle exceeds 30 chars — Apple will reject.');
        if (APPLY && SUBTITLE.length <= 30) {
          const sr = await api('PATCH', `/v1/appInfoLocalizations/${enInfo.id}`, {
            data: { type: 'appInfoLocalizations', id: enInfo.id, attributes: { subtitle: SUBTITLE } },
          }, { soft: true });
          console.log(sr.__error ? `⚠️  subtitle PATCH failed: ${sr.__error} ${String(sr.__body).slice(0, 300)}` : '✅ subtitle updated');
        }
      }
    } else {
      console.log('\n⚠️  no en-US appInfoLocalization — cannot read or set the subtitle');
    }
  }

  // CATEGORIES — read-only here. The SECONDARY category is a free, additive
  // discovery surface (an app can be browsed in two), and this app had only a
  // primary set while every comparable chess-teaching app carries both.
  //
  // ⚠️  ASK FOR THE CATEGORIES EXPLICITLY. Without `include`, appInfos comes back
  // with EMPTY relationship objects and this printed "primaryCategory=(none)"
  // for an app the public store plainly lists under Games — a false finding
  // produced by the reporting, not the data. Reading a relationship you did not
  // request is the same class of mistake as the metric columns that were never
  // matched: the query returns nothing and the nothing gets reported as fact.
  const infos = await api('GET', `/v1/apps/${app.id}/appInfos?limit=10&include=primaryCategory,secondaryCategory`, null, { soft: true });
  if (!infos.__error) {
    for (const inf of infos.data || []) {
      const rel = inf.relationships || {};
      const pri = rel.primaryCategory?.data?.id ?? null;
      const sec = rel.secondaryCategory?.data?.id ?? null;
      // Report "not returned" distinctly from "genuinely unset" — conflating
      // the two is what produced the false reading.
      const show = (v) => (v === null ? '(not returned by the API)' : v);
      console.log(`appInfo ${inf.attributes?.appStoreState ?? '?'}: primaryCategory=${show(pri)} secondaryCategory=${show(sec)}`);
    }
  }

  const KEYWORDS = process.env.KEYWORDS || '';
  if (KEYWORDS) {
    console.log(`\nkeywords now:  "${enUS.attributes?.keywords || '(empty)'}"`);
    console.log(`keywords next: "${KEYWORDS}" (${KEYWORDS.length}/100 chars)`);
    if (KEYWORDS.length > 100) console.log('⚠️  keywords exceed 100 chars — Apple will reject.');
    if (APPLY) {
      const kr = await api('PATCH', `/v1/appStoreVersionLocalizations/${enUS.id}`, {
        data: { type: 'appStoreVersionLocalizations', id: enUS.id, attributes: { keywords: KEYWORDS } },
      }, { soft: true });
      console.log(kr.__error ? `⚠️  keywords PATCH failed: ${kr.__error} ${String(kr.__body).slice(0, 300)}` : '✅ keywords updated');
    }
  }

  const current = enUS.attributes?.description || '';

  // RECONCILE, DON'T APPEND-ONCE. This used to return "nothing to do" the moment
  // it saw the marker, which meant it could never correct the block it had
  // itself written — so when the price changed, the stale block stayed on the
  // live listing forever. Split the description at the marker and rebuild the
  // block from the current prices every run.
  const at = current.indexOf(MARKER);
  let head = at >= 0 ? current.slice(0, at).replace(/\s+$/, '') : current;
  const existingBlock = at >= 0 ? current.slice(at) : null;

  // Spelling pass over the marketing copy (never the generated block).
  const headBefore = head;
  for (const [re, to] of SPELLING) head = head.replace(re, to);
  if (head !== headBefore) {
    console.log('\n✏️  spelling corrections applied to the marketing copy:');
    for (const [re, to] of SPELLING) {
      const hits = headBefore.match(re);
      if (hits) console.log(`   "${hits[0]}" → "${to}" (${hits.length}×)`);
    }
  }

  const next = head + BLOCK;

  if (at >= 0) {
    const blockSame = existingBlock.trim() === BLOCK.trim();
    const headSame = head === headBefore;
    console.log(`\nsubscription block: ${blockSame ? 'up to date' : 'STALE — will be replaced'}`);
    if (!blockSame) {
      const oldPrices = [...existingBlock.matchAll(/\$\d+\.\d{2}/g)].map((m) => m[0]);
      console.log(`   live listing states: ${oldPrices.join(', ') || '(no price found)'}`);
      console.log(`   pricing.ts states:   ${PRICES.monthly}, ${PRICES.yearly}`);
    }
    if (blockSame && headSame) {
      console.log('✅ description is already correct — nothing to do.');
      return;
    }
  }
  if (next.length > 4000) {
    console.log(`⚠️  new description is ${next.length} chars (>4000 limit). Trim marketing copy first.`);
  }
  console.log(`\n── appended block (${BLOCK.length} chars) ──\n${BLOCK}\n── new length: ${next.length}/4000 ──`);

  if (!APPLY) { console.log('\n(dry-run — set APPLY=1 to PATCH the live listing)'); return; }

  const r = await api('PATCH', `/v1/appStoreVersionLocalizations/${enUS.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: enUS.id, attributes: { description: next } },
  }, { soft: true });
  console.log(r.__error ? `⚠️  description PATCH failed: ${r.__error} ${String(r.__body).slice(0, 300)}` : '✅ description updated with SUBSCRIPTION + EULA/Privacy links');
}
main().catch((e) => { console.error('\n❌ asc-listing-fix failed:\n', e.message); process.exit(1); });
