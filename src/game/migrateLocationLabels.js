// Legacy display labels only. Stable IDs, player names and coordinates are never changed.
const legacyNames = {
  "Starting Residential Area": "Ifako-Ijaiye LGA",
  "Starting Residential": "Ifako-Ijaiye LGA",
  "Work and Transport Hub": "Ikeja LGA",
  "Work Hub": "Ikeja LGA",
  "Wealthy Residential Area": "Alimosho LGA",
  "Wealthy Residential": "Alimosho LGA",
  "Nightlife Area": "Mushin LGA",
  "Nightlife": "Mushin LGA",
  "Northern Estate": "Sango Otta",
  "Abule Hustlers": "Sango Otta",
  "Home Junction": "Alakuko",
  "General Hospital": "Abule Egba Hospital",
  "Community Loop": "Meiran",
  "Estate Gate": "Abule Oki",
  "East Link": "Pleasure",
  "West Gate": "Ile Epo",
  "Terminal A": "Iyana Ipaja",
  "Terminal B": "Dopemu",
  "Central Market": "Agege",
  "Office Hub": "Mangoro",
  "East Gate": "Ikeja Along",
  "Olowo Epo": "Gowon Estate",
  "Waterway": "Akowonjo",
  "Estate North": "Egbeda",
  "Estate Circle": "Shasha",
  "Shopping Centre": "Idimu",
  "Private Clinic": "Igando Clinic",
  "South Estate": "Ikotun",
  "Luxury Hotel": "Ejigbo Hotel",
  "Old Airport": "Mushin",
  "Work Link": "Ladipo",
  "Club Strip": "Isolo",
  "Entertainment Circle": "Ilupeju",
  "Restaurant Row": "Palmgrove Restaurants",
  "Harbour": "Ojuelegba",
  "South Terminal": "Oyingbo"
};
const displayKeys = new Set(['label', 'district', 'districtName', 'routeName', 'title', 'description', 'direction', 'provider', 'sellerLabel']);
export function migrateLocationLabels(value) {
  if (!value || typeof value !== 'object') return value;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && displayKeys.has(key)) {
      let label = child;
      for (const [oldName, newName] of Object.entries(legacyNames)) {
        label = label.replaceAll(oldName, newName).replaceAll(oldName.toUpperCase(), newName.toUpperCase());
      }
      value[key] = label;
    } else if (child && typeof child === 'object') migrateLocationLabels(child);
  }
  return value;
}
