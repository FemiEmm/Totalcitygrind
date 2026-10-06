// Fictional city personalities, not real people's financial information.
const members = [
  ['Haleeko Mangote', 200000], ['Bolanle Adenira', 145000], ['Chukwudi Obiora', 110000],
  ['Folasade Balogun', 85000], ['Kabiru Danladi', 64000], ['Nneka Okafor', 48000],
  ['Tunde Akinwale', 35000], ['Zainab Bello', 27000], ['Emeka Nwosu', 21000],
  ['Yetunde Alade', 16500], ['Sani Garuba', 13000], ['Adaeze Ezeani', 10000],
  ['Kunle Aderemi', 8000], ['Hauwa Usman', 6500], ['Obinna Ndukwe', 5200],
  ['Funmi Olawale', 4200], ['Musa Yakubu', 3400], ['Ifeoma Umeh', 2800],
  ['Segun Adebayo', 2300], ['Amina Lawal', 1900], ['Chidi Ekwueme', 1550],
  ['Abimbola Fashola', 1250], ['Ibrahim Sule', 1000], ['Ngozi Nwankwo', 850],
  ['Dayo Ogunleye', 720], ['Hadiza Sadiq', 610], ['Kelechi Onuoha', 520],
  ['Tosin Adeyinka', 445], ['Bashir Audu', 380], ['Amaka Obi', 325],
  ['Wale Akinyemi', 280], ['Maryam Bakare', 240], ['Uche Ibekwe', 205],
  ['Ronke Ajayi', 175], ['Yusuf Dantala', 150], ['Chinelo Opara', 128],
  ['Lanre Ojo', 108], ['Safiya Umar', 92], ['Ikenna Udo', 78],
  ['Seyi Abiola', 66], ['Fatima Gambo', 56], ['Chiamaka Nwafor', 48],
  ['Bisi Adelaja', 41], ['Ismail Salihu', 35], ['Somto Ezenwa', 30],
  ['Kemi Olatunji', 27], ['Nasir Bello', 25], ['Nkiru Uzoma', 23],
  ['Femi Akinola', 21], ['Damilola Owolabi', 20],
];
export const CLUB_ENTRY_WEALTH = 20000000;
export const CLUB_MEMBERS = Object.freeze(members.map(([name, millions], index) => Object.freeze({
  id: `bpc-founder-${String(index + 1).padStart(2, '0')}`, name, wealth: millions * 1000000, fictional: true,
})));
