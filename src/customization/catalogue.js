import sticker0 from './assets/no-wahala.svg';
import sticker1 from './assets/stay-clear.svg';
import sticker2 from './assets/one-love.svg';
import sticker3 from './assets/god-is-good.svg';
import sticker4 from './assets/nigeria.svg';
import sticker5 from './assets/eko-for-show.svg';
import sticker6 from './assets/na-god.svg';
import sticker7 from './assets/grace.svg';
import sticker8 from './assets/omo-ologo.svg';
import sticker9 from './assets/no-food.svg';

export const STICKERS = Object.freeze([
  Object.freeze({"id":"no-wahala","name":"NO WAHALA","price":500, url: sticker0 }),
  Object.freeze({"id":"stay-clear","name":"STAY CLEAR","price":750, url: sticker1 }),
  Object.freeze({"id":"one-love","name":"ONE LOVE","price":1000, url: sticker2 }),
  Object.freeze({"id":"god-is-good","name":"GOD IS GOOD","price":1250, url: sticker3 }),
  Object.freeze({"id":"nigeria","name":"NIGERIA MY COUNTRY","price":1500, url: sticker4 }),
  Object.freeze({"id":"eko-for-show","name":"EKO FOR SHOW","price":1750, url: sticker5 }),
  Object.freeze({"id":"na-god","name":"NA GOD DEY RUN AM","price":2000, url: sticker6 }),
  Object.freeze({"id":"grace","name":"GRACE","price":2250, url: sticker7 }),
  Object.freeze({"id":"omo-ologo","name":"OMO OLOGO","price":2500, url: sticker8 }),
  Object.freeze({"id":"no-food","name":"NO FOOD FOR LAZY MAN","price":3000, url: sticker9 }),
]);

export const PAINTS = Object.freeze([
  {
    "id": "green",
    "name": "Green",
    "price": 2000,
    "colour": "#239c55"
  },
  {
    "id": "red",
    "name": "Red",
    "price": 2500,
    "colour": "#de3436"
  },
  {
    "id": "brown",
    "name": "Brown",
    "price": 3000,
    "colour": "#895431"
  },
  {
    "id": "blue",
    "name": "Blue",
    "price": 3500,
    "colour": "#287de0"
  },
  {
    "id": "white",
    "name": "White",
    "price": 4000,
    "colour": "#f2f0e8"
  },
  {
    "id": "orange",
    "name": "Orange",
    "price": 4500,
    "colour": "#f88122"
  },
  {
    "id": "purple",
    "name": "Purple",
    "price": 5000,
    "colour": "#9851c8"
  },
  {
    "id": "black",
    "name": "Black",
    "price": 5500,
    "colour": "#252832"
  },
  {
    "id": "silver",
    "name": "Silver",
    "price": 6000,
    "colour": "#adb7c2"
  },
  {
    "id": "gold",
    "name": "Gold",
    "price": 7500,
    "colour": "#dfae35"
  }
].map(Object.freeze));


export const PHONES = Object.freeze([
  { id: 'jamsung', name: 'Jamsung', price: 150000, description: 'Flat-sided graphite body with square corners and a punch-hole camera.', frame: '#303c50', paper: '#eaf3ff', wallpaper: 'radial-gradient(ellipse at 10% 20%, #a4e7ed, transparent 65%), linear-gradient(145deg, #e3efff, #bacdff)', accent: '#2368bd', icon: '#dbeaff', radius: '10px', screenRadius: '6px', width: '282px', previewWidth: '94px', iconRadius: '50%', cameraWidth: '11px', cameraHeight: '11px', cameraRadius: '50%' },
  { id: 'hiphone11', name: 'HiPhone11', price: 350000, description: 'Rounded coral body with a wide camera notch.', frame: '#de776b', paper: '#fff1ea', wallpaper: 'radial-gradient(circle at 80% 15%, #ffe7a6, transparent 55%), linear-gradient(155deg, #fff3dc, #f3b1b8)', accent: '#ad4547', icon: '#ffe0d9', radius: '46px', screenRadius: '38px', width: '292px', previewWidth: '98px', iconRadius: '15px', cameraWidth: '90px', cameraHeight: '18px', cameraRadius: '0 0 14px 14px' },
  { id: 'hiphone13deluxe', name: 'HiPhone13deluxe', price: 700000, description: 'Broad violet body with gently squared corners and a short camera notch.', frame: '#75618e', paper: '#f3edff', wallpaper: 'radial-gradient(ellipse at 80% 25%, #f8bde6, transparent 60%), linear-gradient(135deg, #d4d7ff, #f8e9fc)', accent: '#754ca5', icon: '#e9d8fa', radius: '24px', screenRadius: '17px', width: '304px', previewWidth: '104px', iconRadius: '20px 8px 20px 8px', cameraWidth: '62px', cameraHeight: '17px', cameraRadius: '12px' },
  { id: 'huwhyi', name: 'HuWhyi', price: 1100000, description: 'Curved jade body with oval corners and an off-centre punch-hole camera.', frame: '#387c70', paper: '#e8f7f1', wallpaper: 'repeating-linear-gradient(125deg, transparent 0 55px, #ffffff35 55px 78px), linear-gradient(155deg, #d0f2df, #98c9c1)', accent: '#176c58', icon: '#d3efe1', radius: '44px / 70px', screenRadius: '36px / 60px', width: '288px', previewWidth: '96px', iconRadius: '10px', cameraWidth: '13px', cameraHeight: '13px', cameraRadius: '50%' },
  { id: 'hiphone19pro', name: 'Hiphone19pro', price: 1800000, description: 'Wide titanium body with crisp corners and a floating pill camera.', frame: '#a89b82', paper: '#f8f5ed', wallpaper: 'repeating-radial-gradient(ellipse at 100% 0%, #eee5d6 0 28px, #faf6ec 30px 62px)', accent: '#786347', icon: '#eee3cf', radius: '18px', screenRadius: '12px', width: '318px', previewWidth: '110px', iconRadius: '16px', cameraWidth: '48px', cameraHeight: '13px', cameraRadius: '999px' },
].map(Object.freeze));

export function phoneThemeStyle(phone) {
  if (!phone) return {};
  return {
    '--phone-frame': phone.frame, '--phone-paper': phone.paper,
    '--phone-wallpaper': phone.wallpaper, '--phone-accent': phone.accent,
    '--phone-icon': phone.icon, '--phone-radius': phone.radius,
    '--phone-preview-radius': ({ jamsung:'4px', hiphone11:'16px', hiphone13deluxe:'8px', huwhyi:'15px / 24px', hiphone19pro:'6px' })[phone.id],
    '--phone-preview-screen-radius': ({ jamsung:'2px', hiphone11:'12px', hiphone13deluxe:'5px', huwhyi:'12px / 20px', hiphone19pro:'4px' })[phone.id],
    '--phone-screen-radius': phone.screenRadius, '--phone-width': phone.width, '--phone-preview-width': phone.previewWidth,
    '--phone-icon-radius': phone.iconRadius, '--phone-camera-width': phone.cameraWidth,
    '--phone-camera-height': phone.cameraHeight, '--phone-camera-radius': phone.cameraRadius,
  };
}
