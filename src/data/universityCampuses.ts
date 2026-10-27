/** Top 50 US universities with campus coords + stereotypical scene tags. */
import type { ScenePlace } from '../lib/sceneMap';

export type CampusScene = {
  rank: number;
  name: string;
  short: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  primary: string;
  secondary?: string;
  blurb: string;
};

export const UNIVERSITY_CAMPUSES: CampusScene[] = [
  { rank: 1, name: 'Princeton University', short: 'Princeton', city: 'Princeton', state: 'NJ', lat: 40.3431, lng: -74.6551, primary: 'nepo-babies', secondary: 'consulting', blurb: 'Eating clubs and quiet money. Someone called networking "just dinner."' },
  { rank: 2, name: 'Massachusetts Institute of Technology', short: 'MIT', city: 'Cambridge', state: 'MA', lat: 42.3601, lng: -71.0942, primary: 'tech-bros', secondary: 'stem-kids', blurb: 'Hoodies as formalwear. Someone optimized their sleep schedule in public.' },
  { rank: 3, name: 'Harvard University', short: 'Harvard', city: 'Cambridge', state: 'MA', lat: 42.377, lng: -71.1167, primary: 'finance-bros', secondary: 'nepo-babies', blurb: 'Final clubs energy. Everyone has a "small project" that is somehow a hedge fund.' },
  { rank: 4, name: 'Stanford University', short: 'Stanford', city: 'Stanford', state: 'CA', lat: 37.4275, lng: -122.1697, primary: 'startup-founders', secondary: 'tech-bros', blurb: 'Garage mythos on every street. Someone pitched you before introductions finished.' },
  { rank: 5, name: 'Yale University', short: 'Yale', city: 'New Haven', state: 'CT', lat: 41.3163, lng: -72.9223, primary: 'nepo-babies', secondary: 'media-kids', blurb: 'Secret society soft power. The scarf game is undefeated.' },
  { rank: 6, name: 'California Institute of Technology', short: 'Caltech', city: 'Pasadena', state: 'CA', lat: 34.1377, lng: -118.1253, primary: 'stem-kids', secondary: 'tech-bros', blurb: 'Problem sets as personality. Someone corrected the sun.' },
  { rank: 7, name: 'Duke University', short: 'Duke', city: 'Durham', state: 'NC', lat: 36.0014, lng: -78.9382, primary: 'douches', secondary: 'finance-bros', blurb: 'Lacrosse energy in January. Everyone looks like they own a boat they never use.' },
  { rank: 8, name: 'Johns Hopkins University', short: 'Hopkins', city: 'Baltimore', state: 'MD', lat: 39.3299, lng: -76.6205, primary: 'try-hards', secondary: 'stem-kids', blurb: 'Pre-med density critical. Coffee is a food group.' },
  { rank: 9, name: 'Northwestern University', short: 'Northwestern', city: 'Evanston', state: 'IL', lat: 42.0565, lng: -87.6753, primary: 'media-kids', secondary: 'finance-bros', blurb: 'Medill kids and consulting kids sharing the same overpriced latte.' },
  { rank: 10, name: 'University of Pennsylvania', short: 'Penn', city: 'Philadelphia', state: 'PA', lat: 39.9522, lng: -75.1932, primary: 'finance-bros', secondary: 'wall-street', blurb: 'Wharton gravity bends nearby majors. Patagonia count per block is illegal.' },
  { rank: 11, name: 'Cornell University', short: 'Cornell', city: 'Ithaca', state: 'NY', lat: 42.4534, lng: -76.4735, primary: 'try-hards', secondary: 'finance-bros', blurb: 'Gorges and grind culture. Someone said "Ithaca is gorges" unironically again.' },
  { rank: 12, name: 'University of Chicago', short: 'UChicago', city: 'Chicago', state: 'IL', lat: 41.7886, lng: -87.5987, primary: 'try-hards', secondary: 'stem-kids', blurb: 'Where fun goes to die, and then writes a paper about it.' },
  { rank: 13, name: 'Brown University', short: 'Brown', city: 'Providence', state: 'RI', lat: 41.8268, lng: -71.4025, primary: 'hipsters', secondary: 'nepo-babies', blurb: 'Open curriculum soft launch. Everyone is curating a vibe, not a major.' },
  { rank: 14, name: 'Dartmouth College', short: 'Dartmouth', city: 'Hanover', state: 'NH', lat: 43.7044, lng: -72.2887, primary: 'frat-bros', secondary: 'douches', blurb: 'Greek row meets New England money. The woods have heard things.' },
  { rank: 15, name: 'Columbia University', short: 'Columbia', city: 'New York', state: 'NY', lat: 40.8075, lng: -73.9626, primary: 'finance-bros', secondary: 'media-kids', blurb: 'Morningside finance pipeline. Someone name-dropped Midtown like a subway stop.' },
  { rank: 16, name: 'Rice University', short: 'Rice', city: 'Houston', state: 'TX', lat: 29.7174, lng: -95.4018, primary: 'try-hards', secondary: 'stem-kids', blurb: 'College system charm with STEM intensity. Quietly elite.' },
  { rank: 17, name: 'University of Notre Dame', short: 'Notre Dame', city: 'Notre Dame', state: 'IN', lat: 41.7056, lng: -86.2353, primary: 'athletes', secondary: 'frat-bros', blurb: 'Football as religion. Someone scheduled classes around the game.' },
  { rank: 18, name: 'Vanderbilt University', short: 'Vandy', city: 'Nashville', state: 'TN', lat: 36.1447, lng: -86.8027, primary: 'douches', secondary: 'party-animals', blurb: 'Southern prep meets Broadway weekends. Boots are a personality.' },
  { rank: 19, name: 'Washington University in St. Louis', short: 'WashU', city: 'St. Louis', state: 'MO', lat: 38.6488, lng: -90.3108, primary: 'try-hards', secondary: 'nepo-babies', blurb: 'Quietly loaded. Someone said "WashU not Washington" three times.' },
  { rank: 20, name: 'Emory University', short: 'Emory', city: 'Atlanta', state: 'GA', lat: 33.7925, lng: -84.324, primary: 'pre-med', secondary: 'nepo-babies', blurb: 'Pre-med industrial complex. The library never sleeps; neither do they.' },
  { rank: 21, name: 'Georgetown University', short: 'Georgetown', city: 'Washington', state: 'DC', lat: 38.9076, lng: -77.0723, primary: 'finance-bros', secondary: 'consulting', blurb: 'Hoya policy kids who somehow all end up in banking.' },
  { rank: 22, name: 'University of California, Berkeley', short: 'Berkeley', city: 'Berkeley', state: 'CA', lat: 37.8719, lng: -122.2585, primary: 'startup-founders', secondary: 'hipsters', blurb: 'Protest energy and startup energy sharing the same coffee line.' },
  { rank: 23, name: 'University of California, Los Angeles', short: 'UCLA', city: 'Los Angeles', state: 'CA', lat: 34.0689, lng: -118.4452, primary: 'athletes', secondary: 'media-kids', blurb: 'Sun-drenched ambition. Someone is always filming something.' },
  { rank: 24, name: 'University of Southern California', short: 'USC', city: 'Los Angeles', state: 'CA', lat: 34.0224, lng: -118.2851, primary: 'douches', secondary: 'nepo-babies', blurb: 'Trojan network flex. The cars in the parking structure tell the whole story.' },
  { rank: 25, name: 'Carnegie Mellon University', short: 'CMU', city: 'Pittsburgh', state: 'PA', lat: 40.4433, lng: -79.9436, primary: 'tech-bros', secondary: 'stem-kids', blurb: 'CS kids who left the sun behind on purpose.' },
  { rank: 26, name: 'University of Virginia', short: 'UVA', city: 'Charlottesville', state: 'VA', lat: 38.0336, lng: -78.508, primary: 'finance-bros', secondary: 'douches', blurb: 'Lawn culture and McIntire pipelines. Seersucker appears in March.' },
  { rank: 27, name: 'University of Michigan', short: 'Michigan', city: 'Ann Arbor', state: 'MI', lat: 42.278, lng: -83.7382, primary: 'athletes', secondary: 'finance-bros', blurb: 'Big House gravity. Ross kids and engineers in an eternal cold war.' },
  { rank: 28, name: 'New York University', short: 'NYU', city: 'New York', state: 'NY', lat: 40.7295, lng: -73.9965, primary: 'media-kids', secondary: 'finance-bros', blurb: 'No campus, all vibes. Stern and Tisch kids avoid eye contact on the same block.' },
  { rank: 29, name: 'University of North Carolina at Chapel Hill', short: 'UNC', city: 'Chapel Hill', state: 'NC', lat: 35.9049, lng: -79.0469, primary: 'party-animals', secondary: 'athletes', blurb: 'Tar Heel weekends. Academics between kickoffs.' },
  { rank: 30, name: 'Wake Forest University', short: 'Wake Forest', city: 'Winston-Salem', state: 'NC', lat: 36.135, lng: -80.277, primary: 'douches', secondary: 'finance-bros', blurb: 'Small-school polish. Everyone looks interview-ready at brunch.' },
  { rank: 31, name: 'Tufts University', short: 'Tufts', city: 'Medford', state: 'MA', lat: 42.4075, lng: -71.119, primary: 'hipsters', secondary: 'try-hards', blurb: 'Jumbo earnestness. International relations as a personality type.' },
  { rank: 32, name: 'University of California, San Diego', short: 'UCSD', city: 'La Jolla', state: 'CA', lat: 32.8801, lng: -117.234, primary: 'stem-kids', secondary: 'tech-bros', blurb: 'Six colleges, zero parties (allegedly). The library is the social scene.' },
  { rank: 33, name: 'University of Florida', short: 'UF', city: 'Gainesville', state: 'FL', lat: 29.6436, lng: -82.3549, primary: 'party-animals', secondary: 'athletes', blurb: 'Gator weekends. Someone still talking about the swamp.' },
  { rank: 34, name: 'Boston College', short: 'BC', city: 'Chestnut Hill', state: 'MA', lat: 42.3355, lng: -71.1685, primary: 'finance-bros', secondary: 'douches', blurb: 'Eagle banking pipeline. The Heights has opinions about your internship.' },
  { rank: 35, name: 'University of Rochester', short: 'Rochester', city: 'Rochester', state: 'NY', lat: 43.1288, lng: -77.6298, primary: 'try-hards', secondary: 'stem-kids', blurb: 'Winter as character development. Meliora means more midterms.' },
  { rank: 36, name: 'Georgia Institute of Technology', short: 'Georgia Tech', city: 'Atlanta', state: 'GA', lat: 33.7756, lng: -84.3963, primary: 'stem-kids', secondary: 'tech-bros', blurb: 'Ramblin\' Wreck of problem sets. Sleep is optional, Wi-Fi is not.' },
  { rank: 37, name: 'University of California, Irvine', short: 'UCI', city: 'Irvine', state: 'CA', lat: 33.6405, lng: -117.8443, primary: 'try-hards', secondary: 'stem-kids', blurb: 'Planned-community ambition. Everyone has a color-coded planner.' },
  { rank: 38, name: 'University of California, Davis', short: 'UC Davis', city: 'Davis', state: 'CA', lat: 38.5382, lng: -121.7617, primary: 'hipsters', secondary: 'stem-kids', blurb: 'Bikes and Aggie chill. Someone composted their personality.' },
  { rank: 39, name: 'University of California, Santa Barbara', short: 'UCSB', city: 'Santa Barbara', state: 'CA', lat: 34.414, lng: -119.8489, primary: 'party-animals', secondary: 'hipsters', blurb: 'Isla Vista folklore. The ocean is the RA.' },
  { rank: 40, name: 'University of Illinois Urbana-Champaign', short: 'UIUC', city: 'Champaign', state: 'IL', lat: 40.102, lng: -88.2272, primary: 'party-animals', secondary: 'stem-kids', blurb: 'Unofficial St. Paddy\'s meets CS rankings. Study hard, party harder.' },
  { rank: 41, name: 'University of Wisconsin–Madison', short: 'Wisconsin', city: 'Madison', state: 'WI', lat: 43.0766, lng: -89.4125, primary: 'party-animals', secondary: 'athletes', blurb: 'State Street after dark. The Union Terrace has seen things.' },
  { rank: 42, name: 'Boston University', short: 'BU', city: 'Boston', state: 'MA', lat: 42.3505, lng: -71.1054, primary: 'try-hards', secondary: 'media-kids', blurb: 'Comm Ave hustle. Everyone is late to something important.' },
  { rank: 43, name: 'Brandeis University', short: 'Brandeis', city: 'Waltham', state: 'MA', lat: 42.3657, lng: -71.2586, primary: 'try-hards', secondary: 'hipsters', blurb: 'Activist intellect energy. Debates start in the dining hall.' },
  { rank: 44, name: 'Case Western Reserve University', short: 'Case Western', city: 'Cleveland', state: 'OH', lat: 41.5043, lng: -81.6084, primary: 'stem-kids', secondary: 'try-hards', blurb: 'Engineers who treat Cleveland winters like a lab condition.' },
  { rank: 45, name: 'Northeastern University', short: 'Northeastern', city: 'Boston', state: 'MA', lat: 42.3398, lng: -71.0892, primary: 'try-hards', secondary: 'tech-bros', blurb: 'Co-op as flex. Someone\'s LinkedIn is longer than their resume.' },
  { rank: 46, name: 'Tulane University', short: 'Tulane', city: 'New Orleans', state: 'LA', lat: 29.94, lng: -90.12, primary: 'party-animals', secondary: 'douches', blurb: 'Mardi Gras is a semester. Work hard, play harder is the syllabus.' },
  { rank: 47, name: 'University of Miami', short: 'Miami', city: 'Coral Gables', state: 'FL', lat: 25.7217, lng: -80.2793, primary: 'douches', secondary: 'party-animals', blurb: 'Boat shoes, boat burns, boat money. Winter is a rumor.' },
  { rank: 48, name: 'University of Texas at Austin', short: 'UT Austin', city: 'Austin', state: 'TX', lat: 30.2849, lng: -97.7341, primary: 'party-animals', secondary: 'startup-founders', blurb: 'Sixth Street meets McCombs. Hook \'em and hustle.' },
  { rank: 49, name: 'Ohio State University', short: 'Ohio State', city: 'Columbus', state: 'OH', lat: 40.0067, lng: -83.0305, primary: 'athletes', secondary: 'party-animals', blurb: 'Buckeye religion. The Shoe decides the weekend.' },
  { rank: 50, name: 'Pennsylvania State University', short: 'Penn State', city: 'University Park', state: 'PA', lat: 40.7982, lng: -77.8599, primary: 'party-animals', secondary: 'frat-bros', blurb: 'Beaver Stadium weekends. THON kids and frat kids sharing a zip code.' }
];

