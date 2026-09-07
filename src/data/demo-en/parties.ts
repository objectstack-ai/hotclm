// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { PartyStrings } from '../strings.js';

/**
 * Forty counterparties in English (DESIGN.md §10): customers, suppliers,
 * individuals and public bodies, spread across the three jurisdictions the
 * group contracts in.
 *
 * The order is load-bearing. `../plan.ts` addresses a counterparty by INDEX,
 * and `party_kind`, `country_code`, `risk_flag` and every contract that points
 * here are keyed off that index — so inserting a name in the middle silently
 * re-labels a government body as an individual and moves two blocked
 * counterparties onto contracts that were never meant to have them. Append,
 * never insert; the `length: 40` on the type is what stops the count drifting.
 *
 * Names are invented. Any resemblance to a real company is coincidence, and
 * none of them names an industry the schema would then have to know about.
 */
export const PARTIES: readonly PartyStrings[] & { length: 40 } = [
  // 0–15 · customers (companies)
  { name: 'Aurora Systems',            legalRepresentative: 'Helen Vasquez',   contactName: 'Priya Raman',      address: '400 Harbor Street, Boston, MA 02110, United States',        bankName: 'Atlantic Commerce Bank' },
  { name: 'Northwind Logistics',       legalRepresentative: 'Tomas Berger',    contactName: 'Ana Silva',        address: 'Hafenstrasse 12, 20457 Hamburg, Germany',                   bankName: 'Norddeutsche Handelsbank' },
  { name: 'Kestrel Analytics',         legalRepresentative: 'Ruth Aldridge',   contactName: 'Owen Hartley',     address: '18 Finsbury Circus, London EC2M 7EB, United Kingdom',       bankName: 'Thames Mercantile' },
  { name: 'Solent Manufacturing',      legalRepresentative: 'Gavin Doyle',     contactName: 'Marie Fontaine',   address: 'Unit 7, Dock Road, Southampton SO14 3TL, United Kingdom',   bankName: 'Thames Mercantile' },
  { name: 'Meridian Retail Group',     legalRepresentative: 'Claudia Ruiz',    contactName: 'Peter Nolan',      address: '901 Market Street, Chicago, IL 60607, United States',       bankName: 'Great Lakes Trust' },
  { name: 'Basalt Energy',             legalRepresentative: 'Ingrid Sorensen', contactName: 'Lukas Brandt',     address: 'Königsallee 44, 40212 Düsseldorf, Germany',                 bankName: 'Rheinische Kreditbank' },
  { name: 'Halcyon Media',             legalRepresentative: 'Daniel Okafor',   contactName: 'Sofia Marchetti',  address: '77 Charlotte Street, London W1T 4PW, United Kingdom',       bankName: 'Thames Mercantile' },
  { name: 'Cobalt Pharmaceuticals',    legalRepresentative: 'Naomi Feldman',   contactName: 'Erik Lindqvist',   address: '250 Innovation Way, Princeton, NJ 08540, United States',    bankName: 'Atlantic Commerce Bank' },
  { name: 'Verdant Agriculture',       legalRepresentative: 'Marta Kowalski',  contactName: 'Jonas Meyer',      address: 'Feldweg 3, 30159 Hannover, Germany',                        bankName: 'Norddeutsche Handelsbank' },
  { name: 'Stratus Cloud Services',    legalRepresentative: 'Alan Whitfield',  contactName: 'Yuki Tanaka',      address: '1200 Pacific Avenue, Seattle, WA 98101, United States',     bankName: 'Cascade Federal' },
  { name: 'Lantern Financial',         legalRepresentative: 'Beatrice Lam',    contactName: 'Hugo Ferreira',    address: '30 Old Broad Street, London EC2N 1HQ, United Kingdom',      bankName: 'Thames Mercantile' },
  { name: 'Ironwood Construction',     legalRepresentative: 'Samuel Ortiz',    contactName: 'Nadia Haddad',     address: '55 Quarry Road, Denver, CO 80202, United States',           bankName: 'Great Lakes Trust' },
  { name: 'Pelagic Shipping',          legalRepresentative: 'Kirsten Vogel',   contactName: 'Mateo Duarte',     address: 'Speicherstadt 8, 20457 Hamburg, Germany',                   bankName: 'Norddeutsche Handelsbank' },
  { name: 'Quillon Software',          legalRepresentative: 'Ravi Menon',      contactName: 'Elena Petrova',    address: '4 Chancery Lane, London WC2A 1LG, United Kingdom',          bankName: 'Thames Mercantile' },
  { name: 'Sable Insurance',           legalRepresentative: 'Grace Ellington', contactName: 'Tobias Reiner',    address: '600 Congress Avenue, Austin, TX 78701, United States',      bankName: 'Lone Star Commercial' },
  { name: 'Tidewater Hospitality',     legalRepresentative: 'Emmanuel Cisse',  contactName: 'Ingrid Halvorsen', address: 'Neuer Wall 21, 20354 Hamburg, Germany',                     bankName: 'Rheinische Kreditbank' },
  // 16–29 · suppliers (companies)
  { name: 'Granite Facilities',        legalRepresentative: 'Paula Nkemdirim', contactName: 'Dieter Krause',    address: 'Industriestrasse 90, 50827 Köln, Germany',                  bankName: 'Rheinische Kreditbank' },
  { name: 'Beacon Print & Packaging',  legalRepresentative: 'Colin Marsh',     contactName: 'Amara Diallo',     address: '12 Trade Park, Leeds LS11 5DR, United Kingdom',             bankName: 'Northern Union Bank' },
  { name: 'Vantage Staffing',          legalRepresentative: 'Rosa Delgado',    contactName: 'Kenji Watanabe',   address: '820 Third Avenue, New York, NY 10022, United States',       bankName: 'Atlantic Commerce Bank' },
  { name: 'Corvus Security Services',  legalRepresentative: 'Fionn Byrne',     contactName: 'Lena Achterberg',  address: 'Torstrasse 140, 10119 Berlin, Germany',                     bankName: 'Rheinische Kreditbank' },
  { name: 'Alder Legal Support',       legalRepresentative: 'Miriam Stein',    contactName: 'Paul Rousseau',    address: '2 Gray’s Inn Square, London WC1R 5AA, United Kingdom',      bankName: 'Thames Mercantile' },
  { name: 'Copperfield Travel',        legalRepresentative: 'Ahmed Zaki',      contactName: 'Julia Nowak',      address: '311 Michigan Avenue, Chicago, IL 60604, United States',     bankName: 'Great Lakes Trust' },
  { name: 'Willow Catering',           legalRepresentative: 'Sinead Keane',    contactName: 'Marco Bianchi',    address: '44 Mill Lane, Manchester M4 1LE, United Kingdom',           bankName: 'Northern Union Bank' },
  { name: 'Harborline Freight',        legalRepresentative: 'Bjorn Aalto',     contactName: 'Chloe Dubois',     address: 'Am Sandtorkai 50, 20457 Hamburg, Germany',                  bankName: 'Norddeutsche Handelsbank' },
  { name: 'Pinnacle IT Hardware',      legalRepresentative: 'Ellis Grant',     contactName: 'Rahul Bhatt',      address: '3400 Technology Drive, San Jose, CA 95110, United States',  bankName: 'Cascade Federal' },
  { name: 'Fernway Cleaning',          legalRepresentative: 'Anneke Visser',   contactName: 'Tomasz Wojcik',    address: 'Lindenstrasse 15, 60329 Frankfurt am Main, Germany',        bankName: 'Rheinische Kreditbank' },
  { name: 'Bramble Office Supplies',   legalRepresentative: 'Neil Sutherland', contactName: 'Farida Osman',     address: '9 Kingsway, Cardiff CF10 3BZ, United Kingdom',              bankName: 'Northern Union Bank' },
  { name: 'Onyx Data Centres',         legalRepresentative: 'Vera Lindholm',   contactName: 'Jack Ferreira',    address: '1500 Data Park Road, Ashburn, VA 20147, United States',     bankName: 'Atlantic Commerce Bank' },
  { name: 'Summit Translation',        legalRepresentative: 'Hana Fischer',    contactName: 'Isabel Moreno',    address: 'Maximilianstrasse 6, 80539 München, Germany',               bankName: 'Rheinische Kreditbank' },
  { name: 'Redwood Recruitment',       legalRepresentative: 'Oliver Pankhurst',contactName: 'Sara Bergström',   address: '25 Cannon Street, London EC4M 5SH, United Kingdom',         bankName: 'Thames Mercantile' },
  // 30–35 · individuals (independent contractors)
  { name: 'Marcus Lindgren',           legalRepresentative: 'Marcus Lindgren', contactName: 'Marcus Lindgren',  address: '14 Prospect Terrace, Portland, OR 97205, United States',    bankName: 'Cascade Federal' },
  { name: 'Aisha Bello',               legalRepresentative: 'Aisha Bello',     contactName: 'Aisha Bello',      address: '61 Bridge Street, Bristol BS1 4RQ, United Kingdom',         bankName: 'Northern Union Bank' },
  { name: 'Henrik Sundberg',           legalRepresentative: 'Henrik Sundberg', contactName: 'Henrik Sundberg',  address: 'Gartenstrasse 22, 70173 Stuttgart, Germany',                bankName: 'Rheinische Kreditbank' },
  { name: 'Camille Beauchamp',         legalRepresentative: 'Camille Beauchamp',contactName: 'Camille Beauchamp',address: '7 Rue Basse, 67000 Strasbourg, France',                    bankName: 'Banque de l’Est' },
  { name: 'Daniel Aoki',               legalRepresentative: 'Daniel Aoki',     contactName: 'Daniel Aoki',      address: '2-1-3 Shibaura, Minato-ku, Tokyo 108-0023, Japan',          bankName: 'Tokyo Central Bank' },
  { name: 'Grace Mbeki',               legalRepresentative: 'Grace Mbeki',     contactName: 'Grace Mbeki',      address: '88 Silver Street, Leeds LS1 4AG, United Kingdom',           bankName: 'Northern Union Bank' },
  // 36–37 · public bodies
  { name: 'Port Authority of Hamburg', legalRepresentative: 'Dr. Katrin Ebert',contactName: 'Stefan Roth',      address: 'Neuer Wandrahm 4, 20457 Hamburg, Germany',                  bankName: 'Landesbank Nord' },
  { name: 'Massachusetts Transit Board',legalRepresentative: 'Angela Prescott',contactName: 'Devon Carter',     address: '10 Park Plaza, Boston, MA 02116, United States',            bankName: 'Commonwealth Treasury Bank' },
  // 38–39 · blocked counterparties (DESIGN.md §10: two)
  { name: 'Ridgemont Trading',         legalRepresentative: 'Unknown',         contactName: 'Not verified',     address: 'PO Box 4471, Road Town, Tortola, British Virgin Islands',   bankName: 'Not verified' },
  { name: 'Delta Ridge Holdings',      legalRepresentative: 'Unknown',         contactName: 'Not verified',     address: 'PO Box 1180, Panama City, Panama',                          bankName: 'Not verified' },
] as const;
