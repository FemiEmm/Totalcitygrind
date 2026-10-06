export const STOCK_ADVISER_PRICE = 1000;
export const STOCK_ADVISER_DAYS = 7;
export const STOCK_COMPANIES = Object.freeze([
  { id:'kilobeat', symbol:'KBE', name:'Kilobeat Enterprises', openingPrice:820, margin:.25, overhead:100, targetProfit:1000, sector:'Ikeja LGA and Lekki supermarkets; excludes the neighbourhood food shop' },
  { id:'technopack', symbol:'TCP', name:'Technopack PLC', openingPrice:1260, margin:.22, overhead:200, targetProfit:1800, sector:'Ifako-Ijaiye LGA and Ikeja LGA fuel stations; Abule Egba Hospital' },
  { id:'seventomi', symbol:'SVT', name:'Seventomi Real Estate', openingPrice:1940, margin:.15, overhead:200, targetProfit:3000, sector:'Home purchases, mortgage payments, rent and rental management' },
  { id:'cquence', symbol:'CQS', name:'Cquence Studios', openingPrice:690, margin:.30, overhead:100, targetProfit:1200, sector:'Mangoro Restaurants, Upscale Restaurant and Palmgrove Restaurants' },
  { id:'megapay', symbol:'MGP', name:'MegaPay', openingPrice:1520, margin:1, overhead:150, targetProfit:2000, sector:'Collected loan interest and savings-funded income, less savings interest costs' },
  { id:'gidi', symbol:'GDI', name:'Gidi Investments', openingPrice:1100, margin:.22, overhead:200, targetProfit:1800, sector:'Alimosho LGA, Mushin LGA and Coast City fuel; Igando Clinic and mobile fuel/doctor services' },
].map(Object.freeze));