const SCENE_LABEL: Record<string, string> = {
  'finance-bros': 'Finance Bros',
  'wall-street': 'Wall Street',
  consulting: 'Consulting',
  'startup-founders': 'Startup Founders',
  'tech-bros': 'Tech Bros',
  'nepo-babies': 'Nepo Babies',
  'media-kids': 'Media Kids',
  'art-scene': 'Art Scene',
  'party-animals': 'Party Animals',
  'frat-bros': 'Frat Bros',
  douches: 'Douches',
  'stem-kids': 'STEM Kids',
  athletes: 'Athletes',
  'try-hards': 'Try-Hards',
  hipsters: 'Hipsters',
  'pre-med': 'Pre-Med',
};

function placePhotos(lat: number, lng: number): string[] {
  const d = 0.0035;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const satellite =
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=640,360&format=jpg&f=image`;
  const street =
    `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=640x360&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
  return [satellite, street];
}

/** One pin per campus (top 50) — keeps the map readable. */
export function universitySeedPlaces(): ScenePlace[] {
  const places: ScenePlace[] = [];
  let n = 0;
  for (const c of UNIVERSITY_CAMPUSES) {
    n += 1;
    const primaryLabel = SCENE_LABEL[c.primary] || c.primary;
    places.push({
      id: `uni-${c.short.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-primary`,
      lat: c.lat,
      lng: c.lng,
      title: `${c.short} · ${primaryLabel}`,
      city: c.city,
      address: `${c.name}, ${c.state}`,
      scene: c.primary,
      review: c.blurb,
      votes: Math.max(2, 16 - Math.floor(c.rank / 12)),
      createdAt: 1000 + n,
      photos: placePhotos(c.lat, c.lng),
      shares: Math.max(0, 8 - Math.floor(c.rank / 10)),
      comments: [],
    });
  }
  return places;
}
