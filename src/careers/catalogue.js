// Shared with Backender. Salaries are game currency, based on five six-hour shifts.
export const CLASS_MINUTES = 360;
export const SHIFT_MINUTES = 360;
export const CATEGORIES = ['Education','Medicine','Engineering','Public services','Business','Hospitality','Transport'];
const course = (id,name,category,classes,weeklyPay,capacity=2,service=null)=>({id,name,category,classes,weeklyPay,capacity,service});
export const COURSES = [
 course('teacher','Teacher','Education',10,80000),course('instructor','Driving instructor','Education',5,45000),
 course('doctor','Doctor','Medicine',10,150000),course('nurse','Nurse','Medicine',5,65000,3),course('lab','Lab technician','Medicine',10,90000),
 course('mechanic','Mechanic','Engineering',5,60000),course('engineer','Workshop manager','Engineering',10,100000,1),
 course('police','Police officer','Public services',10,75000,4,'police'),course('lastma','Traffic officer','Public services',5,50000,4,'lastma'),course('lawma','Waste collector','Public services',5,0,4,'lawma'),
 course('cashier','Cashier / attendant','Business',5,35000),course('manager','Branch manager','Business',10,100000,1),course('accountant','Accountant','Business',10,110000),course('agent','Estate agent','Business',5,55000),course('sales','Car salesperson','Business',5,50000),course('clerk','Office assistant','Business',5,40000),course('trader','Market trader','Business',5,45000),
 course('cook','Cook','Hospitality',5,45000),course('chef','Head chef','Hospitality',10,95000,1),course('reception','Receptionist','Hospitality',5,40000),course('hotel-manager','Hotel manager','Hospitality',10,100000,1),course('dj','DJ / sound technician','Hospitality',5,55000),course('events','Event coordinator','Hospitality',10,85000),
 course('dispatcher','Transport dispatcher','Transport',5,45000),course('terminal-manager','Terminal manager','Transport',10,90000,1),
];
const site=(id,name,x,y,roles,slot=1,w=1,h=1)=>({id,name,bay:{x:x*120,y:y*120,width:w*120,height:h*120},roles,slot});
export const WORKPLACES = [
 site('hospital','Abule Egba Hospital',26,4,['doctor','nurse','lab','reception'],0),
 site('clinic','Igando Clinic',2,30,['doctor','nurse','reception'],2),
 site('police-station','Police Station',49,26,['police'],0,4,1),
 site('lastma-office','LASTMA Office',51,-3,['lastma'],1,2,1),
 site('lawma-office','LAWMA Depot',58,-8,['lawma'],1,2,4),
 site('school','Sango Otta School',41,-8,['teacher'],1,5,1),
 site('bank','MegaPay Bank',49,14,['cashier','manager','accountant']),
 site('office','Mangoro Offices',49,5,['clerk','accountant','manager']),
 site('estate','Seventomi Estate Agency',42,15,['agent','manager']),
 site('dealer','Sogunle Car Dealership',36,15,['sales','manager']),
 site('mechanic','Ahmadiyya Workshop',14,6,['mechanic','engineer']),
 site('fuel-residential','Ifako-Ijaiye Petrol Station',19,3,['cashier','manager']),
 site('fuel-work','Ikeja Petrol Station',32,14,['cashier','manager'],2),
 site('fuel-wealthy','Alimosho Petrol Station',29,22,['cashier','manager']),
 site('fuel-night','Mushin Petrol Station',54,22,['cashier','manager'],3),
 site('driving-school','Bolade Driving School',8,13,['instructor']),
 site('garage','Ahmadiyya Garage',13,4,['dispatcher','terminal-manager'],0),
 site('terminal','Bus Terminal',33,5,['dispatcher','terminal-manager'],2),
 site('market','Agege Market',47,5,['trader','cashier']),
 site('supermarket-work','Ikeja Supermarket',52,3,['cashier','manager']),
 site('supermarket-wealthy','Alimosho Supermarket',17,25,['cashier','manager'],2),
 site('food-shop','Alakuko Food Shop',8,4,['cook','cashier']),
 site('restaurant-work','Mangoro Restaurants',53,14,['cook','chef'],2),
 site('restaurant-night','Palmgrove Restaurants',53,22,['cook','chef'],3),
 site('restaurant-wealthy','Upscale Restaurant',20,28,['cook','chef'],2),
 site('hotel-ejigbo','Ejigbo Hotel',26,30,['reception','hotel-manager','chef'],2),
 site('hotel-city','City Hotel',44,28,['reception','hotel-manager','chef'],0),
 site('club','Night Club',36,30,['dj','manager'],3),
 site('music','Live Music',42,21,['dj'],3),
 site('events','Yaba Event Centre',45,28,['events','cook'],2),
];
export const SCHOOL_BAYS = [ {x:41*120,y:-8*120,width:5*120,height:120}, {x:41*120,y:-5*120,width:5*120,height:120} ];
export const SERVICE_VEHICLE_IDS = {police:'service-police',lastma:'service-lastma',lawma:'service-lawma'};
export const WASTE_PAY = 1500;
export { WASTE_LOCATIONS } from './wasteLocations.js';
export const WASTE_COLLECTION_SECONDS=1.25;
export const WASTE_COLLECTION_RADIUS=210;
export const getCourse=id=>COURSES.find(c=>c.id===id);
export const getWorkplace=id=>WORKPLACES.find(w=>w.id===id);
export function inBay(p,b){return !!p && Math.abs(p.speed||0)<2 && p.x>=b.x && p.x<=b.x+b.width && p.y>=b.y && p.y<=b.y+b.height;}
export const atSchool=p=>SCHOOL_BAYS.some(b=>inBay(p,b));
export const atWorkplace=(p,w)=>w?.id==='school'?atSchool(p):!!w&&inBay(p,w.bay);
export const nearWorkplace=p=>WORKPLACES.find(w=>atWorkplace(p,w));
